import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['b9df9d7f83010b107e20a270ceaad395'],
    description: 'Default access control on x_643482_my_cust_0_prompt_library',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'delete',
    roles: ['x_643482_my_cust_0.conversations_admin'],
    table: 'x_643482_my_cust_0_prompt_library',
})
