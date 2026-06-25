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
├── index.now.ts                  # barrel / entry point (currently empty)
├── generated/                    # all metadata synced from the instance via `transform`
│   ├── data/table/               # Table() definitions for the 3 custom tables
│   ├── integrations-inbound/
│   │   ├── scripted-rest-api/    # RestApi() for "LLM Chat Assistant Helper"
│   │   └── scripted-web-service/ # legacy SOAP stub (Record wrapper)
│   ├── other/
│   │   └── sp-widget/            # two Service Portal widgets (see below)
│   ├── security/
│   │   ├── access-control/       # Acl() rules for each table × CRUD operation
│   │   └── role/                 # Role() definitions
│   ├── server-development/
│   │   └── script-include/       # ScriptInclude() — LLMProxyHelper
│   └── user-interface/           # ApplicationMenu() and Record(sys_app_module) entries
└── generated/keys.ts             # Auto-generated Now.ID type registry (do not edit)
```

### Custom tables (scope prefix `x_643482_my_cust_0_`)

| Table | Purpose |
|---|---|
| `conversations` | One record per chat session; `title` = first user prompt |
| `conversations_messages` | Individual messages; `conversation` → parent, `role` (user/assistant), `content`, `message_content` (HTML) |
| `prompt_library` | Reusable prompt templates |

### Service Portal widgets

Both widgets live under `src/fluent/generated/other/sp-widget/` as a `.now.ts` Fluent file + a sibling folder containing the actual widget files:

**`sp_widget_my_custom_chat`** (`id: my_custom_chat`) — primary widget
- Full "Buddy" UI: sidebar with conversation history, home/thread views, dark/light theme, suggestion chips
- Streams LLM responses directly from the browser using the `fetch` API against the Ollama endpoint
- AngularJS controller (`client_script.js`): all UI state is on `c.*` (not `c.data.*`) to avoid serialisation issues when calling `c.server.update()`
- Server calls use `c.data.serverAction` + `c.data.actionPayload` (JSON string) pattern; the server script switches on `serverAction` to perform `createConversation`, `createMessage`, or `loadMessages`
- On first user prompt: creates a `conversations` record, then a `conversations_messages` record for the user turn; after streaming finishes `_finalizeMessage()` creates the assistant record

**`sp_widget_llm_assistant`** (`id: llm-assistant`) — simpler assistant widget (no conversation persistence)

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
