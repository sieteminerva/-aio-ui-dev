# Google Sheets CMS — Wiki

Turn Google Sheets into a high-performance headless CMS and REST API — zero hosting, zero servers, zero cost.

---

## 📚 Documentation Index

### 🚀 Getting Started

| Page                                    | Description                                                |
| --------------------------------------- | ---------------------------------------------------------- |
| [Getting Started](./GETTING_STARTED.MD) | Copy template → run setup → first form → first API call    |
| [Deployment](./DEPLOYMENT.MD)           | Deploy to Google Apps Script, clasp, web app configuration |

### 🏗️ Architecture & Build

| Page                               | Description                                              |
| ---------------------------------- | -------------------------------------------------------- |
| [Server Architecture](./SERVER.MD) | Server-side IoC container, services, accessors, builders |
| [Client Architecture](./CLIENT.MD) | Client-side MVC controllers, ViewFactory, builders       |
| [Build System](./BUILD.MD)         | Vite + apps-script.build.plugin.js pipeline              |

### 📡 API & Integration

| Page                                | Description                                                        |
| ----------------------------------- | ------------------------------------------------------------------ |
| [REST API Reference](./REST_API.MD) | Full API docs: GET/POST, query params, request bodies, error codes |
| [API Cheat Sheet](./CHEATSHEET.MD)  | Quick reference: curl examples, response formats                   |

### ⚙️ Configuration

| Page                                            | Description                                                 |
| ----------------------------------------------- | ----------------------------------------------------------- |
| [Settings Reference](./SETTINGS_REFERENCE.MD)   | Every setting explained: debug mode, API key, upload limits |
| [Input Configuration](./INPUT_CONFIGURATION.MD) | JSON schema for customizing form inputs (Semantic UI)       |

### 🌐 Features

| Page                                   | Description                                           |
| -------------------------------------- | ----------------------------------------------------- |
| [Translation (i18n)](./TRANSLATION.MD) | Auto-translate, language config, translation sheets   |
| [File Upload](./FILE_UPLOAD.MD)        | Upload to Drive, limits, blob handling, download URLs |
| [Dashboard Builder](./DASHBOARD.MD)    | Dashboard definitions, layouts, registry              |

### 🛠️ Support

| Page                                    | Description             |
| --------------------------------------- | ----------------------- |
| [Troubleshooting](./TROUBLESHOOTING.MD) | Common issues and fixes |

---

### For Developers

See the architecture pages for internal reference: [Server Architecture](./SERVER.MD) (diagrams, services, DI pattern) and [Client Architecture](./CLIENT.MD) (controllers, ViewFactory, builders).
