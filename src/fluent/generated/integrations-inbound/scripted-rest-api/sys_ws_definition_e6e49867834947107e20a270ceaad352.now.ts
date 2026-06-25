import { RestApi } from '@servicenow/sdk/core'

RestApi({
    $id: Now.ID['e6e49867834947107e20a270ceaad352'],
    name: 'LLM Chat Assistant Helper',
    serviceId: 'llm_chat_assistant_helper',
    routes: [
        {
            $id: Now.ID['1c7594a7834947107e20a270ceaad326'],
            name: 'Chat Credentials',
            consumes: 'application/json,application/xml,text/xml',
            script: Now.include('./sys_ws_operation_1c7594a7834947107e20a270ceaad326.js'),
            produces: 'application/json,application/xml,text/xml',
            path: '/chat_credentials',
            enforceAcl: [],
        },
        {
            $id: Now.ID['b94594a7834947107e20a270ceaad342'],
            name: 'Issue Token',
            consumes: 'application/json,application/xml,text/xml',
            script: Now.include('./sys_ws_operation_b94594a7834947107e20a270ceaad342.js'),
            produces: 'application/json,application/xml,text/xml',
            path: '/issue_token',
            enforceAcl: [],
        },
    ],
})
