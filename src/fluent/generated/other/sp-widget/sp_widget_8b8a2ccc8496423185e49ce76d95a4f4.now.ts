import { SPWidget } from '@servicenow/sdk/core'

SPWidget({
    $id: Now.ID['8b8a2ccc8496423185e49ce76d95a4f4'],
    name: 'LLM AI Assistant',
    clientScript: Now.include('./sp_widget_llm_assistant/client_script.js'),
    serverScript: Now.include('./sp_widget_llm_assistant/server_script.js'),
    controllerAs: '',
    htmlTemplate: Now.include('./sp_widget_llm_assistant/template.html'),
    customCss: Now.include('./sp_widget_llm_assistant/style.scss'),
    dataTable: '',
    id: 'llm-assistant',
})
