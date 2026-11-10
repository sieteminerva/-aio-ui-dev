# Troubleshooting

Common issues and how to fix them.

---

## Setup

### "⚠️ SETUP REQUIRED" still showing after setup

**Cause:** The `IS_CONFIGURED` flag in Properties may not have been written, or Properties may have been cleared.

**Fix:**

1. Run setup again: **📂 Google Sheets CMS → ⚠️ SETUP REQUIRED → Click to Configure**
2. If it still doesn't work, open **Extensions → Apps Script**, run `SetupService.execute()` manually from the editor
3. Check that `vars` sheet exists and has the correct structure (Exclude Sheets, Exclude Headers, Priority Level)

### Setup fails with "Deployment Failed"

**Cause:** Usually a permissions issue — the script hasn't been authorized.

**Fix:**

1. Run any function from the Apps Script editor (e.g., `onOpen`)
2. Accept the OAuth permissions dialog
3. Re-run setup

---

## Forms & Sidebar

### Sidebar opens but shows a blank page

**Cause:** Build artifacts may be stale or missing.

**Fix:**

1. Run `npm run build` to regenerate `src-server/library/` and `src-server/client/`
2. Run `clasp push` to upload the new artifacts
3. Reload the spreadsheet

### Forms show "Loading..." forever

**Cause:** Header cache may be corrupt or expired.

**Fix:**

1. Open **📂 Google Sheets CMS → 📑 Forms → 🔄 Refresh**
2. If that doesn't work, open Settings sidebar and save (this rewrites the header cache)
3. As a last resort, delete the `HEADERS` key from Script Properties via Apps Script editor

### Dropdown options not showing

**Cause:** Named Range may not exist or may be empty.

**Fix:**

1. Verify the Named Range exists in **Data → Named ranges**
2. Check that the Named Range contains values (not empty)
3. Ensure the Named Range name in the header note matches exactly (case-sensitive)

---

## API

### 401 "Unauthorized" on API calls

**Cause:** API key mismatch or not configured.

**Fix:**

1. Check your Settings sidebar for the `apiKey` value
2. Ensure the request includes `?apiKey=...` (URL) or `"apiKey": "..."` (body)
3. If no API key is set, remove the `apiKey` parameter from your requests

### API returns HTML instead of JSON

**Cause:** The web app deployment may be misconfigured.

**Fix:**

1. Go to **Extensions → Apps Script → Deploy → Manage deployments**
2. Ensure the deployment type is **Web App** (not API Executable)
3. Ensure "Who has access" is **Anyone**
4. Redploy if needed

### 404 "Sheet not found"

**Cause:** Sheet name doesn't exist or is a translation sheet.

**Fix:**

1. Verify the sheet name in your spreadsheet (case-sensitive)
2. Translation sheets (ending with `[lang]`) are excluded from API access — query the source sheet with `?lang=en` instead
3. Check that the sheet is not listed in `vars` → Exclude Sheets

---

## Translation

### Translation not working (no translation sheet created)

**Cause:** `autoTranslate` may be disabled, or language settings incomplete.

**Fix:**

1. Verify **Settings → Auto Translate** is ON
2. Set both `Default Language` and `Translation Language`
3. Select at least one column in **Translatable Columns**

### Translation sheet has wrong column order

**Cause:** Headers may have been added to the source sheet after the translation sheet was created.

**Fix:**

1. Delete the translation sheet (e.g., `Products [en]`)
2. Submit a new record — the translation sheet will be recreated with correct headers

---

## File Upload

### File upload fails with size error

**Cause:** File exceeds `maxFileSize` limit.

**Fix:**

1. Go to Settings and increase `maxFileSize` (in bytes, default is 5242880 = 5 MB)
2. Note: Google Apps Script has a 50 MB request limit

### Upload folder not found

**Cause:** `driveFolderId` may be incorrect or the folder was deleted.

**Fix:**

1. Re-run setup — it creates a new Drive folder and updates `driveFolderId`
2. Check that the Google account has Drive access

---

## Build

### `npm run build` fails

**Cause:** Dependencies not installed or build config mismatch.

**Fix:**

1. Run `npm install` to install dependencies
2. Check `build.config.json` for correct file paths
3. Ensure all `files` entries in `build.config.json` point to existing source files

### `clasp push` fails with auth error

**Cause:** clasp login expired.

**Fix:**

1. Run `clasp login` to re-authenticate
2. Verify `.clasp.json` points to the correct Script ID

---

## Data Integrity

### Row not found for update/delete

**Cause:** The `UUID` in the request doesn't match any row, or the property identifier column name doesn't match.

**Fix:**

1. Verify the `UUID` exists in the sheet
2. Check that `propertyIdentifier` in Settings matches your column header (default: `UUID`)

### Metadata not updating (totalRows/totalColumns stale)

**Cause:** `updateSheetMetadata` may have failed silently due to developer metadata quota.

**Fix:**

1. This was fixed in the latest version — developer metadata errors no longer block Properties persistence
2. Update to the latest code and rebuild

---

## Still Stuck?

For server-side debugging:

- Set `debugMode` to `DATA` in Settings
- Check **Extensions → Apps Script → Executions** for error logs
- Check the browser console (F12) for client-side telemetry logs

For build issues, see [Build System](./BUILD.MD).
