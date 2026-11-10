# 🖥️ Client-Side Architecture

## Overview

The `src-client/` directory is a **standard ES module project** built with Vite (Rolldown). It contains all the interactive UI code that runs in the browser sidebars and modals inside Google Sheets. The build pipeline transforms it into `.js.html` / `.css.html` artifacts that `HtmlService` can serve.

---

### Directory Structure

```txt
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
|   src-client/                                                                                         |
|   ├── main.js                           ← Entry point (demo/mockup mode)                              |
|   ├── globals.js                        ← jQuery global injection ($ = window.$)                      |
|   ├── ClientConfig.js                   ← Client-side config constants (mirrors server manifest.js)   |
|   ├── mockup-data.js                    ← Static mock data for local demo/testing                     |
|   ├── style.css                         ← Global styles                                               |
|   │                                                                                                   |
|   ├── page-forms.js                     ← Page factory: builds FormsPageController                    |
|   ├── page-editor.js                    ← Page factory: builds EditorPageController                   |
|   ├── page-settings.js                  ← Page factory: builds SettingsPageController                 |
|   │                                                                                                   |
|   ├── pages/                            ← Page controllers (MVC-ish pattern)                          |
|   │   ├── FormsPageController.js        ← Data entry form UI                                          |
|   │   ├── EditorPageController.js       ← Header attribute editor                                     |
|   │   ├── SettingsPageController.js     ← App settings (language, API, deployment)                    |
|   │   └── shared/                                                                                     |
|   │       ├── BasePageController.js     ← Base class: wiring deps, config, runtime bridges            |
|   │       └── ViewFactory.js            ← Schema-driven DOM builder (creates UI from config)          |
|   │                                                                                                   |
|   └── builders/                         ← Reusable UI component library                               |
|       ├── createRuntime.js              ← Autodiscovers globalThis methods and wraps them as Promises |
|       ├── helper.js                     ← Utility functions (mergeInputConfig, numberToText, etc.)    |
|       ├── listeners-library.js          ← Event listener utilities                                    |
|       ├── input-builder.js              ← Creates form input fields (text, select, etc.)              |
|       ├── attribute-builder.js          ← Generates input attributes from schema                      |
|       ├── form-builder.js               ← Generates <form> elements                                   |
|       ├── accordion-builder.js          ← Creates accordion UI                                        |
|       ├── tab-builder.js                ← Creates tab UI                                              |
|       ├── header-builder.js             ← Creates header elements                                     |
|       ├── message-builder.js            ← Creates notification/banner elements                        |
|       ├── file-uploader.js              ← File upload widget                                          |
|       ├── file-uploader.css             ← Upload widget styles                                        |
|       └── table-builder.js              ← Creates table elements                                      |
└───────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Client Architecture Flow

```
HtmlService serves a .html template
         │
         ▼
  template/index.html (shell)
         │
         ▼
  <script> includes the correct build artifact:
  • client/ClientConfig.js.html
  • client/page-forms.js.html (or page-editor.js / page-settings.js.html)
  • client/Controllers/*.js.html
  • library/*.js.html (reusable builders)
         │
         ▼
  page-*.js factory (e.g. buildSheetsFormsPage)
    └─► new FormsPageController(deps, config)
         ├─► BasePageController constructor
         │     └─► createRuntime() → wraps globalThis methods as Promises
         │     └─► new ViewFactory(config)
         │
         ├─► loadData() → google.script.run (or mock data in dev)
         ├─► ViewFactory builds DOM from header schema
         │     └─► generateFormElement() / createInputElement() / etc.
         ├─► bindEvents() → Semantic UI dropdowns, tabs, accordion
         └─► handleSubmit() → google.script.run.insertTable() → server
```

---

### Page Controllers (MVC)

| Controller                   | Page File          | Responsibility                                                                                |
| ---------------------------- | ------------------ | --------------------------------------------------------------------------------------------- |
| **`FormsPageController`**    | `page-forms.js`    | Loads sheet headers, renders data entry forms from schema, submits `insertTable`              |
| **`EditorPageController`**   | `page-editor.js`   | Edits header cell notes (type, placeholder, required, range), previews form changes           |
| **`SettingsPageController`** | `page-settings.js` | Manages app settings: language, auto-translate, translatable columns, API key, deployment URL |
| **`BasePageController`**     | _(shared)_         | Base class: wires deps/config/viewFactory, provides loading states, initDropdowns/initTabs    |
| **`ViewFactory`**            | _(shared)_         | Pure DOM factory: accords, tabs, inputs, forms, headers — no state, just build & return       |

### Client ↔ Server Bridge

```
Browser (client-side)                  Google Apps Script (server-side)
─────────────────────────              ──────────────────────────────────
google.script.run                             ║
  .withSuccessHandler(fn)                     ║
  .withFailureHandler(fn)                     ║
  .loadData()                ───────────────► ║  CORE.library().discoveryService
  .insertTable()             ───────────────► ║  CORE.insertTable()
  ._getHeadersSchema()       ───────────────► ║  CORE.library().dataService.getHeaderAttributesFromDocumentCache()
  ._updateData(...)          ───────────────► ║  CORE.updateProperty()
  ._insertTable(...)         ───────────────► ║  CORE.insertTable()
  ._invalidateCache(...)     ───────────────► ║  CORE.library().setupService.cacheInvalidate()

ClientConfig.js.html provides:
  LANGUAGE_OPTIONS, SECTION_HEADERS, INPUT_KEY_MAP, BASE_PAGE_CONFIG

createRuntime.js wraps all globalThis._* methods into Promise-based deps
```
