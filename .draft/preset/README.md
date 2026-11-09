# Preset engine — draft

Stage A/B of the generator work (`plan.md` §5.1). This folder is intentionally
**outside** `packages/`: a preset engine is server-side logic, not an
`@aio-ui` package. When the shape settles we move it to `scripts/preset/` (or a
sibling orchestrator project) without rewriting it.

## Files

| File                | Purpose                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| `types.ts`          | `iWebPreset` v1, `PresetPlan`, `PresetIssue`, `PresetAsset`, bindings                                    |
| `catalogue.ts`      | data table: builder word → modules/styles; theme, adapter, input-module, capability maps                 |
| `plan.ts`           | `plan(preset)` / `assetsOf(preset)` — walks content, derives modules/bindings/refs/assets                |
| `parse.ts`          | `parsePreset()` / `assertPreset()` / `validatePages()` — shape + closed vocabulary                       |
| `ai.ts`             | AI output contract `iAiSiteContent` v1, `parseAiContent()`, `assemblePreset()`, `aiResponseSchema()`     |
| `emit.ts`           | `emitPlan()` → `{ links, importMap, table, bindings, moduleRefs }`; `createCdnResolver()` incl. prefixes |
| `runtime.ts`        | `emitRuntime()` → `index.html` + `app.js` (build-free, import map, registrations)                        |
| `generate.ts`       | `generateSite()` → the five-file website                                                                 |
| `scenarios.ts`      | two end-to-end flows built from the AI contract (`gallery-static`, `store-dynamic`)                      |
| `layout.mjs`        | scans the workspace → `layout.json` (`dir`, `entry`, `stylesRoot`, `bare`)                               |
| `layout.json`       | generated: 34 packages (incl. CSS-only `@aio-ui/styles`)                                                 |
| `prompt.content.md` | Gemini prompt; its builder list is locked to the catalogue by a test                                     |
| `fixtures.ts`       | two hand-written presets used by plan/emit tests                                                         |
| `*.test.ts`         | 83 tests across plan, parse, ai, emit, runtime, generate, prompt                                         |

## Run

```bash
npx vitest run .draft/preset        # tests (wired into the root vitest config)
npx tsc -p .draft/preset/tsconfig.json   # isolated typecheck
```

## Rules encoded here

1. **The AI never names a package.** It writes `pages`, `theme` and `data`
   intents; `plan()` reads `catalogue.ts` and decides. An unknown builder word
   becomes an `issue`, never a silently broken site.
2. **Signals only add.** Nothing is removed by a later page; a preset can only
   grow. "Is this complete" is a separate validation pass.
3. **Deterministic output.** Assets are merged per specifier, styles are
   de-duplicated and sorted, so two runs of the same preset are byte-identical —
   this is what lets the generator commit without diff noise.
4. **Styles belong to the package that owns the module.** `@aio-ui/form/Form`
   carries `Form.css`; `@aio-ui/input/Input` carries `input.css`. No sheet is
   attached twice.
5. **Two versions on the document.** `presetSchema` for the shape,
   `engine.resolved` for the exact framework release the site loads.
6. **The import map carries prefixes.** `"@aio-ui/utilities/"` → `…/utilities/dist/`
   is what makes a component's _own_ imports resolve in the browser; listing only
   the app's imports leaves the closure broken. `@aio-ui/utilities` has no bare
   export, so it is never a base asset.

## Physical output

`generate.test.ts` writes real sites to `.draft/results/`:

```
.draft/results/
  README.md
  gallery-static_v1/    preset.json  index.html  app.js  server/adapter.json  FLOW.md  dev/
  store-dynamic_v1/     same, plus dev/
```

The `dev/` folder is the same site as a Vite project: it resolves `@aio-ui/*`
from the workspace, so it runs **today**, before any release tag exists.

```bash
cd .draft/results/gallery-static_v1/dev && npx vite --port 5199
```

Stop the dev server before re-running the tests: `write()` deletes the result
folder, and a running Vite holds a lock on `dev/` (EBUSY on Windows).

`server/adapter.json` is the boundary between the two halves:

- `static: true` + empty `sources` → nothing to host but files;
- `sources[]` + a three-layer `cache` plan (browser `localStorage`, Apps Script
  `CacheService`, immutable CDN per tag) → the client's own `/exec` serves rows.

## What is proven today

- A static gallery preset loads **no** `form`, `input` or `message` package
  (the size drop the plan asks for is already visible in the asset list).
- A store preset pulls `router` + `http-service`, all four form adapters it
  declares, `dropdown`/`file-uploader`/`popover`/`controls`, the table bridge
  and `id-address` — and nothing else.
- `editor`, `color-theme`, `form-editor` (declared in the AST, unimplemented)
  are reported as issues by both `plan()` and `parsePreset()`.
- `parsePreset()` rejects: wrong `presetSchema`, unknown model/theme, page
  without id, route not starting with `/`, duplicate route, non-node page
  content, forms without `schema`, unknown builder words and field types the
  input layer cannot render.
- `parseAiContent()` applies the _same_ page rules to model output, so the AI
  cannot slip a builder past the catalogue; `assemblePreset()` keeps the
  orchestrator's `model`/`theme` even when the model echoes different ones.
- `emitPlan()` produces a sorted import map, a de-duplicated `<link>` list and
  a registry-shaped table; unresolvable specifiers land in `missing`.
- `prompt.content.md` lists exactly `Object.keys(BUILDER_CATALOGUE)` — a test
  fails if the catalogue grows and the prompt is not updated.
- `emitRuntime()` produces a self-contained pair: `index.html` with the import
  map and stylesheet links, and `app.js` that registers exactly the plan's
  bindings. A gallery preset's `app.js` contains no `form` registration and no
  `HttpService` import; a store preset registers the form with its sub-modules
  and never registers `dropdown`/`input` as page components.
- `layout.mjs` finds all 33 packages, including the scaffolded components whose
  `package.json` has no `""."` export.

## The AI contract in one line

The model returns `{ contentSchema: 1, site?, pages[], notes? }`. It never
supplies `id`, `engine`, `model`, `theme`, `data` or any package name: those are
facts the orchestrator owns, and `assemblePreset()` merges the two halves.

## Next (not here yet)

- **Browser smoke test**: `runtime.ts` output is asserted structurally but has
  not been served from a real CDN tag yet. Needs stage D (release + `registry.json`).
- **Retry loop**: feed `parsePreset()`/`parseAiContent()` issues back to the
  model verbatim (the prompt's SELF-CHECK is the human-readable half).
- **`layout.json` freshness**: regenerate in the release workflow (or assert it
  matches the workspace) so the map cannot describe a package that moved.
