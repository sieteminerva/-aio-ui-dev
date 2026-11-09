# AIO UI Framework — plan

Single tracking document. **Only open work lives here**; the system guide is
`.guidance/RAJUTAN.md`; what already landed is in `git log`
(one commit per decision, each naming its evidence) and in the architecture docs under `docs/`.

Last updated: 2026-11-10

---

## 1. Objective

Two layers, one source of truth:

1. **`@aio-ui/*`** — a monorepo framework whose components are independently installable,
   rendered by one registry, styled by lazily-loaded stylesheets, and built as real packages
   (`dist` JS + `.d.ts`). The form family is the reference implementation: it owns its
   engines, composes sub-modules through a manifest, and runs without the app.
2. **Webapp generator** — a wizard (`docs/presentation0.md`) that turns a business profile
   into an AI-generated site definition, then emits **a preset**: the exact subset of
   components, modules, styles and data sources that one generated website needs. The user
   keeps editing content in Google Sheets; the generator never keeps access.

The preset is the contract between AI output, the Sheets CMS, and this framework.

## 2. Constraints

- **TypeScript ~6.0** with `verbatimModuleSyntax`, `erasableSyntaxOnly`, `noUnusedLocals/Parameters`.
- **Vite 8 / rolldown** for the examples; `lightningcss` for sheets.
- **npm workspaces**: `packages/*`, `packages/components/*`, `packages/modules/*`,
  `packages/themes/*`, `examples/*`.
- **Boundaries are mechanical** (`scripts/bounds.mjs`): package edges follow the dependency
  graph, every deep import resolves through the target's `exports` map.
- **A capability lives in a module; a component only renders.** No builder imports its own CSS.
- **Zero-cost infrastructure**: Apps Script (CMS + orchestrator), static hosting (Pages/CDN),
  no server we operate.

## 3. Decisions already made

| Area           | Decision                                                                                                                                                                                                                                                                                |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package layout | One package per component; sub-modules are subpaths of their owner, not packages — every `exports` subpath names one file.                                                                                                                                                              |
| Module sets    | `*_DEFINITIONS` (live definitions) + `*_MANIFEST` (refs, `scope: "form" \| "input"`); a nesting component partitions by id.                                                                                                                                                             |
| Styling        | One sheet per owner, injected once through `@aio-ui/core/Stylesheets`; field styling lives in `@aio-ui/input/input.css`, form chrome in `Form.css`.                                                                                                                                     |
| Tokens         | Declared once at `:root` (+ `[data-theme]`, where themes put `--app-*`), never per `.field`.                                                                                                                                                                                            |
| IdAddress      | Adapter-based: `native`, `aio`, `base`, opt-in via `config.address.useAdapter`. The Apps Script backend was rewritten (`.archives/idAddress-AppsScript/`): metadata-driven columns, OAuth instead of public sheets, query cache, same HTTP contract.                                    |
| Animations     | One uniform contract: `AnimationBehaviour<Options>` with `animate({ node, options, delay, signal, stopped, done })`, resolved through a registry, not a `switch`. Cancellation is an `AbortController` per run.                                                                         |
| Form messages  | Every user-facing sentence resolves through `iFormConfig.messages` (`category` → `slot` → `code`), with template strings for JSON/CMS config and functions for dynamic cases. Defaults preserve the previous wording exactly. Calculation failures report once per changed failure set. |
| Data contract  | Server responses are always `{ statusCode, success, message, data, meta? }` (`docs/GoogleSheets CMS/REST_API.MD`). The wizard's build result is `{ status, meta, data: { sheet, repo, live, guide, message } }`.                                                                        |
| Publish        | `tsc` per package to `dist`, `exports` conditional: `development` → source, `types`/`default` → `dist`. Built in dependency order by `scripts/build-pack.mjs`.                                                                                                                          |

## 4. Big picture: from wizard to preset to site

```
wizard (form)  ──▶  Apps Script orchestrator  ──▶  Gemini (content + preset)
    │                       │                            │
    │                       ▼                            ▼
    │              duplicate Sheets template      AI writes JSON: pages,
    │              + inject content              components, data sources
    ▼                       │                            │
 preset.json ◀──────────────┴────────────────────────────┘
    │
    ▼
 @aio-ui/preset  ──▶  modulesFor / componentsFor / assetsOf  ──▶  generated app
                                                                  (import map or bundle)
```

### 4.1 Input object contract (Apps Script ↔ `@aio-ui`)

The two sides already speak the same shapes; the preset must reuse them, not invent a third.

| Direction       | Shape                                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------------------- | ---- | --------- | --------- | ------------------------------------------------------------------------ |
| Content AST     | `iBasicNode[]` / `iNodeContent` with token keys: `#id`, `.class`, `tag`, `>child` (`docs/DOMRenderer.md`) |
| Builder payload | `{ builder, content }` or `{ builder: "form", config, schema }`; the wizard sends exactly this            |
| Server → client | `{ statusCode, success, message, data, meta? }`; `data` is the payload, `meta` carries pagination links   |
| Build result    | `{ status: "success" \| "partial" \| "error", meta, data: { sheet, repo, live, guide, message } }`        |
| Sheet rows      | Column titles are the field ids (`snake_case`); `GET /exec?sheet=…&page&limit&sortBy&order&category&lang` |
| Address levels  | `?level=propinsi                                                                                          | kota | kecamatan | kelurahan | kodepos&parentId`, `?level=detail&kodepos`, `?level=geocode` — unchanged |

### 4.2 What a preset is

Data, not code. One JSON document per generated site:

```ts
interface iWebPreset {
  id: string; // slug
  presetSchema: 1; // document shape; bumped only when the parser changes
  /** Framework release this site was generated against (§5.4.6). */
  engine: { range: string; resolved: string };
  model: "gallery" | "profile" | "store" | "blog"; // §4.4
  theme: string; // "default" | "cyberpunk" | …
  site: { name: string; locale: string; domain?: string };
  pages: Array<{ id: string; route: string; content: iNodeContent }>;
  /** Capabilities the pages actually use — derived, never hand-listed. */
  modules: Array<{ id: string; path: string; scope?: string }>;
  components: string[]; // "@aio-ui/article", "@aio-ui/product", …
  /** One entry per package: JS specifier + stylesheet specifiers. */
  assets: Array<{ specifier: string; styles: string[] }>;
  data: Array<{ id: string; sheet: string; endpoint: string; params?: Record<string, unknown> }>;
  wizard: { answers: Record<string, unknown>; generatedAt: string };
}
```

Derivation rules live in code and are tested; the AI only writes `site`, `pages`, `theme`, and
`data` intents. `modules`, `components` and `assets` are **computed** from `pages` — same
reasoning as `*_MANIFEST`: a manifest states intent, ids decide.

### 4.3 Capability map (the table stage A has to freeze)

Every row is a signal found in `pages`, and what it drags in. Nothing is hand-listed by the AI.

| Signal in the preset                                                                                                                                                                         | Added                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| _(always)_                                                                                                                                                                                   | `base`, `core` (stylesheets), `utilities`, `theme`, one `theme-*` package |
| more than one page / non-hash routing                                                                                                                                                        | `router`                                                                  |
| any `data[]` entry                                                                                                                                                                           | `http-service`                                                            |
| any `animation="…"` attribute                                                                                                                                                                | `animations`                                                              |
| page/component events are enabled                                                                                                                                                            | `event-emitter`                                                           |
| builder word in content (`section`, `article`, `product`, `pricingcard`, `carousel`, `masonry`, `accordion`, `tab`, `menu`, `fabmenu`, `footer`, `badge`, `rating`, `modal`, `modeswitcher`) | that component + its stylesheet                                           |
| `builder: "form"`                                                                                                                                                                            | `form` + `input` + `validation` adapter (+ `Form.css`, `input.css`)       |
| form field `type: "dropdown"` / `"file"` / `config.popover` / `actions`                                                                                                                      | input module `dropdown` / `file-uploader` / `popover` / `controls`        |
| `config.address` on a form                                                                                                                                                                   | `id-address` + `id-address/adapter.aio`                                   |
| a group carrying `table`                                                                                                                                                                     | `table` + `table/adapters/FormAdapter`                                    |
| submit feedback expected                                                                                                                                                                     | `message` + `message/adapters/FormAdapter`                                |
| `multistep: true` / `cascading: true` / `calculation: true`                                                                                                                                  | the matching `form` adapter module                                        |

Two rules make the map usable: a signal only ever **adds**, never removes (validation of
"is this complete" is a separate pass), and each row must be expressible as data, so the same
table can drive the runtime asset map and the release manifest.

### 4.4 Webapp models

A model is a preset template: the page skeleton, the wizard questions, and the AI prompt that
together produce a preset. Ship few and finish them.

| Model     | Pages                                  | Extra capabilities                         |
| --------- | -------------------------------------- | ------------------------------------------ |
| `gallery` | home, item list, item detail, about    | masonry, carousel, modal, animations       |
| `profile` | home, services, contact, portfolio     | section, article, fabmenu, message         |
| `store`   | home, catalog, product, cart, checkout | product, pricingcard, form, table, message |
| `blog`    | home, post list, post, about           | article, menu, pagination                  |

The wizard in `.archives/wizard.ts` is the `store` flow; `examples/gallery` is the `gallery`
model, not the generator itself.

## 5. Remaining work

### 5.1 Preset engine (new, highest value) — **server side, not a package**

`packages/*` keeps shipping only `@aio-ui` packages. The engine lives with the generator
(`scripts/preset/` in this repo, or a dedicated orchestrator project), because it is build-time
logic that also calls the GitHub API to assemble a site repository.

- 5.1.1 **Preset schema + validator** (`iWebPreset` v1): `parse()` refuses unknown component
  ids and unknown builder words, so an AI hallucination fails at the generator, never in a
  client's browser.
- 5.1.2 **`plan(preset)` derivation**: implements §4.3 as a data table (signal → adds), with
  one test per row. No `if` chains.
- 5.1.3 **`assetsOf(preset)`** — emits the asset map the host currently writes by hand in
  `examples/*/src/registry.assets.ts`; also emits the `<link>` list and the import map.
- 5.1.4 **Assembly via GitHub API** (server side): create the site repo from a template
  (`POST /repos/{template}/generate`), commit `preset.json` + `index.html` + `app.js` +
  `styles.css` through the Contents API, then enable Pages. Apps Script cannot run
  `tsc`/Vite, so "assembly" is **selection + file writing**, never compilation.
- 5.1.5 **Build-free runtime template** (§7.5): `index.html` with an import map + `app.js` that
  fetches `preset.json`, registers only the listed components, then renders `preset.pages`.
  A preset without a build step is the only shape that works on zero-cost static hosting.
- 5.1.6 **Wizard hand-off**: the orchestrator returns `data.preset` alongside
  `sheet/repo/live/guide`; the wizard renders `preset.pages` instead of a hardcoded page list.

### 5.2 Docs and cleanliness

- `docs/FIELD-TYPES.md` is out of sync with `packages/components/input/FieldTypes.ts`.
- Dead `console.log`, commented-out blocks and mojibake left in adapters.
- `Form.css` audit (chrome-only now; verify nothing field-level survived).
- `docs/GoogleSheets CMS/ARCHITECTURE.MD` is empty (0 lines) — fill or delete.

### 5.3 Decided but not implemented

- **IdAddress payload names.** `beforeSubmit` maps `<level>_name` → `<level>`, while the demo
  names controls `address-<level>`: ids land in the payload, resolved names do not. Pick one
  convention, then the adapter follows it.
- **Multistep notices.** `messages.multistep.*` exists in config but nothing emits it; decide
  whether step navigation should speak or stay silent (validation already covers it).

### 5.4 Publishing and on-demand install (no npm)

Decided direction: **GitHub as the only origin**, two doors from one build.

- 5.4.1 **Semver for real.** ✅ Fixed versioning at `0.1.0` via `scripts/version.mjs`;
  `version:check` runs inside `verify`. Undo with `git restore packages package.json`.
- 5.4.2 **Release pipeline.** ✅ local half: `scripts/release.mjs` writes 34 tarballs +
  `registry.json` + `layout.json` + `checksums.txt` into `.draft/release/v<ver>/`
  (dry-run by default). ⏳ GitHub Actions on tag still to write; it uploads that folder.
- 5.4.3 **Import-map build target** for the generator: an ESM build whose CSS imports are
  stripped, so a page can be served with
  `{"imports": {"@aio-ui/form": "https://cdn.jsdelivr.net/gh/<owner>/<repo>@vX/…/Form.js"}}`
  plus `<link rel="stylesheet">` from the asset map. Today `dist/*.js` keeps
  `import "./Form.css"`, which a browser cannot load as JS.
- 5.4.4 **Host asset maps generated, not hand-written.** One entry per manifest `path` today;
  `ComponentRegistry.loadModule` only warns when missing, so a typo silently falls back to the
  built-in preset. Derive loaders from `import.meta.glob` or generate a virtual module.
  `scope` must never be derived — it is a component decision.
- 5.4.5 **Scope vs repo owner.** `github.com/sieteminerva/rajutan` ≠ `@aio-ui/*`. Irrelevant for
  tarball/CDN installs; only GitHub Packages would require renaming the scope. Keep the scope.
- 5.4.6 **Pin what a site was built with.** Every preset carries
  `engine: { range: "^0.1.0", resolved: "0.1.3" }`. The generator resolves the range once and
  stores both: `resolved` is what the runtime loads (exact URLs, so a later release never
  breaks a live site), `range` documents the intent for a deliberate regeneration. In 0.x a
  minor bump is treated as breaking.

### 5.5 Known limits, deliberately deferred

- **Node ESM.** `tsc` does not rewrite relative imports, so emitted JS is extensionless
  (`import "./FormLayout"`): consumers must be bundlers. Full support means
  `moduleResolution: node16` plus `.js` extensions in every source import.
- **Apps Script cold start** (2–5 s on the first idle call) cannot be removed from the script;
  only the repeat cost is cached. The generator's first paint must not depend on it.
- **Fase 7-22 (optional).** `cascade`/`multistep`/`validation`/`calculation` could become
  installable packages instead of subpaths of `@aio-ui/form`.

## 6. Execution stages

Each stage ends at a gate: `npm run verify` plus the named evidence.

| Stage                   | Deliverable                                                                                                           | Evidence                                                              |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **A. Contract freeze**  | `iWebPreset` types + capability table (content → modules/components/assets) + AI output contract                      | Reviewed table; no code yet                                           |
| **B. Preset engine**    | `plan(preset)`, `assetsOf(preset)`, `parsePreset()`/`parseAiContent()`, `emitPlan()`; tests for every derivation rule | Unit tests: a form page pulls form+input, a static page pulls neither |
| **C. Generator wiring** | Orchestrator returns `data.preset`; wizard renders `preset.pages`; `registry.assets.ts` replaced by generated map     | Demo renders a preset-shaped page; asset map equality test            |
| **D. Delivery**         | Semver bump, release workflow, import-map target, `registry.json`                                                     | One real tag installable both as tarball and via import map           |
| **E. Hardening**        | Docs sync, dead code, IdAddress naming, multistep messages                                                            | `verify` green; docs match code                                       |
| **F. Optional**         | Per-feature packages if a consumer needs one behaviour alone                                                          | A package installed without `@aio-ui/form`                            |

Order matters: A → B is what makes C cheap; D can run in parallel with B once A is frozen.

**Where we are (2026-11-10): stage B complete in draft, stage C/D next.**
`.draft/preset/` now holds: `types.ts` (`iWebPreset` v1), `catalogue.ts` (the capability
table), `plan.ts` (`plan`/`assetsOf` → modules, bindings, moduleRefs, assets), `parse.ts`
(`parsePreset`/`assertPreset`, shape + closed vocabulary), `ai.ts` (AI output contract
`iAiSiteContent` v1 + `parseAiContent`/`assemblePreset`/`aiResponseSchema`), `emit.ts`
(`{ links, importMap, table, bindings, moduleRefs }` + `createCdnResolver` + prefix map), `runtime.ts`
(`index.html` + `app.js`, build-free), `layout.mjs` → `layout.json` (34 packages) and
`prompt.content.md` (whose builder list a test keeps in lockstep with the catalogue).
83 draft tests; whole suite 412/45. `.draft/results/` now holds two generated sites
(`gallery-static_v1`, `store-dynamic_v1`), each with `preset.json`, `index.html`, `app.js`,
`server/adapter.json` and `FLOW.md`. Not verified in a browser yet: serving needs a real
tagged release (stage D). The framework side is ready; the generator side is still a mock
(`mockBuildResult()` in `.archives/wizard.ts`).

## 7. Decisions from the 2026-11-10 review

1. **Preset engine is server-side.** Not a `@aio-ui` package: `packages/*` only ships framework
   packages. It lives with the generator (`scripts/preset/` here or a sibling orchestrator
   project) and may be _imported_ by a package only if a runtime ever needs the validator.
2. **Derivation is code, assembly is server logic.** The AI writes `pages`/`theme`/`data`
   intents; the server derives modules/components/assets (§4.3) and calls the GitHub API to
   create the site repo. The AI never names a package.
3. **Versioning: schema version + resolved engine version.** `presetSchema: 1` for the document
   shape; `engine.resolved` for the exact framework release the site was generated against
   (§5.4.6). Regeneration is explicit, never automatic.
4. **The app shell is generated from the preset, not a fixed template.** The _shape_ is a
   template (build-free `index.html` + `app.js` + `styles.css` + `preset.json`), but its
   contents — pages, component registrations, import map, stylesheet links — come from the
   preset. Gallery/profile/store/blog (§4.4) differ only by preset, not by code.
5. **Build-free is a hard constraint.** Apps Script cannot run `tsc`/Vite, so the generated
   site must work without a build step. A Vite template can remain as an _option_ for users
   who later want to edit locally, never as a requirement.

### Still open

- **Do we accept a first paint that fetches `preset.json`?** Build-free can still inline the
  preset into `app.js` at generation time (no fetch, one more API call on GitHub). Inline is
  faster and works offline; a separate file is easier to regenerate. Proposal: inline by
  default, keep `preset.json` beside it as the source of truth.
- **Wizard placement.** `.archives/wizard.ts` (store flow) is the reference; the generator's
  own wizard UI still needs a home (separate repo or `examples/generator`).

## 8. Verification gate

`npm run verify` = `build:pkgs` (33 packages, dependency-ordered, `dist` + `.d.ts` + copied
CSS) → typecheck → `check:bounds` → `test` → examples build. Current: **413 tests / 45 files**,
boundaries clean, both builds green. Browser claims are measured (`getBoundingClientRect`,
`getComputedStyle`, DOM counts), not eyeballed.

## Target selanjutnya (urutan yang saya sarankan)

1. Perbaiki form di situs store — bug yang tertangkap browser: <div id="checkout-form"> kosong. Ini satu-satunya lubang fungsional di jalur generator. Gate: halaman store-dynamic_v1/dev menampilkan form (fieldset + field) tanpa error console.
2. Schema content final (Sheets ↔ @aio-ui) — yang kamu sebut belum didesain. Konkret: satu tabel per model (products, posts, orders), kolom → tipe field, aturan validasi, dan batasan messages. Gate: model store lengkap satu siklus — sheet nyata → /exec → HttpService → komponen menampilkan baris.
3. Release workflow GitHub — tag v0.1.0 → verify → release.mjs → unggah 37 aset. Gate: satu tag bisa dipakai dua cara (tarball & import map).
4. Smoke test build-free di browser memakai tag nyata — menutup klaim "build-free" yang sekarang hanya diuji struktural.
5. Batch kebersihan dokumen (tiga item di atas).

mulai dari #1 (form store) karena itu paling cepat memberi sinyal bahwa pipeline generate→render benar, lalu lanjut #2 schema sebagai pekerjaan desain terbesar.
