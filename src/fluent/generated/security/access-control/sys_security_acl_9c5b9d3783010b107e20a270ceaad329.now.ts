import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['9c5b9d3783010b107e20a270ceaad329'],
    description: 'Default access control on x_643482_my_cust_0_conversations',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'delete',
    roles: ['x_643482_my_cust_0.conversations_admin'],
    table: 'x_643482_my_cust_0_conversations',
})
