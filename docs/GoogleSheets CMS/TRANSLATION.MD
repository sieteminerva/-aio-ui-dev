# Translation (i18n)

The CMS includes a built-in **auto-translation engine** powered by Google Translate (`LanguageApp`). It clones your source data into language-specific sheets, isolates translatable columns, and keeps translations synchronized on every insert/update.

---

## How It Works

```
┌────────────────────┐       auto-translate        ┌────────────────────────┐
│  Products          │ ──────────────────────────► │ Products [id]          │
│  (source sheet)    │    clones + translates      │ (Indonesian, read-only)│
│  UUID | Name | ... │                             │ UUID | Nama | ...      │
└────────────────────┘                             └────────────────────────┘
```

1. When you enable auto-translate, the system creates a **translation sheet** named `{SourceSheet} [{lang}]` (e.g., `Products [en]`)
2. The translation sheet is marked with developer metadata (`IS_TRANSLATION_FOR` → source sheet ID)
3. On every insert/update, translatable columns are translated and synced
4. Translation sheets are **read-only** — hidden from forms and API mutations

---

## Configuration

### In Settings Sidebar

Navigate to **📂 Google Sheets CMS → ⚙️ Settings**:

| Setting                  | Description                                 |
| ------------------------ | ------------------------------------------- |
| **Auto Translate**       | Toggle ON to enable translation             |
| **Default Language**     | Source language (e.g., `id` for Indonesian) |
| **Translation Language** | Target language (e.g., `en` for English)    |
| **Translatable Columns** | Which columns to translate (multi-select)   |

### In `manifest.js`

```javascript
DEFAULT_SETTINGS: {
    autoTranslate: false,
    defaultLanguage: "en",
    translationLanguage: "",
    translatableColumns: "",  // comma-separated column names
}
```

---

## Translation Flow

```
1. User inserts/updates row in "Products"
         │
         ▼
2. DataService.upsertRow()
    checks settings.autoTranslate === true
         │
         ▼
3. TranslationService.autoTranslate()
    ├─► _formatSheetName() → "Products [en]", direction "id-en"
    ├─► getSheet("Products [en]") → exists?
    │     ├─► YES → translate this row → write to matching row
    │     └─► NO  → create sheet, copy headers, translate ALL rows
    ├─► markTranslationSheet() → IS_TRANSLATION_FOR metadata
    └─► lockTranslationSheets() → hide + protect
```

---

## Translation Sheet Naming

| Source Sheet    | Translation Language | Translation Sheet |
| --------------- | -------------------- | ----------------- |
| `Products`      | `en`                 | `Products [en]`   |
| `Blog Posts`    | `id`                 | `Blog Posts [id]` |
| `Products [id]` | `en`                 | `Products [en]`   |

The `_extractSheetName()` parser strips existing `[lang]` suffixes, so `Products [id]` → `Products` (base name).

---

## Translatable Columns

By default, only columns **checked** in the Translatable Columns setting are translated. Non-translatable columns are copied as-is.

```javascript
// Example: only "Name" and "Description" are translated
translatableColumns: "Name,Description";
```

Columns typically **not** translated:

- `UUID`, `timestamp`, `Email Address` (always skipped)
- `price`, `quantity`, `url`, `image` (numeric/technical fields)

---

## Developer Metadata

Each translation sheet carries two metadata keys:

| Key                  | Value           | Purpose                                       |
| -------------------- | --------------- | --------------------------------------------- |
| `IS_TRANSLATION_FOR` | Source sheet ID | Identifies which source sheet this translates |
| `TRANSLATION_LANG`   | Language code   | Identifies the target language                |

This metadata is used by `getHeaderAttributes()` to **exclude** translation sheets from form dropdowns and to set `hasTranslation: true` on source sheet headers.

---

## Querying Translated Data via API

Use the `lang` parameter to fetch translated data:

```bash
# Get English translations
curl "https://script.google.com/macros/s/{id}/exec?sheet=Products&lang=en"

# Get original data (no lang param)
curl "https://script.google.com/macros/s/{id}/exec?sheet=Products"
```

---

## Performance Notes

- **Batch translation**: On first creation, all rows are translated in a single matrix operation (not row-by-row)
- **Incremental sync**: Subsequent inserts/updates translate only the affected row
- **Translation sheets are hidden**: Users cannot accidentally edit them through the UI

---

## Next

- [Settings Reference](./SETTINGS_REFERENCE.MD) — all translation settings
- [REST API Reference](./REST_API.MD) — `?lang=` query parameter
