# 🖥️ Server-Side Architecture

---

### Directory Structure

```txt
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
|   src-server/                                                                                   |
|   ├── Addon.js                                     ← Workspace Add-on entry (card UI)           |
|   ├── AppLoader.js                                 ← Spreadsheet & cache manager                |
|   ├── appscript.json                               ← GAS deployment manifest                    |
|   ├── Code.js                                      ← CORE global factory (doGet/doPost/onOpen)  |
|   ├── manifest.js                                  ← CMS config / default settings              |
|   ├── MenuTrigger.js                               ← Menu trigger functions (UI hooks)          |
|   ├── ModuleLoader.js                              ← IoC container / service factory            |
|   ├── Test.js                                      ← Test utilities & dev helpers               |
|   ├── Utils.js                                     ← Shared utility functions                   |
|   |                                                                                             |
|   ├── DashboardBuilder/                            ← Dashboard construction helpers             |
|   |   ├── DashboardBuilderRegistry.js              ← Dashboard persistence registry             |
|   |   └── DashboardBuilderService.js               ← Dashboard orchestration API                |
|   |                                                                                             |
|   ├── TableBuilder/                                ← Sheet table generator & helpers            |
|   |   ├── TableBuilderService.js                   ← Creates structured sheet tables            |
|   |   ├── TableBuilderService.util.js              ← Utility helpers for table building         |
|   |   └── TableBuilderService.diff.js              ← Diff/patch helpers for updates             |
|   |                                                                                             |
|   ├── GUIBuilder/                                  ← Menu/chart/widget builders                 |
|   |   ├── ChartBuilder.js                          ← Chart construction helpers                 |
|   |   ├── MenuBuilder.js                           ← AST-based menu renderer                    |
|   |   ├── WidgetBuilder.js                         ← UI widget builders                         |
|   |   └── UploadService.js                         ← Server-side upload helper (Drive)          |
|   |                                                                                             |
|   |                                                                                             |
|   ├── Services/                                    ← Core backend service implementations       |
|   |   ├── Accessors/                               ← Lightweight data access wrappers           |
|   |   |   ├── MetadataAccessor.js                  ← Per-sheet developer-metadata cache         |
|   |   |   └── PropertiesAccessor.js                ← Script/Document Properties wrapper         |
|   |   |                                                                                         |
|   |   ├── Gviz                                     ← GViz query engine files                    |
|   |   |   ├── GvizService.js                       ← SQL-like sheet query engine                |
|   |   |   └── GvizService.query.js                 ← Query builder utilities                    |
|   |   |                                                                                         |
|   |   ├── APIService.js                            ← REST API gateway (doGet/doPost)            |
|   |   ├── DataService.js                           ← Spreadsheet read/write layer               |
|   |   ├── DiscoveryService.js                      ← Introspection / discovery facade           |
|   |   ├── GUIService.js                            ← UI & sidebar/modal serving                 |
|   |   ├── SetupService.js                          ← One-time setup / provisioning              |
|   |   ├── TelemetryService.js                      ← Profiling and logging service              |
|   |   ├── TranslationService.js                    ← Translation helpers / sheets               |
|   |   └── UploadService.js                         ← File upload handling to Drive              |
|   |                                                                                             |
|   ├── template/                                    ← HTML templates served by HtmlService       |
|   │   ├── index.html                               ← Main web app shell                         |
|   │   └── server-script.html                       ← Client↔server bridge script                |
|   |                                                                                             |
|   |                       ┌──────────────────────────────────────┐                              |
|   |                       │ ↓↓   Build Auto Generated Files   ↓↓ │                              |
|   |                       └──────────────────────────────────────┘                              |
|   ├── include.js                                   ← Build-generated include mapping            |
|   |                                                                                             |
|   ├── client/                                      ← Sidebar pages and controllers (served)     |
|   │   ├── Controllers/                                                                          |
|   │   |   ├── BasePageController.js.html           ← Shared base controller                     |
|   │   |   ├── ...                                  ← Other page controllers                     |
|   │   |   └── SettingsPageController.js.html       ← Settings page controller                   |
|   |   |                                                                                         |
|   │   ├── page-settings.js.html                    ← Settings sidebar page                      |
|   │   ├── page-forms.js.html                       ← Forms sidebar page                         |
|   │   ├── page-input-config.js.html                ← Input-config sidebar page                  |
|   │   └── style.css.html                           ← Sidebar styles                             |
|   │                                                                                             |
|   └── library/                                     ← Generated client library files             |
|     ├── createRuntime.js.html                      ← Runtime wrapper for google.script.run      |
|     ├── ...                                        ← Utility components and helpers             |
|     ├── file-uploader.js.html                      ← File upload widget                         |
|     └── file-uploader.css.html                     ← Upload widget styles                       |
|                                                                                                 |
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                               ENTRY POINTS                                  │
│  ┌─────────────────────────────┐  ┌────────────────────────────────────┐    │
│  │ Code.js                     │  │ Addon.js                           │    │
│  │ CORE (Global Factory)       │  │ Google Workspace Add-on            │    │
│  │ • doGet() / doPost()        │  │ • onHomepage()                     │    │
│  │ • onOpen()                  │  │ • onFileScopeGranted()             │    │
│  │ • insertTable()             │  │                                    │    │
│  │ • updateProperty()          │  │                                    │    │
│  └──────────────┬──────────────┘  └─────────────────┬──────────────────┘    │
│                 │                                   │                       │
│                 │  new AppLoader() + new ModuleLoader(app)                  │
│                 ▼                                   │                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                          INFRASTRUCTURE CORE                                │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ AppLoader.js                                                         │   │
│  │ • Spreadsheet reference & sheet cache (Map)                          │   │
│  │ • Named ranges cache (lazy)                                          │   │
│  │ • Settings resolution (_resolveSettings)                             │   │
│  │ • Owns PropertiesAccessor                                            │   │
│  └──────────────────────────────┬───────────────────────────────────────┘   │
│                                 │                                           │
│  ┌──────────────────────────────▼───────────────────────────────────────┐   │
│  │ ModuleLoader.js  (IoC Container)                                     │   │
│  │ • Lazy getters for ALL services                                      │   │
│  │ • gviz(sheetName) → factory for per-sheet GvizService instances      │   │
│  │ • _repoCache → in-memory Gviz instance map                           │   │
│  └───────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬─────────────┘   │
│          │      │      │      │      │      │      │      │                 │
│  ┌───────┘      │      │      │      │      │      │      └───────────┐     │
│  │              │      │      │      │      │      │                  │     │
│  ▼              ▼      ▼      ▼      ▼      ▼      ▼                  ▼     │
├─────────────────────────────────────────────────────────────────────────────┤
│                               SERVICES LAYER                                │
│                                                                             │
│          ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌──────────────┐         │
│          │Telemetry  │ │GUI        │ │API        │ │Data          │         │
│          │Service    │ │Service    │ │Service    │ │Service       │         │
│          │           │ │           │ │           │ │              │         │
│          │• Profiling│ │• Sidebars │ │• GET/POST │ │• Sheet CRUD  │         │
│          │• Log Buf  │ │• Modals   │ │• Validate │ │• Named Ranges│         │
│          │• Timers   │ │• Web Forms│ │• REST     │ │• Headers     │         │
│          └───────────┘ └─────┬─────┘ └─────┬─────┘ └──────────────┘         │
│                              │             │                                │
│         ┌───────────┐ ┌──────┴──────┐ ┌────┴──────┐ ┌──────────────┐        │
│         │Discovery  │ │Translation  │ │Upload     │ │Setup         │        │
│         │Service    │ │Service      │ │Service    │ │Service       │        │
│         │           │ │             │ │           │ │              │        │
│         │• Headers  │ │• Translate  │ │• Drive    │ │• Deploy      │        │
│         │• Ranges   │ │• Lang Detect│ │• Blobs    │ │• System Sheet│        │
│         │• Dashboard│ │• Sheet Mgmt │ │• Rename   │ │• Cache Warm  │        │
│         └───────────┘ └─────────────┘ └───────────┘ └──────────────┘        │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                DATA ACCESSORS                               │
│        ┌────────────────────────────┐  ┌────────────────────────────┐       │
│        │ PropertiesAccessor         │  │ MetadataAccessor           │       │
│        │ • Script/Document Props    │  │ • Developer Metadata       │       │
│        │ • Lazy load + JSON parse   │  │ • Per-sheet key-value Map  │       │
│        │ • HEADERS special handling │  │ • _refreshCache() on init  │       │
│        └────────────────────────────┘  └────────────────────────────┘       │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                  BUILDERS                                   │
│                                                                             │
│      ┌──────────────────────┐  ┌──────────────────────┐                     │
│      │ GvizService          │  │ TableBuilderService  │                     │
│      │ • SQL-like queries   │  │ • Sheet table factory│                     │
│      │ • GViz API           │  │ • Validation/formulas│                     │
│      │ • Pagination/sort    │  │ • Named ranges       │                     │
│      │ • Per-sheet cache    │  │ • Native table conv. │                     │
│      └──────────────────────┘  └──────────────────────┘                     │
│                                                                             │
│      ┌──────────────────────┐  ┌──────────────────────────────────────┐     │
│      │ MenuBuilder          │  │ DashboardBuilderService              │     │
│      │ • AST-based menu     │  │ • getDefinitions()                   │     │
│      │ • Dynamic insert/rm  │  │ • refreshNativeDashboard()           │     │
│      │ • Conditional render │  │         │                            │     │
│      └──────────────────────┘  │  ┌──────▼───────────────────────┐    │     │
│                                │  │ DashboardBuilderRegistry     │    │     │
│                                │  │ • get/set Dashboards in Props│    │     │
│                                │  │ • get/set Layouts in Props   │    │     │
│                                │  └──────────────────────────────┘    │     │
│                                └──────────────────────────────────────┘     │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                    CLIENT-SIDE TEMPLATES (served as HTML)                   │
│                                                                             │
│   ┌──────────────────────────┐  ┌──────────────────────────────────────┐    │
│   │ client/                  │  │ library/                             │    │
│   │ • page-forms.js.html     │  │ • form-builder.js.html               │    │
│   │ • page-input-config.html │  │ • input-builder.js.html              │    │
│   │ • page-settings.js.html  │  │ • accordion-builder.js.html          │    │
│   │ • ClientConfig.js.html   │  │ • file-uploader.js.html + .css       │    │
│   │ • style.css.html         │  │ • tab-builder.js.html                │    │
│   │ • Controllers/           │  │ • helper.js.html                     │    │
│   │   ├─ BasePageController  │  │ • listeners-library.js.html          │    │
│   │   ├─ FormsPageController │  │ • createRuntime.js.html              │    │
│   │   ├─ InputConfigPage...  │  │ • message-builder.js.html            │    │
│   │   ├─ SettingsPage...     │  │ • header-builder.js.html             │    │
│   │   └─ ViewFactory         │  │ • attribute-builder.js.html          │    │
│   └──────────────────────────┘  └──────────────────────────────────────┘    │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ template/                                                            │   │
│  │ • index.html        → main shell for web app                         │   │
│  │ • server-script.html → bridges client ↔ server (google.script.run)   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ include.js  → maps which client + library files get bundled together │   │
│  │ manifest.js → CMS_CONFIG_MANIFEST: settings, sheets, menus, views    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 🔄 Request Flow Summary

```
                  ┌─ onOpen() ──────────────────────────────────────────────┐
                  │                                                         │
                  ▼                                                         │
     CORE.library() → ModuleLoader → GUIService.buildMainMenu()             │
                                     → MenuBuilder.render()                 │
                                     → Menu appears in Sheets UI            │
                                                                            │
     ───────────────────────────────────────────────────────────────────────│
                                                                            │
     User clicks   ┌─ MenuTriggers ───────────────────────────────────────┐ │
     menu item ──► │  → CORE.library().guiService.createSidebar("forms")  │ │
                   │  → HtmlService serves client/page-forms.js.html      │ │
                   └──────────────────────────────────────────────────────┘ │
                                                                            │
     ───────────────────────────────────────────────────────────────────────│
                                                                            │
     User submits  ┌─ google.script.run ──────────────────────────────────┐ │
     form ───────► │  → CORE.insertTable(sheetName, formData, settings)   │ │
                   │  → DataService.upsertRow()                           │ │
                   │  → UploadService.uploadFiles() (if attachments)      │ │
                   └──────────────────────────────────────────────────────┘ │
                                                                            │
     ───────────────────────────────────────────────────────────────────────│
                                                                            │
     External API  ┌─ doGet(e) ───────────────────────────────────────────┐ │
     call ───────► │  → CORE.library().apiService.GET(e)                  │ │
                   │    → API key validation                              │ │
                   │    → GvizService.paginate(queryParams)               │ │
                   │    → JSON response with data + pagination meta       │ │
                   │                                                      │ │
                   │  doPost(e) ──────────────────────────────────────────│ │
                   │  → CORE.library().apiService.POST(e)                 │ │
                   │    → action="update" → DataService.upsertRow()       │ │
                   │    → action="delete" → DataService.deleteRow()       │ │
                   │    → action="create" → DataService + UploadService   │ │
                   └──────────────────────────────────────────────────────┘ │
                                                                            │
     ───────────────────────────────────────────────────────────────────────│
                                                                            │
     First-time    ┌─ SetupService.execute() ─────────────────────────────┐ │
     setup ──────► │  → Store default settings in Properties              │ │
                   │  → TableBuilderService → create "vars" system sheet  │ │
                   │  → Set IS_CONFIGURED flag + version keys             │ │
                   │  → Pre-warm header cache (DataService → Properties)  │ │
                   └──────────────────────────────────────────────────────┘ │
```

### 🔗 Dependency Injection Pattern

```
CORE (global)
 │
 ├─► CORE.initialize(spreadsheetId, OauthToken, consumerProperties)
 │     │
 │     ├─► new AppLoader(spreadsheetId, OauthToken, consumerProperties)
 │     │     ├─► new PropertiesAccessor(consumerProperties)
 │     │     └─► _resolveSettings() → reads manifest + properties
 │     │
 │     └─► new ModuleLoader(appCore)
 │           ├─► new TelemetryService(this)    ← instantiated FIRST (always)
 │           ├─► new GUIService(this)          ← instantiated eagerly
 │           │
 │           └─► Lazy getters (on first access):
 │                 .translationService   → new TranslationService(this)
 │                 .dataService          → new DataService(this)
 │                 .discoveryService     → new DiscoveryService(this)
 │                 .dashboardBuilder...  → new DashboardBuilderService(this)
 │                 .uploadService        → new UploadService(this)
 │                 .setupService         → new SetupService(this)
 │                 .apiService           → new APIService(this)
 │                 .gviz(sheetName)      → new GvizService(this, token, opts)
 │
 └─► MenuTriggers → CORE.library() → returns cached ModuleLoader instance
```

---

## 📋 What Each File/Service Does

------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Code.js** | The **global factory**. Defines the `CORE` object — the main entry point for the entire CMS. It has `doGet()`/`doPost()` for the REST API web app, `onOpen()` for menu initialization, `updateProperty()` for config updates, and `insertTable()` for form submissions. It bootstraps `AppLoader` → `ModuleLoader` chain. |
| **Addon.js** | **Google Workspace Add-on** entry point. Provides `onHomepage()` and `onFileScopeGranted()` for the Workspace Add-on sidebar card UI (CardService-based, not HTML). |

### 🔷 Infrastructure Core

| File                | Role                                                                                                                                                                                                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AppLoader.js**    | The **infrastructure orchestrator** — single source of truth for caching. Holds the `Spreadsheet` reference, a `Map`-based sheet cache, named ranges cache, and settings. Owns `PropertiesAccessor` for fast property reads/writes. Every service receives a reference to it. |
| **ModuleLoader.js** | **IoC (Inversion of Control) container**. Uses lazy getters to instantiate all services on demand. Also acts as a **factory** for `GvizService` instances via `gviz(sheetName)` — one Gviz repo per sheet, cached in `_repoCache`.                                            |
| **manifest.js**     | **Single source of truth** (`CMS_CONFIG_MANIFEST`). Defines default settings, system sheet schemas (like `vars`), the menu AST schema (what appears under "Extensions"), view configurations, and storage keys.                                                               |
| **include.js**      | **Build manifest** — maps which client-side and library files get bundled together into HTML templates. Used by the Vite build plugin to inject `<script>` and `<style>` tags.                                                                                                |
| **Utils.js**        | **Utility belt**: API key generation (`generateApiKey`), timestamp formatting (`createTimestamp`), mandatory property creation (UUID + timestamp + email), data sorting, and text transformation helpers. Used across all services.                                           |

### 🔷 Triggers

| File                | Role                                                                                                                                                                                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MenuTriggers.js** | **Static Google Apps Script trigger functions** (e.g., `menuTriggerShowFormsSidebar`). Each function calls `CORE.library()` to get the `ModuleLoader`, then delegates to the appropriate service. These are the functions wired to menu items in the manifest. |

### 🔷 Services Layer

| File                     | Role                                                                                                                                                                                                                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`TelemetryService`**   | **Performance profiler & logger**. Instantiated _first_ (before any other service). Provides `startTimer`/`stopTimer` for measuring execution time, a `_clientLogBuffer` that accumulates logs to send to the browser console, and `logModuleState` for tracking service calls.                        |
| **`GUIService`**         | **UI manager** for the Google Sheets interface. `buildMainMenu()` reads the manifest's `MENU_SCHEMA` and uses `MenuBuilder` to render it. `createSidebar()`/`createModal()` serve HTML templates (forms, settings, input-config) via `_prepareTemplate()`. `loadWebForm()` serves the public web form. |
| **`APIService`**         | **REST API Gateway** — the backend for the public web app. `GET()` handles read queries (with filtering, sorting, pagination via Gviz). `POST()` routes to create/update/delete based on the `action` field. Validates API keys and sheet existence. Returns JSON responses.                           |
| **`DataService`**        | **Spreadsheet mutation layer**. Reads/writes named ranges, parses header attributes from sheets, handles row upserts (update-or-insert), and manages sheet-level data operations. The "write" counterpart to GvizService's "read".                                                                     |
| **`DiscoveryService`**   | **Read-only introspection** layer. Discovers all sheet headers, named ranges, translation sheets, and dashboard definitions. Acts as a facade over `DataService`, `TranslationService`, and `DashboardBuilderService` — useful for the client to know what's available.                                |
| **`TranslationService`** | **Google Translate integration**. Translates strings or arrays of strings via `LanguageApp.translate()`. Manages translation sheets (e.g., `Products [en]` ← `Products [id]`). Handles column-level skip logic and direction formatting (`id-en`).                                                     |
| **`UploadService`**      | **File upload handler**. Accepts file blobs (bytes or base64) from the client, validates size/count, uploads to a specified Google Drive folder, optionally renames files by their Drive ID, and generates download URLs.                                                                              |
| **`SetupService`**       | **One-time deployment orchestrator**. `execute()` stores default settings, creates the mandatory `vars` system sheet via `TableBuilderService`, sets configuration flags (`IS_CONFIGURED`), and pre-warms the header cache. Runs the first time a user sets up the CMS.                                |

### 🔷 Data Accessors

| File                     | Role                                                                                                                                                                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`PropertiesAccessor`** | **High-speed cached property access**. Wraps `PropertiesService` (Script/Document Properties) with lazy initialization, JSON auto-parse/stringify, and special handling for the `HEADERS` key. Used by `AppLoader` so services never touch `PropertiesService` directly. |
| **`MetadataAccessor`**   | **Sheet-level developer metadata cache**. Wraps `sheet.getDeveloperMetadata()` into a `Map<key, value>`. Lets you attach hidden metadata to any sheet (e.g., schema version, last modified). Instantiated per-sheet by `AppLoader`.                                      |

### 🔷 Builders

| File                           | Role                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`GvizService`**              | **SQL-like query engine for Google Sheets**. Uses the Google Visualization API (`google.visualization.Query`) to run SQL queries against sheet data. Supports pagination, filtering (`WHERE`), sorting (`ORDER BY`), and column selection. One instance per sheet, cached in `ModuleLoader._repoCache`. Also has `GvizService.query.js` for query construction.          |
| **`TableBuilderService`**      | **Sheet table factory**. Creates structured tables in Google Sheets with: headers, body data, column widths, data validation (dropdowns, currency, number ranges), named ranges, Excel-like formulas, and native table conversion via Sheets API. Used by `SetupService` to create the `vars` system table. Has a companion `TableBuilderService.util.js` and diff file. |
| **`MenuBuilder`**              | **AST-based dynamic menu builder**. Takes the `MENU_SCHEMA` from the manifest and renders it into Google Sheets' `SpreadsheetApp.getUi().createMenu()`. Supports conditional nodes, dynamic insertion/removal at runtime (`insertAtRoot`, `insertRelative`, `removeItem`), and separator placement.                                                                      |
| **`DashboardBuilderService`**  | **Dashboard orchestration**. Delegates to `DashboardBuilderRegistry` for persistence. `getDefinitions()` returns all registered dashboards. `refreshNativeDashboard()` is a placeholder for native Sheets dashboard refresh.                                                                                                                                             |
| **`DashboardBuilderRegistry`** | **Dashboard CRUD persistence**. Stores dashboard definitions and layouts in Script Properties as JSON. Provides `getDashboards()`/`setDashboards()` and `getLayout()`/`setLayout()`. The persistence backend for the dashboard feature.                                                                                                                                  |

### 🔷 Client Templates

| Directory       | Role                                                                                                                                                                                                                                                                                                  |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`client/`**   | **Sidebar HTML/JS/CSS templates** served via `HtmlService`. Contains three page controllers (`FormsPageController`, `InputConfigPageController`, `SettingsPageController`) with a shared `BasePageController` and `ViewFactory`. These are the interactive sidebar panels users see in Google Sheets. |
| **`library/`**  | **Reusable UI component library** — form builder, input builder, accordion builder, tab builder, file uploader (with CSS), header builder, message builder, attribute builder, and a `createRuntime.js` factory. These are injected into the client pages at build time.                              |
| **`template/`** | **Core HTML wrappers** — index.html is the main shell, and `server-script.html` contains the server-side `<script>` that bridges client ↔ server (`google.script.run` calls).                                                                                                                         |

---

### 🔄 Request Flow Summary

```
                ┌──────────────────────────────────────────────────────────────┐
                |          User opens sheet → onOpen() → CORE.library()        |
                |  → ModuleLoader → GUIService → MenuBuilder → Menu rendered   |
                └─────────────────────────────┬────────────────────────────────┘
                ┌─────────────────────────────▼────────────────────────────────┐
                |      User clicks menu → MenuTriggers → CORE.library()        |
                |            → GUIService.createSidebar("forms")               |
                |      → HtmlService serves client/page-forms.js.html          |
                └─────────────────────────────┬────────────────────────────────┘
                ┌─────────────────────────────▼────────────────────────────────┐
                |     User submits form → google.script.run.insertTable()      |
                |      → CORE.insertTable() → DataService.upsertRow()          |
                └─────────────────────────────┬────────────────────────────────┘
                ┌─────────────────────────────▼────────────────────────────────┐
                | External API call → doGet/doPost → CORE.library().apiService |
                |    → GvizService (read) / DataService+UploadService (write)  |
                └─────────────────────────────┬────────────────────────────────┘
                     ┌────────────────────────▼───────────────────────────┐
                     |      First time setup → SetupService.execute()     |
                     |     → TableBuilderService → creates "vars" sheet   |
                     |          → PropertiesAccessor stores config        |
                     └────────────────────────────────────────────────────┘
```

## How headers Stored, Updated and Cached

```txt

EditorPageController
  │  builds complete updated headersSchema in memory
  │  calls _callUpdateData(noteChange, fullHeadersSchema)
  ▼
_updateData("HEADERS", noteChange, fullHeadersSchema, callback)
  │  constructs { note: noteChange, headers: fullHeadersSchema }
  │  sends to server
  ▼
CORE.updateProperty("HEADERS", { note, headers })
  │
  ├─► dataService.setInputConfigNote(note)     ← updates note in sheet
  │
  └─► props.set("HEADERS", headers, false)     ← stores full schema
        │
        ├─► headers().set(value)              ← DocumentCache updated
        └─► this._props["HEADERS"] = value    ← in-memory cache updated
  │
  │  (invalidate = false → no _IS_OUTDATED flag)
  ▼
_updateData success handler
  │
  └─► updateLocalCache("HEADERS", fullHeadersSchema)  ← localStorage updated

```
