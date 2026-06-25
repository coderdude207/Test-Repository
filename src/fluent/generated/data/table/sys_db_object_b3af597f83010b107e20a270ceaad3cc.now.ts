import { Table, StringColumn } from '@servicenow/sdk/core'

export const x_643482_my_cust_0_prompt_library = Table({
    actions: ['read', 'update', 'delete', 'create'],
    allowWebServiceAccess: true,
    autoNumber: {
        prefix: 'PROMPT',
    },
    label: 'Prompt Library',
    name: 'x_643482_my_cust_0_prompt_library',
    schema: {
        number: StringColumn({
            attributes: {
                ignore_filter_on_new: true,
            },
            default: 'javascript:global.getNextObjNumberPadded();',
            label: 'Number',
        }),
    },
})
