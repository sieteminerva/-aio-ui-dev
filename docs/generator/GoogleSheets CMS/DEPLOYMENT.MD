# Deployment

How to deploy the CMS to Google Apps Script and get your API endpoint.

---

## Prerequisites

- A Google account
- The template spreadsheet copied to your Drive (see [Getting Started](./GETTING_STARTED.MD))
- [clasp](https://github.com/google/clasp) installed globally: `npm install -g @google/clasp`

---

## Development Workflow

### 1. Clone the Project Locally

```bash
git clone {repo-url}
cd google-sheet-cms
npm install
```

### 2. Login with clasp

```bash
clasp login
```

This opens a browser to authorize clasp to access your Apps Script projects.

### 3. Link to Your Spreadsheet

Open the spreadsheet, go to **Extensions → Apps Script**, copy the Script ID from **Project Settings**, then:

```bash
clasp clone {scriptId} --rootDir src-server
```

> This clones the existing server code so clasp knows which project to push to.

### 4. Edit and Build

```bash
# Develop UI locally with hot-reload
npm run dev

# Build for GAS deployment
npm run build
```

### 5. Push to Apps Script

```bash
clasp push
```

This uploads all `src-server/` files to the bound Apps Script project.

---

## Web App Deployment

### First-Time Deployment

1. After `clasp push`, open the spreadsheet
2. Go to **Extensions → Apps Script**
3. Click **Deploy → New deployment** (top right)
4. Select type: **Web App**
5. Configure:
   | Setting | Value |
   |---------|-------|
   | Description | `Production` (or version label) |
   | Execute as | `Me` (your Google account) |
   | Who has access | `Anyone` (for public API) or `Anyone with Google account` |
6. Click **Deploy**
7. **Copy the Web App URL** — this is your API endpoint

### Update Deployment

After pushing changes:

1. Go to **Extensions → Apps Script**
2. Click **Deploy → Manage deployments**
3. Click the pencil icon (✏️) on your deployment
4. Set version to **New version**
5. Click **Deploy**

> The URL stays the same — no need to update your frontend.

---

## API Endpoint URL

```
https://script.google.com/macros/s/{deploymentId}/exec
```

Test it:

```bash
curl "https://script.google.com/macros/s/{deploymentId}/exec?sheet=Posts"
```

---

## OAuth Scopes

The app requests these scopes (`appsscript.json`):

| Scope                     | Purpose                               |
| ------------------------- | ------------------------------------- |
| `script.external_request` | GViz API calls for data queries       |
| `drive`                   | File upload/download                  |
| `spreadsheets`            | Read/write sheet data                 |
| `script.container.ui`     | Custom menus and sidebars             |
| `userinfo.email`          | Record user email on form submissions |

---

## Build Commands

| Command             | Purpose                                            |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Vite dev server with hot-reload for UI development |
| `npm run build`     | Full GAS build: compile + wrap → `src-server/`     |
| `npm run build:gas` | Same as `npm run build`                            |
| `clasp push`        | Push `src-server/` to Apps Script                  |
| `npm run preview`   | Preview built output locally                       |
| `npm run docs`      | Generate JSDoc documentation                       |

---

## Production Checklist

- [ ] Run `npm run build` before pushing
- [ ] Set a strong `apiKey` in Settings
- [ ] Configure `maxFileSize` and `maxUpload` limits
- [ ] Set `debugMode` to `OFF` or `MINIMAL` (not `DATA`)
- [ ] Verify the `vars` sheet has correct `Exclude Sheets` / `Exclude Headers`
- [ ] Test GET, POST create, POST update, POST delete
- [ ] Verify translation is working (if enabled)
- [ ] Verify file uploads are working (if used)

---

## Common Issues

| Issue                                 | Solution                                                         |
| ------------------------------------- | ---------------------------------------------------------------- |
| "Script not found" on clasp push      | Re-clone with correct Script ID from Project Settings            |
| 401 on API calls                      | Check `apiKey` matches in Settings and request                   |
| Deployment URL returns HTML, not JSON | Ensure deployment is set to "Web App" type, not "API Executable" |
| "You do not have permission"          | Set "Who has access" to "Anyone" in deployment config            |

---

## Next

- [REST API Reference](./REST_API.MD) — full API documentation
- [Getting Started](./GETTING_STARTED.MD) — first-time setup
- [Troubleshooting](./TROUBLESHOOTING.MD) — more common issues
