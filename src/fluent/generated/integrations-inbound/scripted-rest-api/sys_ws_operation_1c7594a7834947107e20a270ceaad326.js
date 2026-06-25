(function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {

      var body;
    try {
        body = JSON.parse(request.body.dataString);
    } catch (e) {
        response.setStatus(400);
        response.setContentType('application/json');
        response.getStreamOutput().print(JSON.stringify({ error: 'Invalid JSON body' }));
        return;
    }

    var token = body && body.token;
    if (!token) {
        response.setStatus(401);
        response.setContentType('application/json');
        response.getStreamOutput().print(JSON.stringify({ error: 'Token required' }));
        return;
    }

    var helper = new x_643482_my_cust_0.LLMProxyHelper();
    var userId = helper.validateToken(token);
    if (!userId) {
        response.setStatus(401);
        response.setContentType('application/json');
        response.getStreamOutput().print(JSON.stringify({ error: 'Invalid or expired token' }));
        return;
    }

    // Ollama-specific properties take precedence; fall back to generic llm.chat.* / llm.api.key values.
    // llm.ollama.key and llm.api.key MUST be Password2-type sys_properties so values are encrypted at rest.
    var apiKey   = gs.getProperty('llm.ollama.key', '')      || gs.getProperty('llm.api.key', '');
    var endpoint = gs.getProperty('llm.ollama.endpoint', '') || gs.getProperty('llm.chat.endpoint', '');
    var model    = gs.getProperty('llm.ollama.model', '')    || gs.getProperty('llm.chat.model', '');

    response.setStatus(200);
    response.setContentType('application/json');
    response.getStreamOutput().print(JSON.stringify({
        apiKey: apiKey,
        endpoint: endpoint,
        model: model
    }));

})(request, response);