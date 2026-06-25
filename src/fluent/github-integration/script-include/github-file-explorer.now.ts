import { ScriptInclude } from '@servicenow/sdk/core'

ScriptInclude({
    $id: Now.ID['d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1'],
    name: 'GitHubFileExplorer',
    script: Now.include('./GitHubFileExplorer.server.js'),
    description: 'Fetches changed files and file content from GitHub using the REST API. Supports paginated compare for repositories with many changed files.',
    apiName: 'x_643482_my_cust_0.GitHubFileExplorer',
    clientCallable: false,
    mobileCallable: false,
    sandboxCallable: false,
    accessibleFrom: 'package_private',
    active: true,
})
