# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build       # Compile Fluent .now.ts → metadata XML (output: dist/ + target/*.zip)
npm run deploy      # Build + package + install onto the ServiceNow instance
npm run transform   # Pull changes from the instance and convert to Fluent source
npm run types       # Fetch table type definitions from the instance into @types/
```

The deploy target is `https://dev293427.service-now.com` (scope `x_643482_my_cust_0`, app sys_id `9df85c0f830d43107e20a270ceaad3a1`). Auth is stored in the system keychain — no `.env` files.

## Architecture

This is a **ServiceNow SDK (now-sdk v4.x) application** for "My Custom AI Agent". Source is written in the Fluent DSL (TypeScript-based) and compiled to ServiceNow metadata XML on build.

### Source layout

```
src/fluent/
├── index.now.ts                       # barrel / entry point (currently empty)
├── tsconfig.json / tsconfig.*.json    # TypeScript config for server + client builds
├── github-integration/                # handwritten GitHub webhook pipeline (not synced)
│   ├── scripted-rest-api/
│   │   ├── github-webhook-receiver.now.ts   # RestApi() — GitHub Webhook Receiver (github_webhook / POST /push)
│   │   └── github-webhook-push.js           # POST /push handler (6-step pipeline)
│   └── script-include/
│       ├── github-webhook-validator.now.ts  # ScriptInclude() — GitHubWebhookValidator
│       ├── GitHubWebhookValidator.server.js # HMAC verify, payload parse, new-branch detect
│       ├── github-file-explorer.now.ts      # ScriptInclude() — GitHubFileExplorer
│       └── GitHubFileExplorer.server.js     # paginated compare + file content fetch
├── generated/                         # all metadata synced from the instance via `transform`
│   ├── data/table/                    # Table() definitions for the 3 custom tables
│   ├── integrations-inbound/
│   │   ├── scripted-rest-api/         # RestApi() — 2 APIs: "LLM Chat Assistant Helper" + "Github Integration"
│   │   └── scripted-web-service/      # legacy SOAP stub (Record wrapper)
│   ├── other/
│   │   ├── sp-widget/                 # three Service Portal widgets (see below)
│   │   ├── sys-embedded-help-role/    # Record(sys_embedded_help_role) — 4 entries
│   │   ├── sys-scope-privilege/       # CrossScopePrivilege() — 3 entries (sys_user read, incident read, ScriptableServiceResultBuilder execute)
│   │   ├── sys-ui-application/        # Record(sys_ui_application) — 3 app entries
│   │   └── sys-ui-module/             # Record(sys_ui_module) — 3 module entries
│   ├── security/
│   │   ├── access-control/            # Acl() rules for each table × CRUD operation (12 rules)
│   │   └── role/                      # Role() definitions (4 roles — see below)
│   ├── server-development/
│   │   └── script-include/            # ScriptInclude() — LLMProxyHelper (.now.ts + .server.js)
│   └── user-interface/
│       ├── application-menu/          # ApplicationMenu() — 3 entries
│       └── module/                    # Record(sys_app_module) — 3 entries
└── generated/keys.ts                  # Auto-generated Now.ID type registry (do not edit)
```

### Custom tables (scope prefix `x_643482_my_cust_0_`)

| Table | Purpose |
|---|---|
| `conversations` | One record per chat session; key fields: `conversation_title`, `conversation_summary`, `initiated_by_user` (→ `sys_user`), `number` (auto CONV######) |
| `conversations_messages` | Individual messages; `conversation` → parent, `initiated_by` (ChoiceColumn: user/assistant), `payload` (raw text, UTF-8, 10k), `message_content` (HTML, 10k), `order` (int), `previous_message` (self-ref), `status`, `number` (auto COMSG######) |
| `prompt_library` | Reusable prompt templates; `number` (auto PROMPT######) |

### Service Portal widgets

All widgets live under `src/fluent/generated/other/sp-widget/` as a `.now.ts` Fluent file + a sibling folder containing the actual widget files:

**`sp_widget_my_custom_chat`** (`id: my_custom_chat`) — primary widget
Files: `client_script.js`, `server_script.js`, `template.html`, `style.scss`, `link-script.js`
- Full "Buddy" UI: sidebar with conversation history, home/thread views, dark/light theme, suggestion chips
- Streams LLM responses directly from the browser using the `fetch` API against the Ollama endpoint
- AngularJS controller (`client_script.js`): all UI state is on `c.*` (not `c.data.*`) to avoid serialisation issues when calling `c.server.update()`
- Server calls use `c.data.serverAction` + `c.data.actionPayload` (JSON string) pattern; the server script switches on `serverAction` to perform `createConversation`, `createMessage`, or `loadMessages`
- On first user prompt: creates a `conversations` record, then a `conversations_messages` record for the user turn; after streaming finishes `_finalizeMessage()` creates the assistant record

**`sp_widget_llm_assistant`** (`id: llm-assistant`) — simpler assistant widget (no conversation persistence)
Files: `client_script.js`, `server_script.js`, `template.html`, `style.scss`, `link-script.js`

**`sp_widget_buddy_ai_assitant`** (`id: buddy_ai_assitant`) — new Buddy AI assistant widget (note: "assitant" is the instance spelling)
Files: `client_script.js`, `server_script.js`, `template.html`, `style.scss`, `link-script.js`

### REST APIs (Scripted REST)

| API name | serviceId | Routes | Notes |
|---|---|---|---|
| `LLM Chat Assistant Helper` | `llm_chat_assistant_helper` | `GET /issue_token`, `GET /chat_credentials` | Token issuance + credential vending |
| `Github Integration` | `github_integration` | `POST /callback_url` | Legacy stub (synced from instance) — returns `{result: true}` |
| `GitHub Webhook Receiver` | `github_webhook` | `POST /push` | Full webhook pipeline — sig verify → parse → fetch changed files → import XML update sets |

### Roles (scope prefix `x_643482_my_cust_0.`)

| Role | Description |
|---|---|
| `admin` | Default admin role |
| `admin_app` | App-level admin |
| `conversations_admin` | Access to Conversations application and modules |
| `user` | Default user role |

`conversations_admin` is the role gate on the `sys_ui_application`, `ApplicationMenu`, and `sys_ui_module` entries for the Conversations app.

### LLM credential flow

The browser never calls the LLM directly with a long-lived key. The flow is:

1. Widget server script hard-codes credentials for direct Ollama access (current setup)  
   **OR** client calls `/api/x_643482_my_cust_0/llm_chat_assistant_helper/issue_token` → `LLMProxyHelper.issueToken()` returns a 60-second HMAC-SHA256 signed token  
2. Client calls `/api/x_643482_my_cust_0/llm_chat_assistant_helper/chat_credentials` with the token → server validates and returns `apiKey`, `endpoint`, `model` from sys_properties

**Required sys_properties** (Password2-type for key fields):
- `llm.ollama.endpoint` / `llm.chat.endpoint`
- `llm.ollama.model` / `llm.chat.model`
- `llm.ollama.key` / `llm.api.key`
- `llm.token.secret` (HMAC signing secret)

### Known instance bugs

- `sp_widget_my_custom_chat/client_script.js` line 1 has `api.controller=api.controller=function(...)` (double assignment) — this is a bug in the instance source. The SDK validator rejects it on the first `transform` run if the file is already present with the broken content; fix by removing the duplicate `api.controller=` prefix. The instance needs to be corrected at source to prevent this recurring on every `transform`.

### SDK 4.x compatibility notes (applied during upgrade from 3.0.3)

These fixes are already in the source but matter when running `transform` and re-generating files:

- `SPWidget`, `ScriptInclude` are **not** globals in v4 — add `import { SPWidget } from '@servicenow/sdk/core'`
- `HtmlColumn` must be explicitly imported (same pattern)
- `roles` on `Record({ table: 'sys_app_module', ... })` must be an array `['role.name']`, not a string
- `accessibleFrom` on `ScriptInclude` must be `'public'` or `'package_private'` (not `''`)
- `keys.ts` — the SDK v3-generated file had `deleted: true` boolean literals that crash the v4 build; if `transform` regenerates it with booleans, the build will fail with "Type was not a literal type"

### Build outputs

- `dist/` — intermediate compiled XML per record type
- `target/my_app_1_0_0.zip` — installable artifact (created by `pack`/`install`)
- `metadata/` — static XML files that **override** generated output (warned during build); these are legacy files kept for the `sys_app` record and dictionary snapshots
