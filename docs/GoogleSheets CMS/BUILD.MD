# Apps Script Build System

This project uses a single GAS-oriented build pipeline. The source of truth is `build.config.json`, and the build is executed by the custom Vite plugin in `apps-script.build.plugin.js`.

The goal is simple:

- edit source only in `src-client`
- generate Apps Script artifacts into `src-server`
- keep server template/runtime code in `src-server/template`
- avoid a separate postbuild include step

## What The Build Produces

Running `npm run build` generates:

- `src-server/library/*.html`
- `src-server/client/*.html`
- `src-server/.build-manifest.json`
- `src-server/include.js`

The generated HTML files are Apps Script partials. The include helper is generated automatically and no longer needs `include.postbuild.js`.

## Build Command

```bash
npm run build
```

This runs:

```bash
vite build --mode gas
```

There is no separate library/public build in the current setup.

## How The Plugin Works

`apps-script.build.plugin.js` does the following:

- reads `build.config.json`
- bundles the selected source files
- converts JavaScript chunks to `<script>...</script>` HTML partials
- converts CSS assets to `<style>...</style>` HTML partials
- empties the generated output folders before writing new files
- scans the source import graph to trace file dependencies
- generates the `build manifest` and `include.js`

The dependency scan replaces manual ordering. Files are emitted in dependency order, so helper files load before the files that depend on them.

## Configuration

`build.config.json` has three main parts:

- `paths` for root locations
- `libraries` and `clients` for output grouping
- `files` for source entries and optional per-file output overrides

### Example

```json
{
  "name": "library",
  "minify": false,
  "comments": false,
  "preserveModules": true,
  "format": "es",
  "htmlOutput": true,
  "singleFileOutput": false,
  "paths": {
    "sourceRoot": "src-client",
    "outputRoot": "src-server",
    "manifestFile": ".build-manifest.json",
    "includeFile": "include.js"
  },
  "libraries": {
    "sourceMatch": ["builders/"],
    "dist": "library"
  },
  "clients": {
    "sourceMatch": ["pages/", "page-", "script.js", "style.css"],
    "dist": "client"
  },
  "files": [
    { "src": "src-client/builders/helper.js" },
    { "src": "src-client/builders/form-builder.js" },
    { "src": "src-client/script.js" },
    { "src": "src-client/page-forms.js" },
    { "src": "src-client/pages/FormsPageController.js" },
    { "src": "src-client/pages/shared/BasePageController.js" }
  ]
}
```

## `paths`

- `sourceRoot` is the root that contains the source tree, usually `src-client`
- `outputRoot` is the generated Apps Script tree, usually `src-server`
- `manifestFile` is the generated manifest file name inside `outputRoot`
- `includeFile` is the generated include helper file name inside `outputRoot`

These values are the base paths used by the plugin. They should stay consistent across projects.

## `libraries` And `clients`

These objects define the two output groups at the top level.

- `sourceMatch` tells the plugin which source files belong to the group
- `dist` tells the plugin where to place the generated files under `outputRoot`

There is no manual ordering property anymore. The plugin uses traced dependencies instead.

## `files`

`files` is the list of source files the plugin should bundle.

Each item can be:

- a string source path
- an object with `src`
- an object with `src` and `dist`
- an object with `src` and `outDir`

`dist` or `outDir` on a file entry overrides the group destination for that file. This is useful when one file needs to be placed in a special folder.

Example override:

```json
{
  "src": "src-client/pages/shared/BasePageController.js",
  "dist": "src-server/client/Controllers/"
}
```

If a file uses an explicit destination, the build cleanup also includes that destination.

## Dependency Resolution

The plugin traces dependencies from the actual source import graph.

It detects:

- relative `import` statements
- relative `export ... from` statements
- same-stem CSS sidecar files, for example `file-uploader.js` and `file-uploader.css`

This means the build can order generated files without a manual order list in the config.

## Server View Libraries

`src-server/manifest.js` is the server-side source of truth for page routing.

Each view defines a `LIBRARIES` array, for example:

```js
VIEWS: {
  FORM_INPUT: {
    NAME: "forms",
    TEMPLATE_FILE: "template/index",
    LIBRARIES: ["header-builder.js", "form-builder.js"],
  },
  FORM_EDITOR: {
    NAME: "input-config",
    TEMPLATE_FILE: "template/index",
    LIBRARIES: ["header-builder.js", "form-builder.js", "accordion-builder.js"],
  },
  SETTINGS: {
    NAME: "settings",
    TEMPLATE_FILE: "template/index",
    LIBRARIES: ["header-builder.js", "form-builder.js", "tab-builder.js"],
  },
}
```

You can provide library names with or without the `.js` extension when calling `includeBuildFiles`.

## Template Integration

`src-server/Services/GUIService.js` uses:

```js
includeBuildFiles("library", VIEW_CONFIG.LIBRARIES);
includeBuildFiles("client");
```

The mandatory runtime glue stays in `src-server/template/script.html` and is included directly from `src-server/template/index.html`.

## Output Layout

Default output:

```txt
src-server/
  library/
  client/
  .build-manifest.json
  include.js
  template/
```

## Adding A New File

1. Create the source file in `src-client`.
2. Import it from the appropriate entry file.
3. Add the file to `build.config.json` under `files`.
4. If it belongs to a view, add it to the view `LIBRARIES` list in `src-server/manifest.js`.

The build will trace its dependencies automatically.

## Adding A New View Library

If you want a new library type for `VIEWS[*].LIBRARIES`:

1. add the source file under `src-client/builders`
2. import its dependencies normally in the source
3. add the file to `build.config.json.files`
4. reference it in `src-server/manifest.js`

You do not need to update a hardcoded dependency catalog in the build.

## Notes

- `include.postbuild.js` is no longer part of the flow
- `npm run build` is the only build command you need for GAS output
- manual ordering in `build.config.json` is not needed anymore
- dependency order comes from the source graph
- explicit `dist` / `outDir` overrides are still supported for individual files

## 🏗️ Build Pipeline (Vite + apps-script.build.plugin.js)

### How It Works

```
┌────────────────────────────┐
| npm run build (--mode gas) |
└─────────────┬──────────────┘
              ▼
┌────────────────────────────┐
|       vite.config.js       |
└────┬───────────────────────┘
     └─► createAppsScriptConfig()
          ├─► outDir: ".vite-temp"
          ├─► esbuild: drop ["console", "debugger"]
          └─► plugins: [AppsScriptBuildPlugin(buildConfig)]
                                   ∣
┌─────────────────────────────┐    ∣
|       build.config.json     | ⯇─┘
└─────┬───────────────────────┘
      |  {
      |    minify: false,
      |    preserveModules: true,
      |    format: "es",
      |    htmlOutput: true,
      |    singleFileOutput: false,
      |    tempDir: ".vite-temp",
      |    groups: {
      |      library: {
      |                 sourceMatch: ["builders/"],
      |                 dist: "library"
      |               },
      |      client:  {
      |                 sourceMatch: ["pages/", "page-",
      |                               "ClientConfig.js", "style.css"],
      |                 dist: "client"
      |               }
      |    },
      |    files: [ /* 20+ entry files from src-client/ */ ]
      ▼  }
┌────────────────────────────┐
|   AppsScriptBuildPlugin    |
└─────┬──────────────────────┘
      ├─► 1. Rolldown builds each file entry as a separate ES module chunk
      │      Output: .vite-temp/*.js, .vite-temp/*.css
      │
      ├─► 2. writeBundle hook:
      │      ├─► Strips import/export statements (GAS has no module system)
      │      ├─► Groups output by build group (library vs client)
      │      │     library/  ← builders/* →  src-server/library/*.js.html
      │      │     client/   ← pages/*, page-*, ClientConfig.js, style.css
      │      │                            →  src-server/client/*.js.html
      │      │                            →  src-server/client/style.css.html
      │      ├─► Wraps JS in <script>…</script>, CSS in <style>…</style>
      │      └─► Writes to src-server/ mirroring source structure
      │
      └─► 3. Generate include.js (runtime file index)
              ├─► BUILD_INCLUDES — ordered file lists per group
              ├─► BUILD_FILE_INDEX — basename → relative path lookup
              ├─► FILE_DEPENDENCIES — full transitive import graph
              ├─► include(filePath) → reads file, wraps in <script>/<style>
              ├─► resolveFiles() → topological sort + dedup
              └─► includeBuildFiles() → renders scripts+styles for a view
```

### File Lifecycle (Before → After Build)

```
          src-client/            ||               src-server/
─────────────────────────────────────────────────────────────────────────────────────
builders/                            library/
  helper.js                     ───►    helper.js.html       (<script>…</script>)
  accordion-builder.js          ───►    accordion-builder.js.html
  input-builder.js              ───►    input-builder.js.html
  form-builder.js               ───►    form-builder.js.html
  file-uploader.css             ───►    file-uploader.css.html  (<style>…</style>)
  ...                                  ...

pages/                               client/
  FormsPageController.js        ───►    Controllers/FormsPageController.js.html
  InputConfigPageController.js  ───►    Controllers/InputConfigPageController.js.html
  SettingsPageController.js     ───►    Controllers/SettingsPageController.js.html
  ViewFactory.js                ───►    Controllers/ViewFactory.js.html
  BasePageController.js         ───►    Controllers/BasePageController.js.html

ClientConfig.js                 ───►    ClientConfig.js.html
page-forms.js                   ───►    page-forms.js.html
page-input-config.js            ───►    page-input-config.js.html
page-settings.js                ───►    page-settings.js.html
style.css                       ───►    style.css.html

**Also generates:**
  src-server/include.js           ← BUILD_INCLUDES, BUILD_FILE_INDEX, include() etc.
  src-server/.build-manifest.json ← full manifest of every generated file
```

### Runtime Inclusion (include.js)

At serving time, `GUIService._prepareTemplate()` calls `includeBuildFiles(groupName, filterFn)` which:

1. Looks up `BUILD_INCLUDES["client"]` or `BUILD_INCLUDES["library"]`
2. For each file path, calls `include(filePath)` which reads the `.html` artifact
3. Returns the combined `<script>` / `<style>` tags injected into `index.html`

```javascript
// Example include.js output:
const BUILD_INCLUDES = {
  "client":  ["client/ClientConfig.js", "client/Controllers/ViewFactory.js", ...],
  "library": ["library/helper.js", "library/accordion-builder.js", ...],
  "unified": [/* merged */],
};

function includeBuildFiles(group) {
  return BUILD_INCLUDES[group]
    .map(f => include(f))
    .filter(Boolean)
    .join('\n');
}
// → in template: <?= includeBuildFiles('library') ?>
// → in template: <?= includeBuildFiles('client') ?>
```

### Build Modes

| Command         | Mode         | Purpose                                                                    |
| --------------- | ------------ | -------------------------------------------------------------------------- |
| `npm run dev`   | _(default)_  | Vite dev server — hot-reloads src-client for UI development with mock data |
| `npm run build` | `--mode gas` | Full GAS build: compiles src-client → wraps → outputs to src-server/       |

### Build Plugin Internals

```

┌─────────────────────────────────┐
|   apps-script.build.plugin.js   |
└───┬─────────────────────────────┘
    ├── AppsScriptBuildPlugin(config, overrides)  → returns Vite Plugin
    │   ├── config(userConfig)  hook
    │   │     ├─► Sets build.lib.entry from buildConfig.files
    │   │     ├─► Configures preserveModules / manualChunks
    │   │     └─► Redirects outDir to tempDir (default: .vite-temp)
    │   │
    │   └── writeBundle(options, bundle)  hook
    │         ├─► emptyGeneratedOutputDirs() — cleans old artifacts
    │         ├─► For each chunk/asset in bundle:
    │         │     ├─► Detect group (library vs client) from source file path
    │         │     ├─► Strip imports/exports
    │         │     ├─► Wrap in <script> / <style>
    │         │     └─► Write to resolved target dir
    |         │
    │         ├─► createBuildManifest() — builds index of written files
    │         └─► writeBuildArtifacts() — writes include.js + .build-manifest.json
    │
    ├── loadBuildConfig()              — reads build.config.json
    ├── mergeBuildConfig()             — shallow-deep merge of config overrides
    ├── createBuildContext()           — resolves paths, groups, dependency graph
    ├── collectSourceDependencyGraph() — parses import/export from source files
    ├── normalizeGroupConfig()         — resolves sourceMatch patterns → dist mapping
    ├── resolveTargetDistDir()         — maps source file path → output directory
    └── emptyGeneratedOutputDirs()     — wipes old output before rebuild
```
