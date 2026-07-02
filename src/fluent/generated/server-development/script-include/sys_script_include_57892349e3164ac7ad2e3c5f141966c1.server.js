var LLMProxyHelper = Class.create();
LLMProxyHelper.prototype = {
    initialize: function() {},

    issueToken: function() {
        var userId = gs.getUserID();
        var issuedAt = new GlideDateTime().getNumericValue();
        var expiry = issuedAt + 60000;
        var payload = userId + '|' + issuedAt + '|' + expiry;
        var secret = gs.getProperty('llm.token.secret', '');
        var signature = GlideDigest.getSHA256Base64(payload + secret);
        // GlideStringUtil.base64Encode is global-scope only; use Java directly in scoped apps
        return String(java.util.Base64.getEncoder().encodeToString(new java.lang.String(payload).getBytes('UTF-8'))) + '.' + signature;
    },

    validateToken: function(token) {
        try {
            if (!token) {
                gs.warn('LLMProxyHelper: empty token');
                return null;
            }
            var dotIdx = token.indexOf('.');
            if (dotIdx === -1) {
                gs.warn('LLMProxyHelper: invalid token format — missing separator');
                return null;
            }
            var encodedPayload = token.substring(0, dotIdx);
            var signature = token.substring(dotIdx + 1);
            // GlideStringUtil.base64Decode is global-scope only; use Java directly in scoped apps
            var payload = String(new java.lang.String(java.util.Base64.getDecoder().decode(encodedPayload)));
            var secret = gs.getProperty('llm.token.secret', '');
            var expectedSig = GlideDigest.getSHA256Base64(payload + secret);
            if (signature !== expectedSig) {
                gs.warn('LLMProxyHelper: token signature mismatch');
                return null;
            }
            var parts = payload.split('|');
            if (parts.length !== 3) {
                gs.warn('LLMProxyHelper: malformed payload — expected 3 pipe-separated segments');
                return null;
            }
            var userId = parts[0];
            var expiry = parseInt(parts[2], 10);
            var now = new GlideDateTime().getNumericValue();
            if (now > expiry) {
                gs.warn('LLMProxyHelper: token expired for user ' + userId);
                return null;
            }
            return userId;
        } catch (e) {
            gs.warn('LLMProxyHelper: validateToken error — ' + e.message);
            return null;
        }
    },

    type: 'LLMProxyHelper'
};
