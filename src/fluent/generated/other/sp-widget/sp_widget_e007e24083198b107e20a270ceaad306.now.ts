import { SPWidget } from '@servicenow/sdk/core'

SPWidget({
    $id: Now.ID['e007e24083198b107e20a270ceaad306'],
    name: 'buddy ai assitant',
    clientScript: Now.include('./sp_widget_buddy_ai_assitant/client_script.js'),
    serverScript: Now.include('./sp_widget_buddy_ai_assitant/server_script.js'),
    htmlTemplate: Now.include('./sp_widget_buddy_ai_assitant/template.html'),
    customCss: Now.include('./sp_widget_buddy_ai_assitant/style.scss'),
    hasPreview: true,
    id: 'buddy_ai_assitant',
    linkScript: Now.include('./sp_widget_buddy_ai_assitant/link-script.js'),
})
