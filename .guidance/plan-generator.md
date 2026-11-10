# Plan — generator

> Index & shared context: [plan.md](plan.md) §0, §4.

## 3. Project: generator — Rajutan (`orchestrator/`)

Build-time logic that turns a business profile into a preset and a site repository. Server-side,
never a package (§3.10). Stage B already landed in draft (§3.7).

### 3.1 Big picture: from wizard to preset to site

```mermaid
flowchart TD
    W["Wizard — frontend terpisah<br/>Google Identity Services"] -->|"spec + ID token"| O["Orchestrator — Apps Script<br/>Sheets sebagai DB<br/>engine di-bundle"]
    O --> AI["Gemini → iAiSiteContent v1"]
    AI --> AS["parseAiContent → assemblePreset<br/>preset.json"]
    AS --> DER["plan → emit → generate<br/>(pure engine)"]
    DER --> FILES["5 file statis<br/>preset.json · index.html · app.js<br/>server/adapter.json · FLOW.md"]
    AS --> SHEET["Sheet per situs<br/>deploy /exec · transfer ownership"]
    FILES --> REPO["GitHub API — repo baru"]
    REPO --> LIVE["Pages / Cloudflare Pages"]
    SHEET --> LIVE
    LIVE --> USER["Pengunjung"]
    FILES -.->|"opsional: klien minta source"| DEV["dev/ + GitHub Action build"]
```

Build-free adalah jalur utama: repo klien hanya berisi lima file di atas, dan seluruh
`@aio-ui/*` dimuat dari CDN pada tag `engine.resolved`. `dev/` (proyek Vite) tetap
digenerate tetapi hanya diserahkan bila klien memintanya. GitHub Actions bukan bagian dari
jalur kritis — ia hanya opsi untuk permintaan source/build (§3.10).

### 3.2 Input object contract (Apps Script ↔ `@aio-ui`)

The two sides already speak the same shapes; the preset must reuse them, not invent a third.

| Direction       | Shape                                                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Content AST     | `iBasicNode[]` / `iNodeContent` with token keys: `#id`, `.class`, `tag`, `>child` (`docs/framework/DOMRenderer.md`)    |
| Builder payload | `{ builder, content }` or `{ builder: "form", config, schema }`; the wizard sends exactly this                         |
| Server → client | `{ statusCode, success, message, data, meta? }`; `data` is the payload, `meta` carries pagination links                |
| Build result    | `{ status: "success" \| "partial" \| "error", meta, data: { sheet, repo, live, guide, message } }`                     |
| Sheet rows      | Column titles are the field ids (`snake_case`); `GET /exec?sheet=…&page&limit&sortBy&order&category&lang`              |
| Address levels  | `?level=propinsi\|kota\|kecamatan\|kelurahan\|kodepos&parentId`, `?level=detail&kodepos`, `?level=geocode` — unchanged |

### 3.3 What a preset is

Data, not code. One JSON document per generated site:

```ts
interface iWebPreset {
  id: string; // slug
  presetSchema: 1; // document shape; bumped only when the parser changes
  /** Framework release this site was generated against (§1.2.6). */
  engine: { range: string; resolved: string };
  model: "gallery" | "profile" | "store" | "blog"; // §3.5
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

### 3.4 Capability map (the table stage A has to freeze)

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

### 3.5 Webapp models

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

**Reference status (2026-11-11):** `examples/gallery` exists for the `gallery` model; `profile`,
`store` and `blog` have **no manual reference yet**. The official release gate (§3.10) waits for
all three, because each model is where the catalogue's real boundaries become visible.

### 3.6 Remaining work — preset engine

`packages/*` keeps shipping only `@aio-ui` packages. The engine lives in `orchestrator/` until
its shape settles, then moves into the separate Apps Script orchestrator as a bundled script
(§3.10) — never into a package.

- 3.6.1 **Preset schema + validator** (`iWebPreset` v1): `parse()` refuses unknown component
  ids and unknown builder words, so an AI hallucination fails at the generator, never in a
  client's browser.
- 3.6.2 **`plan(preset)` derivation**: implements §3.4 as a data table (signal → adds), with
  one test per row. No `if` chains.
- 3.6.3 **`assetsOf(preset)`** — emits the asset map the host currently writes by hand in
  `examples/*/src/registry.assets.ts`; also emits the `<link>` list and the import map.
- 3.6.4 **Assembly via GitHub API** (server side): create the site repo from a template
  (`POST /repos/{template}/generate`), commit `preset.json` + `index.html` + `app.js` +
  `styles.css` through the Contents API, then enable Pages. Apps Script cannot run
  `tsc`/Vite, so "assembly" is **selection + file writing**, never compilation.
- 3.6.5 **Build-free runtime template** (§3.8.5): `index.html` with an import map + `app.js` that
  fetches `preset.json`, registers only the listed components, then renders `preset.pages`.
  A preset without a build step is the only shape that works on zero-cost static hosting.
- 3.6.6 **Wizard hand-off**: the orchestrator returns `data.preset` alongside
  `sheet/repo/live/guide`; the wizard renders `preset.pages` instead of a hardcoded page list.

### 3.7 Execution stages

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

**Where we are (2026-11-11): stage B complete in draft; stage C unblocked, orchestrator wiring next.**
`orchestrator/` now holds: `types.ts` (`iWebPreset` v1), `catalogue.ts` (the capability
table), `plan.ts` (`plan`/`assetsOf` → modules, bindings, moduleRefs, assets), `parse.ts`
(`parsePreset`/`assertPreset`, shape + closed vocabulary), `ai.ts` (AI output contract
`iAiSiteContent` v1 + `parseAiContent`/`assemblePreset`/`aiResponseSchema`), `emit.ts`
(`{ links, importMap, table, bindings, moduleRefs }` + `createCdnResolver` + prefix map), `runtime.ts`
(`index.html` + `app.js`, build-free), `layout.mjs` → `layout.json` (37 packages) and
`prompt.content.md` (whose builder list a test keeps in lockstep with the catalogue).
100 draft tests (99 run + 1 opt-in CDN smoke); whole suite 428/46 (+1 skipped). `.draft/results/` now holds two generated sites
(`gallery-static_v1`, `store-dynamic_v1`), each with `preset.json`, `index.html`, `app.js`,
`server/adapter.json` and `FLOW.md`. The `dev/` copies run in a browser; on 2026-11-11 the
emitted runtime gained a mount pass (`onCreated` → `build`) and module refs now carry their
export name, so `#checkout-form` renders fieldset + fields and the gallery mounts masonry +
carousel, both with a clean console. Build-free files still wait on a real tag (stage D). The
framework side is ready; the generator side is still a mock (`mockBuildResult()` in
`.archives/wizard.ts`).

### 3.8 Decisions from the 2026-11-10 review

1. **Preset engine is server-side.** Not a `@aio-ui` package: `packages/*` only ships framework
   packages. It lives with the generator (`scripts/preset/` here or a sibling orchestrator
   project) and may be _imported_ by a package only if a runtime ever needs the validator.
2. **Derivation is code, assembly is server logic.** The AI writes `pages`/`theme`/`data`
   intents; the server derives modules/components/assets (§3.4) and calls the GitHub API to
   create the site repo. The AI never names a package.
3. **Versioning: schema version + resolved engine version.** `presetSchema: 1` for the document
   shape; `engine.resolved` for the exact framework release the site was generated against
   (§1.2.6). Regeneration is explicit, never automatic.
4. **The app shell is generated from the preset, not a fixed template.** The _shape_ is a
   template (build-free `index.html` + `app.js` + `styles.css` + `preset.json`), but its
   contents — pages, component registrations, import map, stylesheet links — come from the
   preset. Gallery/profile/store/blog (§3.5) differ only by preset, not by code.
5. **Build-free is a hard constraint.** Apps Script cannot run `tsc`/Vite, so the generated
   site must work without a build step. A Vite template can remain as an _option_ for users
   who later want to edit locally, never as a requirement.

#### Still open

- **Do we accept a first paint that fetches `preset.json`?** Build-free can still inline the
  preset into `app.js` at generation time (no fetch, one more API call on GitHub). Inline is
  faster and works offline; a separate file is easier to regenerate. Proposal: inline by
  default, keep `preset.json` beside it as the source of truth.
- **Wizard placement.** `.archives/wizard.ts` (store flow) is the reference; the generator's
  own wizard UI still needs a home (separate repo or `examples/generator`).

### 3.9 Order here

1. **Final content schema (Sheets ↔ `@aio-ui`)** — one table per model (products, posts, orders):
   column → field type, validation rules, message limits. Gate: one full store cycle — real sheet
   → `/exec` → `HttpService` → component renders rows.
2. **Build-free smoke test** — serve a generated site from a real tagged release; closes the
   "build-free" claim that is only proven structurally today.

Order rationale: 1 next because it is the largest remaining design job; 2 last because release
work (stage D) is what makes it possible. The former item 1 (mount builders) landed on
2026-11-11.

### 3.10 Decisions from the 2026-11-11 review

1. **Orchestrator is a separate Apps Script project.** Same platform as the CMS, so its own
   Sheets are the job/identity DB. The engine (`plan/emit/runtime/generate/parse/ai`) is bundled
   into it with the existing GAS compiler. The engine must stay **pure**: no `node:fs`, `path`,
   `process`, no `fetch` — it receives data and returns a file map. `layout.json`/`registry.json`
   are produced at release time and shipped as data, never scanned at runtime.
2. **Wizard is a separate frontend.** No user management. Google Identity Services proves the
   email; the orchestrator verifies the ID token server-side and uses that identity for ownership
   transfer (Apps Script project, Sheet, Drive custody).
3. **Build-free is the primary delivery.** The client repo holds only `preset.json`,
   `index.html`, `app.js`, `server/adapter.json`, `FLOW.md`; every `@aio-ui/*` module loads from
   the pinned CDN tag. The framework source is licensed through the tag, never transferred.
   `dev/` is the opt-in source hand-over, not a requirement.
4. **GitHub Actions is optional.** It exists only for clients who ask for source and a local
   build; the critical path is orchestrator → GitHub API → Pages/Cloudflare. Hosting choice stays
   open and does not change the preset contract.

#### Release policy

- **Test tag** — allowed any time after `npm run verify`; used to prove the build-free import map
  against a real tag. Artefacts may be regenerated freely.
- **Official release** — only after **all four webapp models** (§3.5: gallery, profile, store,
  blog) exist as **manual references**, each browser-verified with its boundaries documented.
  Until then the tag is a pre-release and `registry.json` is not a public contract.

#### Release validation (2026-11-11)

Building the 37-package folder exposed five defects unit tests could not see; all fixed:

1. The emitted import map had no `"imports"` wrapper, so browsers ignored it entirely.
2. Subpath URLs were derived from the specifier instead of the package's `exports`
   (`dropdown/module` pointed at a file that does not exist).
3. The build's extension pass treated a dotted basename (`Input.FormAdapter`) as already
   extensioned, so no `.js` was added and the browser 404'd.
4. A builder word used as the node key (`masonry`, `carousel`) produced custom elements
   (`<masonry>`). The key must be a real tag; `parsePreset()` now rejects that shape and the AI
   prompt states the rule.
5. A CSS export (`animations/Animations.css`) pointed at a root source file that is not packed;
   subpath mapping now prefers `dist/` for CSS.

The guard is `orchestrator/release.test.ts`: registry counts, every subpath/tarball/checksum,
every import-map URL on disk, and every reachable bare import has an exact key. `.draft/smoke/serve.mjs`
plus `SMOKE_BASE=<cdn>` runs the same sites against the real tag; both paint with a clean console,
styles included. `vitest` excludes the generated trees (`cdn-tree`, `cdn-smoke`, `smoke`).

### 3.11 Open design — builder node host vs `isRoot` replacement (2026-11-11)

A builder node currently renders as a **host**: the node key becomes the element and the builder
output is mounted inside it.

```
"div#masonry": { "builder": "masonry" }   →   <div id="masonry"><section class="masonry">…</section></div>
```

That is the default and it works. The proposed extension is `isRoot: true`: the host is replaced
by the builder output, so the component owns its element directly.

```
"div#masonry": { "builder": "masonry", "isRoot": true }   →   <section class="masonry">…</section>
```

**Not implemented, and not yet verified.** `AioApp`'s entry/render path was rewritten and its
output has not been reviewed against this idea, so the semantics must be pinned before code.

What exists today:

- `DOMRenderer.contentEvaluator()` returns early for a node with `builder`; the host element comes
  from `nodeFactory()` using the key's tag.
- `DOMRenderer.attachMetadata()` reads `isRoot` only to name the builder template relation; it does
  not change the DOM.
- `AioApp.blockToNode()` emits `isRoot: true` for page blocks — a different use of the same flag.
- The generated `mount()` pass ignores `isRoot` and always appends into the host.

Decisions to make before implementation:

1. **Where the swap happens** — renderer (`nodeFactory` needs a pre-built element), `AioApp`
   (transform the node before render), or the generator (`mount()` replaces `el`).
2. **What carries over** — `id`, `class`, `attrs`, `data-*` and child nodes on the key: do they
   move onto the builder root, or are they illegal when `isRoot` is set?
3. **Metadata and lifecycle** — `attachMetadata`/`setMetadata` records, `onCreated`/`onDestroy`,
   hydration gate and the event-emitter bridge all assume the host element is the record owner.
   A swap must re-point them, not orphan them.
4. **Page blocks vs content nodes** — `AioApp` already uses `isRoot` for blocks; the flag needs one
   meaning, or two distinct names.

Gates: DOM/wrapper counts for `isRoot` true and false on both generated sites, metadata tree still
walks (no orphan records), `onDestroy` still runs, no duplicate stylesheet, and a browser probe of
`gallery` + `store` with both shapes.
