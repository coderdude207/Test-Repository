var GitHubWebhookValidator = Class.create();
GitHubWebhookValidator.prototype = {
    initialize: function() {},

    /**
     * Validates a GitHub HMAC-SHA256 webhook signature.
     * GitHub sends the header as 'sha256=<hex>' — this method strips the prefix
     * before comparing against the computed HMAC.
     *
     * @param {string} requestBody      - Raw request body string (request.body.dataString)
     * @param {string} signatureHeader  - Value of X-Hub-Signature-256 header
     * @param {string} secret           - HMAC secret (from github.webhook.secret sys_property)
     * @returns {boolean} true if the signature is valid
     */
    validateSignature: function(requestBody, signatureHeader, secret) {
        if (!signatureHeader) {
            gs.warn('GitHubWebhookValidator: missing X-Hub-Signature-256 header');
            return false;
        }
        var provided = signatureHeader.indexOf('sha256=') === 0
            ? signatureHeader.substring(7)
            : signatureHeader;
        if (!provided) {
            gs.warn('GitHubWebhookValidator: empty HMAC after prefix strip');
            return false;
        }
        var digest = new GlideDigest();
        var computed = digest.hmacSha256(secret, requestBody);
        return computed === provided;
    },

    /**
     * Extracts and normalises fields from a GitHub push event body.
     *
     * @param {Object} bodyData - Parsed push event JSON (request.body.data)
     * @returns {{before: string, after: string, branch: string, repoFullName: string, pusher: string, messages: string[]}}
     */
    extractPushMeta: function(bodyData) {
        var ref = bodyData.ref || '';
        var branch = ref.indexOf('refs/heads/') === 0 ? ref.substring(11) : ref;
        var messages = [];
        var commits = bodyData.commits || [];
        for (var i = 0; i < commits.length; i++) {
            if (commits[i].message) {
                messages.push(commits[i].message);
            }
        }
        return {
            before:       bodyData.before || '',
            after:        bodyData.after  || '',
            branch:       branch,
            repoFullName: (bodyData.repository || {}).full_name || '',
            pusher:       (bodyData.pusher || {}).name || '',
            messages:     messages
        };
    },

    /**
     * Returns true if the before SHA is all zeros, indicating a new branch push.
     * New branch pushes have no meaningful diff to process.
     *
     * @param {string} beforeSha - The 'before' SHA from the push payload
     * @returns {boolean}
     */
    isNewBranch: function(beforeSha) {
        return beforeSha === '0000000000000000000000000000000000000000';
    },

    type: 'GitHubWebhookValidator'
};
