import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['a9df9d7f83010b107e20a270ceaad372'],
    description: 'Default access control on x_643482_my_cust_0_prompt_library',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'create',
    roles: ['x_643482_my_cust_0.conversations_admin'],
    table: 'x_643482_my_cust_0_prompt_library',
})
