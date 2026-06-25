(function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {

    /**
     * Sends a JSON response with the given HTTP status code.
     */
    function sendJson(status, body) {
        response.setStatus(status);
        response.setContentType('application/json');
        response.getStreamOutput().print(JSON.stringify(body));
    }

    /** Returns true if the filename ends with .xml (case-insensitive). */
    function isXmlFile(filename) {
        return filename.length > 4 &&
               filename.substring(filename.length - 4).toLowerCase() === '.xml';
    }

    try {

        // ── STEP 1: Parse push event payload ─────────────────────────────────
        var data      = request.body.data;
        var validator = new x_643482_my_cust_0.GitHubWebhookValidator();
        var meta      = validator.extractPushMeta(data);

        gs.info('GitHubWebhook /push: received push on branch=' + meta.branch +
                ' pusher=' + meta.pusher + ' repo=' + meta.repoFullName);

        if (validator.isNewBranch(meta.before)) {
            gs.info('GitHubWebhook /push: skipping new branch push (before SHA is all zeros)');
            sendJson(200, {status: 'skipped', reason: 'new branch'});
            return;
        }

        // ── STEP 2: Collect .xml files from commits[].added/modified/removed ──
        // Aggregate across all commits in this push. If the same file appears
        // in multiple commits the last status seen wins (removed beats modified).
        var fileMap = {}; // filename -> 'added' | 'modified' | 'removed'
        var commits = data.commits || [];

        for (var c = 0; c < commits.length; c++) {
            var commit   = commits[c];
            var added    = commit.added    || [];
            var modified = commit.modified || [];
            var removed  = commit.removed  || [];

            for (var a = 0; a < added.length; a++) {
                if (isXmlFile(added[a])) {
                    fileMap[added[a]] = 'added';
                }
            }
            for (var m = 0; m < modified.length; m++) {
                if (isXmlFile(modified[m])) {
                    fileMap[modified[m]] = 'modified';
                }
            }
            for (var r = 0; r < removed.length; r++) {
                if (isXmlFile(removed[r])) {
                    fileMap[removed[r]] = 'removed';
                }
            }
        }

        // Flatten map to array
        var xmlFiles = [];
        for (var fname in fileMap) {
            if (fileMap.hasOwnProperty(fname)) {
                xmlFiles.push({filename: fname, status: fileMap[fname]});
            }
        }

        if (xmlFiles.length === 0) {
            gs.info('GitHubWebhook /push: no .xml files changed in this push');
            sendJson(200, {status: 'no_op', files_changed: 0});
            return;
        }

        gs.info('GitHubWebhook /push: ' + xmlFiles.length + ' .xml file(s) to process');

        // ── STEP 3: Fetch content and import each .xml file ───────────────────
        var owner   = gs.getProperty('github.owner', '');
        var repo    = gs.getProperty('github.repo', '');
        var token   = gs.getProperty('github.integration.token', '');
        var explorer = new x_643482_my_cust_0.GitHubFileExplorer(owner, repo, token);

        var results        = [];
        var filesProcessed = 0;
        var filesSkipped   = 0;
        var filesFailed    = 0;

        for (var i = 0; i < xmlFiles.length; i++) {
            var fileEntry = xmlFiles[i];
            var filename  = fileEntry.filename;
            var fstatus   = fileEntry.status;

            // Removed files have no content to import
            if (fstatus === 'removed') {
                gs.info('GitHubWebhook /push: skipping removed file=' + filename);
                filesSkipped++;
                results.push({filename: filename, status: fstatus, imported: false, error: 'file removed'});
                continue;
            }

            try {
                // Fetch decoded content at the head commit SHA
                var fileResult = explorer.getFileContent(filename, meta.after);
                var content    = fileResult.content;

                // Validate it looks like a ServiceNow update set XML
                if (content.indexOf('<unload') === -1 && content.indexOf('<?xml') === -1) {
                    gs.error('GitHubWebhook /push: file=' + filename +
                             ' does not appear to be a ServiceNow XML update set — skipping');
                    filesFailed++;
                    results.push({filename: filename, status: fstatus, imported: false,
                                  error: 'not a valid ServiceNow XML update set'});
                    continue;
                }

                // Import into ServiceNow
                var imported    = false;
                var importError = null;

                if (typeof GlideUpdateManager2 !== 'undefined') {
                    var mgr = new GlideUpdateManager2();
                    mgr.loadFromXML(content);
                    imported = true;
                    gs.info('GitHubWebhook /push: imported file=' + filename + ' via GlideUpdateManager2');
                } else {
                    var reus = new GlideRecord('sys_remote_update_set');
                    reus.initialize();
                    reus.setValue('name', filename);
                    reus.setValue('description',
                        'Imported from GitHub commit ' + meta.after + ' by ' + meta.pusher);
                    reus.setValue('state',   'loaded');
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
                    results.push({filename: filename, status: fstatus, imported: true, error: null});
                } else {
                    filesFailed++;
                    results.push({filename: filename, status: fstatus, imported: false,
                                  error: importError || 'import failed'});
                }

            } catch (fileErr) {
                gs.error('GitHubWebhook /push: error processing file=' + filename + ' — ' + fileErr.message);
                filesFailed++;
                results.push({filename: filename, status: fstatus, imported: false, error: fileErr.message});
            }
        }

        // ── STEP 4: Build and return response ────────────────────────────────
        gs.info('GitHubWebhook /push: complete — processed=' + filesProcessed +
                ' skipped=' + filesSkipped + ' failed=' + filesFailed);

        sendJson(200, {
            status:          'success',
            branch:          meta.branch,
            files_processed: filesProcessed,
            files_skipped:   filesSkipped,
            files_failed:    filesFailed,
            pusher:          meta.pusher,
            commit_messages: meta.messages,
            results:         results
        });

    } catch (e) {
        // ── STEP 5: Top-level error handling ─────────────────────────────────
        gs.error('GitHubWebhook /push: unhandled error — ' + e.message);
        sendJson(500, {status: 'error', message: e.message});
    }

})(request, response);
