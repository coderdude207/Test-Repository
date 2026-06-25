import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['845b9d3783010b107e20a270ceaad31e'],
    description: 'Default access control on x_643482_my_cust_0_conversations',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'write',
    roles: ['x_643482_my_cust_0.conversations_admin'],
    table: 'x_643482_my_cust_0_conversations',
})
