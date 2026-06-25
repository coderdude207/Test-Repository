(function process( /*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {
    function sendJson(status, body) {
        response.setStatus(status);
        response.setContentType('application/json');
        response.getStreamOutput().print(JSON.stringify(body));
    }

    try {

        // ── STEP 1: Verify GitHub webhook signature ──────────────────────────
        var secret = gs.getProperty('github.webhook.secret', '');
        var rawBody = request.body.dataString;
        var sigHeader = request.getHeader('x-hub-signature-256') || '';

        var validator = new x_643482_my_cust_0.GitHubWebhookValidator();
        if (!validator.validateSignature(rawBody, sigHeader, secret)) {
            gs.error('GitHubWebhook /push: signature verification failed. header=' + sigHeader);
            sendJson(401, {
                error: 'Invalid signature'
            });
            return;
        }

        // ── STEP 2: Parse push event payload ─────────────────────────────────
        var data = request.body.data;
        var meta = validator.extractPushMeta(data);

        gs.info('GitHubWebhook /push: received push on branch=' + meta.branch +
            ' pusher=' + meta.pusher + ' repo=' + meta.repoFullName);

        if (validator.isNewBranch(meta.before)) {
            gs.info('GitHubWebhook /push: skipping new branch push (before SHA is all zeros)');
            sendJson(200, {
                status: 'skipped',
                reason: 'new branch'
            });
            return;
        }

        // ── STEP 3: Get changed files in watched folder ───────────────────────
        var owner = gs.getProperty('github.owner', '');
        var repo = gs.getProperty('github.repo', '');
        var token = gs.getProperty('github.integration.token', '');
        var watchFolder = gs.getProperty('github.watch.folder', '');

        var explorer = new x_643482_my_cust_0.GitHubFileExplorer(owner, repo, token);
        var changedFiles = explorer.getChangedFilesInFolder(meta.before, meta.after, watchFolder);

        if (!changedFiles || changedFiles.length === 0) {
            gs.info('GitHubWebhook /push: no files changed in watched folder=' + watchFolder);
            sendJson(200, {
                status: 'no_op',
                files_changed: 0
            });
            return;
        }

        gs.info('GitHubWebhook /push: ' + changedFiles.length +
            ' file(s) to process from folder=' + watchFolder);

        // ── STEP 4: Import each changed file ──────────────────────────────────
        var results = [];
        var filesProcessed = 0;
        var filesSkipped = 0;
        var filesFailed = 0;

        for (var i = 0; i < changedFiles.length; i++) {
            var fileEntry = changedFiles[i];
            var filename = fileEntry.filename;
            var fileStatus = fileEntry.status;

            // Skip deleted files — nothing to import
            if (fileStatus === 'removed') {
                gs.info('GitHubWebhook /push: skipping removed file=' + filename);
                filesSkipped++;
                results.push({
                    filename: filename,
                    status: fileStatus,
                    imported: false,
                    error: 'file removed'
                });
                continue;
            }

            try {
                // a. Fetch decoded file content from GitHub
                var fileResult = explorer.getFileContent(filename, meta.after);
                var content = fileResult.content;

                // b. Validate content looks like a ServiceNow update set XML
                if (content.indexOf('<unload') === -1 && content.indexOf('<?xml') === -1) {
                    gs.error('GitHubWebhook /push: file=' + filename +
                        ' does not appear to be a ServiceNow XML update set — skipping');
                    filesFailed++;
                    results.push({
                        filename: filename,
                        status: fileStatus,
                        imported: false,
                        error: 'not a valid ServiceNow XML update set'
                    });
                    continue;
                }

                // c. Import into ServiceNow
                var imported = false;
                var importError = null;

                if (typeof GlideUpdateManager2 !== 'undefined') {
                    // Preferred: GlideUpdateManager2 handles full XML parse + load
                    var mgr = new GlideUpdateManager2();
                    mgr.loadFromXML(content);
                    imported = true;
                    gs.info('GitHubWebhook /push: imported file=' + filename +
                        ' via GlideUpdateManager2');
                } else {
                    // Fallback: insert a sys_remote_update_set record and call retrieve()
                    var reus = new GlideRecord('sys_remote_update_set');
                    reus.initialize();
                    reus.setValue('name', filename);
                    reus.setValue('description',
                        'Imported from GitHub commit ' + meta.after + ' by ' + meta.pusher);
                    reus.setValue('state', 'loaded');
                    reus.setValue('payload', content);
                    var reusId = reus.insert();

                    if (reusId) {
                        var loader = new GlideRecord('sys_remote_update_set');
                        if (loader.get(reusId)) {
                            loader.retrieve();
                        }
                        imported = true;
                        gs.info('GitHubWebhook /push: imported file=' + filename +
                            ' via sys_remote_update_set id=' + reusId);
                    } else {
                        importError = 'GlideRecord insert returned no sys_id';
                        gs.error('GitHubWebhook /push: failed to insert sys_remote_update_set for file=' + filename);
                    }
                }

                if (imported) {
                    filesProcessed++;
                    results.push({
                        filename: filename,
                        status: fileStatus,
                        imported: true,
                        error: null
                    });
                } else {
                    filesFailed++;
                    results.push({
                        filename: filename,
                        status: fileStatus,
                        imported: false,
                        error: importError || 'import failed'
                    });
                }

            } catch (fileErr) {
                gs.error('GitHubWebhook /push: error processing file=' + filename +
                    ' — ' + fileErr.message);
                filesFailed++;
                results.push({
                    filename: filename,
                    status: fileStatus,
                    imported: false,
                    error: fileErr.message
                });
            }
        }

        // ── STEP 5: Build and return response ────────────────────────────────
        gs.info('GitHubWebhook /push: complete — processed=' + filesProcessed +
            ' skipped=' + filesSkipped + ' failed=' + filesFailed);

        sendJson(200, {
            status: 'success',
            branch: meta.branch,
            files_processed: filesProcessed,
            files_skipped: filesSkipped,
            files_failed: filesFailed,
            pusher: meta.pusher,
            commit_messages: meta.messages,
            results: results
        });

    } catch (e) {
        // ── STEP 6: Top-level error handling ─────────────────────────────────
        gs.error('GitHubWebhook /push: unhandled error — ' + e.message);
        sendJson(500, {
            status: 'error',
            message: e.message
        });
    }

})(request, response);