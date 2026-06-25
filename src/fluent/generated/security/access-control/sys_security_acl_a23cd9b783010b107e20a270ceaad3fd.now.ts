import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['a23cd9b783010b107e20a270ceaad3fd'],
    description: 'Default access control on x_643482_my_cust_0_conversations_messages',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'create',
    roles: ['x_643482_my_cust_0.conversations_admin'],
    table: 'x_643482_my_cust_0_conversations_messages',
})
