import { Table, ReferenceColumn, ChoiceColumn, StringColumn, IntegerColumn, HtmlColumn } from '@servicenow/sdk/core'

export const x_643482_my_cust_0_conversations_messages = Table({
    actions: ['read', 'update', 'delete', 'create'],
    allowWebServiceAccess: true,
    autoNumber: {
        prefix: 'COMSG',
    },
    label: 'Conversations Messages',
    name: 'x_643482_my_cust_0_conversations_messages',
    schema: {
        conversation: ReferenceColumn({
            label: 'Conversation',
            referenceTable: 'x_643482_my_cust_0_conversations',
        }),
        initiated_by: ChoiceColumn({
            dropdown: 'dropdown_with_none',
            label: 'Initiated By',
        }),
        message_content: HtmlColumn({
            label: 'Message Content',
            maxLength: 10000,
        }),
        number: StringColumn({
            attributes: {
                ignore_filter_on_new: true,
            },
            default: 'javascript:global.getNextObjNumberPadded();',
            label: 'Number',
        }),
        order: IntegerColumn({
            default: '0',
            label: 'Order',
        }),
        payload: StringColumn({
            isFullUTF8: true,
            label: 'Payload',
            maxLength: 10000,
        }),
        previous_message: ReferenceColumn({
            label: 'Previous Message',
            referenceTable: 'x_643482_my_cust_0_conversations_messages',
        }),
        status: ChoiceColumn({
            dropdown: 'dropdown_with_none',
            label: 'Status',
        }),
    },
})
