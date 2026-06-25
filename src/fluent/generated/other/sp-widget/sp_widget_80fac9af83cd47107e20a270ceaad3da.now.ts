import { SPWidget } from '@servicenow/sdk/core'

SPWidget({
    $id: Now.ID['80fac9af83cd47107e20a270ceaad3da'],
    name: 'my custom chat',
    clientScript: Now.include('./sp_widget_my_custom_chat/client_script.js'),
    serverScript: Now.include('./sp_widget_my_custom_chat/server_script.js'),
    htmlTemplate: Now.include('./sp_widget_my_custom_chat/template.html'),
    customCss: Now.include('./sp_widget_my_custom_chat/style.scss'),
    hasPreview: true,
    id: 'my_custom_chat',
    linkScript: Now.include('./sp_widget_my_custom_chat/link-script.js'),
})
