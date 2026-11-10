# File Upload

The CMS integrates with **Google Drive** for file storage. Files uploaded through forms or the API are stored in a dedicated Drive folder, renamed by their Drive ID for uniqueness, and returned as direct access URLs.

---

## How It Works

```
Client (browser)                      Server (Google Apps Script)
────────────────                      ───────────────────────────
Form submission with file
    │
    ├─► FileUploader widget reads file as base64
    │
    └─► google.script.run.insertTable()
          │
          ▼
       CORE.insertTable()
          │
          ├─► DataService.upsertRow()  ← stores file URL in sheet
          │
          └─► UploadService.uploadFiles(files, options)
                │
                ├─► Validate size (maxFileSize)
                ├─► Validate count (maxUpload)
                ├─► Decode base64 → Blob
                ├─► DriveApp.getFolderById(driveFolderId)
                ├─► folder.createFile(blob)
                ├─► file.setName("{fileId}.{ext}")  ← auto-rename
                └─► return download URL → saved to sheet cell
```

---

## Configuration

### In Settings Sidebar

| Setting           | Default                | Description                  |
| ----------------- | ---------------------- | ---------------------------- |
| **Max File Size** | 5 MB (`5242880` bytes) | Maximum single file size     |
| **Max Upload**    | `10`                   | Maximum files per submission |

### In `manifest.js`

```javascript
DEFAULT_SETTINGS: {
    maxFileSize: 5 * 1024 * 1024,  // 5 MB in bytes
    maxUpload: 10,
    driveFolderId: "",              // auto-created during setup
}
```

---

## Client-Side: FileUploader Widget

The `file-uploader.js` builder provides a drag-and-drop file picker styled with Semantic UI.

### Usage in Forms

When a header has `type: "file"`, the `ViewFactory` renders the `FileUploader` widget:

```json
{
  "type": "file",
  "title": "Attachment",
  "multiple": true,
  "config": {
    "style": "action"
  }
}
```

The widget:

- Reads files as **base64** (required for `google.script.run` transport)
- Validates file count against `maxUpload`
- Shows preview thumbnails and remove buttons
- Passes `{ name, mimeType, base64Data }` in the form submission

---

## Server-Side: UploadService

### `uploadFiles(files, options)`

Accepts an array of file objects, validates, and uploads each:

```javascript
// Internal flow
uploadFiles(files, options) {
    // 1. Validate count
    if (files.length > options.maxUpload) throw Error;

    // 2. Upload each file
    return files.map(f => uploadFile(f, options));
}
```

### `uploadFile(inputFile, options)`

```javascript
uploadFile(inputFile, options) {
    // 1. Validate size
    const fileSize = inputFile.bytes
        ? inputFile.bytes.length
        : Utilities.base64Decode(inputFile.base64Data).length;
    if (fileSize > options.maxFileSize) throw Error;

    // 2. Decode to Blob
    const blob = inputFile.bytes
        ? Utilities.newBlob(inputFile.bytes, inputFile.mimeType, inputFile.name)
        : Utilities.newBlob(Utilities.base64Decode(inputFile.base64Data), inputFile.mimeType, inputFile.name);

    // 3. Upload to Drive
    const folder = DriveApp.getFolderById(options.driveFolderId);
    const file = folder.createFile(blob);

    // 4. Rename (autoRename = true by default)
    const ext = inputFile.name.substring(inputFile.name.lastIndexOf("."));
    file.setName(`${file.getId()}${ext}`);

    // 5. Return download URL
    return createDownloadUrl(file.getId(), true);
}
```

---

## File Naming Convention

Uploaded files are renamed to `{driveFileId}.{originalExtension}`:

| Original Name  | Drive ID    | Stored Name  |
| -------------- | ----------- | ------------ |
| `photo.jpg`    | `1a2b3c...` | `1a2b3c.jpg` |
| `document.pdf` | `4d5e6f...` | `4d5e6f.pdf` |

This prevents name collisions and makes files uniquely identifiable.

---

## Download URLs

Files stored in the sheet cell as:

```
https://drive.google.com/uc?export=download&id={driveFileId}
```

The `createDownloadUrl()` helper generates this format for direct download access.

---

## Limits

| Limit                      | Value                       |
| -------------------------- | --------------------------- |
| Max file size              | Configurable (default 5 MB) |
| Max files per submission   | Configurable (default 10)   |
| Google Drive storage       | 15 GB (free Google account) |
| Apps Script execution time | 6 minutes per execution     |

---

## Security

- Files are stored in a **dedicated Drive folder** created during setup
- File names are replaced with Drive IDs (no original names exposed in URLs)
- Upload folder ID is stored in Script Properties (not in sheet cells)

---

## Next

- [Input Configuration](./INPUT_CONFIGURATION.MD) — configure `type: "file"` headers
- [Settings Reference](./SETTINGS_REFERENCE.MD) — `maxFileSize` and `maxUpload`
