import { Table, StringColumn, ReferenceColumn, SystemClassNameColumn } from '@servicenow/sdk/core'

export const x_643482_my_cust_0_conversations = Table({
    actions: ['read', 'update', 'delete', 'create'],
    allowWebServiceAccess: true,
    autoNumber: {
        numberOfDigits: 8,
        prefix: 'CONV',
    },
    extensible: true,
    label: 'Conversations',
    name: 'x_643482_my_cust_0_conversations',
    schema: {
        conversation_summary: StringColumn({
            label: 'Conversation Summary',
            maxLength: 6000,
        }),
        conversation_title: StringColumn({
            label: 'Conversation Title',
            maxLength: 1000,
        }),
        initiated_by_user: ReferenceColumn({
            label: 'Initiated By User',
            referenceTable: 'sys_user',
        }),
        number: StringColumn({
            attributes: {
                ignore_filter_on_new: true,
            },
            default: 'javascript:global.getNextObjNumberPadded();',
            label: 'Number',
        }),
        sys_class_name: SystemClassNameColumn({
            default: 'javascript:current.getTableName();',
            label: 'Class',
            maxLength: 80,
        }),
    },
})
