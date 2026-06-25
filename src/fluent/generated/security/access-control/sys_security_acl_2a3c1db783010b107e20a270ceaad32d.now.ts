import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['2a3c1db783010b107e20a270ceaad32d'],
    description: 'Default access control on x_643482_my_cust_0_conversations_messages',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'write',
    roles: ['x_643482_my_cust_0.conversations_admin'],
    table: 'x_643482_my_cust_0_conversations_messages',
})
