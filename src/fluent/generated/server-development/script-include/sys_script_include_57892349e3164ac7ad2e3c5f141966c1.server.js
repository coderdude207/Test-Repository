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
        return GlideStringUtil.base64Encode(payload) + '.' + signature;
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
            var payload = GlideStringUtil.base64Decode(encodedPayload);
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

    /**
     * Returns the current date and time as a display string in the user's session timezone.
     * @returns {string} e.g. "2026-07-02 14:35:00"
     */
    getCurrentTime: function() {
        var now = new GlideDateTime();
        return now.getDisplayValue();
    },

    type: 'LLMProxyHelper'
};
