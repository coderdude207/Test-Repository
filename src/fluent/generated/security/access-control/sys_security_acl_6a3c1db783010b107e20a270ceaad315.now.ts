import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['6a3c1db783010b107e20a270ceaad315'],
    description: 'Default access control on x_643482_my_cust_0_conversations_messages',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'read',
    roles: ['x_643482_my_cust_0.conversations_admin'],
    table: 'x_643482_my_cust_0_conversations_messages',
})
