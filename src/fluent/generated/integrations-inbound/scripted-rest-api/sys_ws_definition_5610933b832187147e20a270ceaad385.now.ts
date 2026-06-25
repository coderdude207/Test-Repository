import { RestApi } from '@servicenow/sdk/core'

RestApi({
    $id: Now.ID['5610933b832187147e20a270ceaad385'],
    name: 'Github Integration',
    serviceId: 'github_integration',
    routes: [
        {
            $id: Now.ID['a2401b3b832187147e20a270ceaad39e'],
            name: 'callback',
            consumes: 'application/json,application/xml,text/xml',
            method: 'POST',
            script: Now.include('./sys_ws_operation_a2401b3b832187147e20a270ceaad39e.js'),
            produces: 'application/json,application/xml,text/xml',
            path: '/callback_url',
            enforceAcl: [],
            authentication: false,
        },
    ],
})
