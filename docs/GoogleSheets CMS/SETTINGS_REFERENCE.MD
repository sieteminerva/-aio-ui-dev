# Settings Reference

All configurable settings live in `CMS_CONFIG_MANIFEST.DEFAULT_SETTINGS` and are persisted in Script Properties. They can be edited through the **Settings sidebar** (📂 Google Sheets CMS → ⚙️ Settings).

---

## General

| Setting              | Type   | Default                | Description                                                         |
| -------------------- | ------ | ---------------------- | ------------------------------------------------------------------- |
| `menuTitle`          | string | `📂 Google Sheets CMS` | Title shown in the Google Sheets toolbar menu                       |
| `propertyIdentifier` | string | `UUID`                 | Column name used as the unique row identifier (for updates/deletes) |
| `spreadsheetId`      | string | _(auto)_               | ID of the active spreadsheet                                        |
| `appsScriptId`       | string | _(auto)_               | ID of the bound Apps Script project                                 |
| `deploymentUrl`      | string | _(auto)_               | Web app deployment URL (used as API base URL)                       |

---

## API

| Setting  | Type   | Default                            | Description                                                                                                    |
| -------- | ------ | ---------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `apiKey` | string | `""`                               | API key for securing REST endpoints. If empty, no auth is required. Generate one with `Utils.generateApiKey()` |
| `formId` | string | `replace-with-your-google-form-id` | Google Form ID for external form integration                                                                   |

---

## Debug

| Setting     | Type   | Default | Description                                                                                                           |
| ----------- | ------ | ------- | --------------------------------------------------------------------------------------------------------------------- |
| `debugMode` | string | `DATA`  | Controls telemetry output: `OFF` (no logging), `MINIMAL` (errors only), `DATA` (full telemetry + client console logs) |

In `DATA` mode, the `TelemetryService`:

- Profiles every service call (`startTimer` / `stopTimer`)
- Accumulates logs in `_clientLogBuffer`
- Sends logs to the browser console via API responses

---

## File Upload

| Setting         | Type   | Default          | Description                                                                 |
| --------------- | ------ | ---------------- | --------------------------------------------------------------------------- |
| `driveFolderId` | string | _(auto)_         | Google Drive folder ID for file uploads. Created automatically during setup |
| `maxFileSize`   | number | `5242880` (5 MB) | Maximum single file size in bytes                                           |
| `maxUpload`     | number | `10`             | Maximum number of files per submission                                      |

---

## Translation

| Setting               | Type    | Default | Description                                                                     |
| --------------------- | ------- | ------- | ------------------------------------------------------------------------------- |
| `autoTranslate`       | boolean | `false` | Enable/disable automatic translation of new/updated rows                        |
| `defaultLanguage`     | string  | `"en"`  | Source language code (e.g., `en`, `id`, `fr`)                                   |
| `translationLanguage` | string  | `""`    | Target language code. Must be set for translation to work                       |
| `translatableColumns` | string  | `""`    | Comma-separated list of column names to translate (e.g., `"Title,Description"`) |

See [Translation](TRANSLATION.MD) for full details.

---

## How Settings Are Stored

```
Settings sidebar (client)
    │ google.script.run._updateData()
    ▼
CORE.updateProperty("SETTINGS_KEY", newSettings)
    │
    └─► PropertiesAccessor.set("SETTINGS_KEY", value)
          ├─► this._props["SETTINGS_KEY"] = stringValue    ← in-memory (0ms)
          └─► consumerProperties.setProperties(updates)    ← Google servers
```

Read path:

```javascript
const settings = modules.app.settings;
// → AppLoader._resolveSettings() reads from PropertiesAccessor
// → Falls back to CMS_CONFIG_MANIFEST.DEFAULT_SETTINGS for missing keys
```

---

## Programmatic Access

```javascript
// Server-side (any service)
const settings = this.app.settings;
const apiKey = settings.apiKey;
const maxUpload = settings.maxUpload;

// Read directly from Properties
const props = this.app.getProperties();
const raw = props.get("SETTINGS_KEY");
```

---

## Next

- [Getting Started](./GETTING_STARTED.MD) — initial setup process
- [Translation](TRANSLATION.MD) — configure auto-translate
- [File Upload](FILE_UPLOAD.MD) — configure upload limits
