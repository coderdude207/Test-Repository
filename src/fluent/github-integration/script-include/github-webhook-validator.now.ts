import { ScriptInclude } from '@servicenow/sdk/core'

ScriptInclude({
    $id: Now.ID['c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6'],
    name: 'GitHubWebhookValidator',
    script: Now.include('./GitHubWebhookValidator.server.js'),
    description: 'Validates GitHub webhook signatures and normalises push event payloads',
    apiName: 'x_643482_my_cust_0.GitHubWebhookValidator',
    clientCallable: false,
    mobileCallable: false,
    sandboxCallable: false,
    accessibleFrom: 'package_private',
    active: true,
})
