# Getting Started

Have your CMS running in less than 3 minutes.

---

## Step 1: Copy the Template

Create your own copy of the CMS spreadsheet. This places the spreadsheet and all Apps Script files into your Google Drive:

> 👉 [**Click here to copy the template**](https://docs.google.com/spreadsheets/d/FILE_ID/copy)

This creates:

- A Google Sheet (your database)
- A bound Apps Script project (your server)
- Automatic Google Drive folder (your file storage)

---

## Step 2: Run the Setup

Once the spreadsheet loads, look for the custom menu in the toolbar:

> **📂 Google Sheets CMS → ⚠️ SETUP REQUIRED → Click to Configure**

The setup wizard automatically:

1. **Generates a Drive folder** — dedicated folder for file uploads
2. **Stores configuration** — writes `spreadsheetId`, `scriptId`, and default settings to Script Properties
3. **Creates the `vars` system sheet** — a configuration table with:
   - `Exclude Sheets` — sheets hidden from forms (pre-populated with `vars` and `Sheet1`)
   - `Exclude Headers` — columns hidden from forms (pre-populated with `UUID`, `timestamp`)
   - `Priority Level` — sheet ordering in the sidebar
4. **Pre-warms the cache** — scans all sheet headers and stores them for instant sidebar loading

After setup, the menu changes to:

> **📂 Google Sheets CMS → 📑 Forms → 📝 Input Data**

---

## Step 3: Create Your First Table

1. Rename `Sheet1` to `Posts` (or any name you prefer)
2. Add headers in row 1: `Title`, `Category`, `Content`
3. The system auto-creates a `UUID` column and `Timestamp` column automatically

---

## Step 4: Submit Your First Record

1. Open **📂 Google Sheets CMS → 📑 Forms → 📝 Input Data**
2. Select `Posts` from the sheet dropdown
3. Fill in the form fields
4. Click **Submit**

The record appears in your `Posts` sheet with auto-generated UUID and timestamp.

---

## Step 5: Make Your First API Call

Open the Settings sidebar and copy your Deployment URL + API Key, then:

```bash
curl "https://script.google.com/macros/s/{deploymentId}/exec?sheet=Posts&apiKey={your-api-key}"
```

Or continue to [REST API Reference](./REST-API.MD) for the full API documentation.

---

## Optional: Configure Settings

Navigate to **📂 Google Sheets CMS → ⚙️ Settings** to customize:

- **Auto-Translate** — pick source and target languages
- **Translatable Columns** — choose which columns to translate
- **Upload Limits** — set max file size and max upload count
- **API Key** — secure your API with a key (auto-generated)
- **Debug Mode** — `OFF`, `MINIMAL`, or `DATA` (includes console telemetry)

See [Settings Reference](./SETTINGS_REFERENCE.MD) for every option.

---

## Next Steps

- [REST API Reference](./REST_API.MD) — integrate with your frontend
- [Input Configuration](./INPUT_CONFIGURATION.MD) — customize form fields
- [Translation](./TRANSLATION.MD) — set up auto-translate for multilingual sites
- [File Upload](./FILE_UPLOAD.MD) — accept file attachments
- [Deployment](./DEPLOYMENT.MD) — deploy to production
