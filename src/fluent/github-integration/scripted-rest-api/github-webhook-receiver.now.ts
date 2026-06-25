import { RestApi } from '@servicenow/sdk/core'

RestApi({
    $id: Now.ID['a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4'],
    name: 'GitHub Webhook Receiver',
    serviceId: 'github_webhook',
    routes: [
        {
            $id: Now.ID['b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5'],
            name: 'Push Event',
            consumes: 'application/json,application/xml,text/xml',
            method: 'POST',
            script: Now.include('./github-webhook-push.js'),
            produces: 'application/json,application/xml,text/xml',
            path: '/push',
            enforceAcl: [],
            authentication: false,
        },
    ],
})
