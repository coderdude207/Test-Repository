import { ScriptInclude } from '@servicenow/sdk/core'

ScriptInclude({
    $id: Now.ID['57892349e3164ac7ad2e3c5f141966c1'],
    name: 'LLMProxyHelper',
    script: Now.include('./sys_script_include_57892349e3164ac7ad2e3c5f141966c1.server.js'),
    description: 'Issues and validates 60-second HMAC-signed tokens for the LLM proxy REST API',
    apiName: 'x_643482_my_cust_0.LLMProxyHelper',
    clientCallable: false,
    mobileCallable: false,
    sandboxCallable: false,
    accessibleFrom: 'package_private',
    active: true,
})
