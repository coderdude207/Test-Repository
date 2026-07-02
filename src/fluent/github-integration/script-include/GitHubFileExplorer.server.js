var GitHubFileExplorer = Class.create();
GitHubFileExplorer.prototype = {
    /**
     * @param {string} owner - GitHub org or username (from github.owner sys_property)
     * @param {string} repo  - Repository name without owner prefix (from github.repo sys_property)
     * @param {string} token - GitHub PAT (from github.integration.token sys_property)
     */
    initialize: function(owner, repo, token) {
        this.owner   = owner;
        this.repo    = repo;
        this.token   = token;
        this.baseUrl = 'https://api.github.com';
    },

    /**
     * Returns all files changed between two commits that live under a specific folder.
     * Uses paginated compare requests to work around GitHub's 300-file display cap.
     * Caps at 10 pages (1000 files total) to prevent runaway loops.
     *
     * @param {string} base   - Base commit SHA (the 'before' value from the push event)
     * @param {string} head   - Head commit SHA (the 'after' value from the push event)
     * @param {string} folder - Folder prefix to filter, e.g. 'servicenow/update_sets'
     * @returns {Array<{filename: string, status: string, sha: string, raw_url: string}>}
     */
    getChangedFilesInFolder: function(base, head, folder) {
        var allFiles  = [];
        var MAX_PAGES = 10;
        var PER_PAGE  = 100;

        for (var page = 1; page <= MAX_PAGES; page++) {
            var url = this.baseUrl + '/repos/' + this.owner + '/' + this.repo +
                      '/compare/' + base + '...' + head +
                      '?page=' + page + '&per_page=' + PER_PAGE;

            var rm = new sn_ws.RESTMessageV2();
            rm.setEndpoint(url);
            rm.setHttpMethod('GET');
            rm.setRequestHeader('Authorization', 'token ' + this.token);
            rm.setRequestHeader('Accept', 'application/vnd.github.v3+json');
            rm.setRequestHeader('User-Agent', 'ServiceNow-GitHubWebhook/1.0');

            var resp       = rm.execute();
            var statusCode = resp.getStatusCode();

            if (statusCode !== 200) {
                gs.error('GitHubFileExplorer.getChangedFilesInFolder: HTTP ' + statusCode +
                         ' on page ' + page + ' — url=' + url);
                break;
            }

            var parsed;
            try {
                parsed = JSON.parse(resp.getBody());
            } catch (e) {
                gs.error('GitHubFileExplorer.getChangedFilesInFolder: JSON parse error on page ' +
                         page + ': ' + e.message);
                break;
            }

            var pageFiles = parsed.files || [];
            for (var i = 0; i < pageFiles.length; i++) {
                allFiles.push(pageFiles[i]);
            }

            if (pageFiles.length < PER_PAGE) {
                break;
            }
        }

        // Filter to only files directly under the watched folder
        var folderPrefix = folder.charAt(folder.length - 1) === '/' ? folder : folder + '/';
        var filtered = [];
        for (var j = 0; j < allFiles.length; j++) {
            var f = allFiles[j];
            if (f.filename && f.filename.indexOf(folderPrefix) === 0) {
                filtered.push({
                    filename: f.filename,
                    status:   f.status,
                    sha:      f.sha      || '',
                    raw_url:  f.raw_url  || ''
                });
            }
        }

        gs.info('GitHubFileExplorer.getChangedFilesInFolder: ' + filtered.length +
                ' file(s) matched folder=' + folder);
        return filtered;
    },

    /**
     * Fetches and base64-decodes the content of a single file from GitHub.
     * The GitHub Contents API returns file content as base64 with embedded newlines
     * which are stripped before decoding.
     *
     * @param {string} filePath - Full path within the repo (e.g. 'servicenow/update_sets/patch.xml')
     * @param {string} branch   - Branch name or commit SHA to fetch at
     * @returns {{content: string, sha: string, name: string, path: string}}
     */
    getFileContent: function(filePath, branch) {
        var url = this.baseUrl + '/repos/' + this.owner + '/' + this.repo +
                  '/contents/' + filePath + '?ref=' + branch;

        var rm = new sn_ws.RESTMessageV2();
        rm.setEndpoint(url);
        rm.setHttpMethod('GET');
        rm.setRequestHeader('Authorization', 'token ' + this.token);
        rm.setRequestHeader('Accept', 'application/vnd.github.v3+json');
        rm.setRequestHeader('User-Agent', 'ServiceNow-GitHubWebhook/1.0');

        var resp       = rm.execute();
        var statusCode = resp.getStatusCode();

        if (statusCode !== 200) {
            throw new Error('GitHubFileExplorer.getFileContent: HTTP ' + statusCode +
                            ' for file=' + filePath);
        }

        var parsed;
        try {
            parsed = JSON.parse(resp.getBody());
        } catch (e) {
            throw new Error('GitHubFileExplorer.getFileContent: JSON parse error for file=' +
                            filePath + ': ' + e.message);
        }

        // GitHub embeds newlines in the base64 payload — strip them before decoding
        // GlideStringUtil.base64Decode is global-scope only; use Java directly in scoped apps
        var rawBase64 = (parsed.content || '').replace(/\n/g, '').replace(/\r/g, '');
        var decoded   = String(new java.lang.String(java.util.Base64.getDecoder().decode(rawBase64)));

        return {
            content: decoded,
            sha:     parsed.sha  || '',
            name:    parsed.name || '',
            path:    parsed.path || filePath
        };
    },

    type: 'GitHubFileExplorer'
};
