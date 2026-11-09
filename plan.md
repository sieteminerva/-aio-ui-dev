# AIO UI Framework — Restructure & Semi-Rewrite Plan

Single tracking document for the monorepo restructure (Phase 0) and the framework
semi-rewrite (Phase 1–5). Update the checkboxes and the progress table as work lands.

Last updated: 2026-11-07

---

## 1. Objective

Turn this LITE gallery application into a monorepo framework (`@aio-ui/*`) whose runtime
is driven by a single declarative app shell, so that a generated project only needs to
provide content plus a manifest.

Two outcomes must hold at the same time:

1. The gallery application keeps running identically after every single step.
2. The framework can later be consumed by the AIO Kit generator and by the GAS /
   Google Sheets CMS backend without touching framework internals.

## 2. Constraints

Hard rules taken from `.guidance/` and from the design discussion:

- Phase 0 must not change runtime behavior. It is a move, not a rewrite.
- Every step must pass its gate before the next step starts (see §6).
- `core` must never import a concrete component.
- `base` may depend on `core`; `core` must not depend on `base`.
- Components are optional. A missing module is a normal state in the LITE edition.
- `travel-trip` (archived at `.archives/travel-trip`) is the FULL edition and is
  reference-only. It is never edited and never imported.
- Source, comments, JSDoc and project documentation are written in English.
- No commits or branches are created by the agent unless explicitly requested.

## 3. Decisions already made

| #   | Decision                                                                              | Rationale                                                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | LITE (`gallery`) is the trunk; FULL is not a superset                                 | FULL is the older generation: no registry kernel, inline validation/cascade/multistep, legacy `EventBus`/`TemplateRegistry` slotting                                               |
| D2  | Physical restructure happens before the rewrite                                       | Rewriting first would move files twice and hide which failure belongs to which change                                                                                              |
| D3  | Package scope is `@aio-ui/*`                                                          | Middle ground between `@aio-ui/framework/core` and `@aio/core`                                                                                                                     |
| D4  | App shell lives in its own package, not `core`                                        | `LandingPage` level code touches registry, renderer, router and animation                                                                                                          |
| D5  | Component manifest keeps exactly one shape                                            | Only the Style 3 manifest stays; the direct-builder, loadable-builder and promise variants are dropped                                                                             |
| D6  | `ComponentRegistry` receives its `import.meta.glob` maps from the host                | A package cannot own an absolute Vite glob rooted at the host application                                                                                                          |
| D7  | A component declares its sub-components through `modules` in its manifest             | Required for `packages/components/*` to be self-contained                                                                                                                          |
| D8  | `Base` exposes a static port (`iComponentSource`) that the registry plugs into        | `ComponentRegistry` already imports `Builder`; the inverse import would be a cycle                                                                                                 |
| D9  | `DOMTreeMemory` / `EventBus` metadata layer is deferred                               | It requires rewriting every component to emit intents instead of mutating the DOM                                                                                                  |
| D10 | `examples/gallery` is the live example application                                    | Keeps one runnable end-to-end target at all times                                                                                                                                  |
| D11 | Modules are registered, never injected as a deps bag: `registerModule(Class, config)` | The class is the token (`static slot` + `constructor(config, context)`); config lives with the registration                                                                        |
| D12 | A route is content **or** a controller: `registerPage(route, Controller, config)`     | One instance per render, so `onDestroy` really releases; page may come from either side, never from both                                                                           |
| D13 | Data is read only through `ctx.http`                                                  | Mock JSON is fetched the same way the live backend will be; migration is a config change                                                                                           |
| D14 | The theme is a slot with three phases, not an event subscriber                        | Removes the "who applies the theme" guesswork; two apps on one page cannot fight over DOM state                                                                                    |
| D15 | No `globalThis` state — `core` owns the store and exports it                          | `BuilderPort` is the seam pattern where a cycle must be broken; `TemplateRegistry` needs no seam, so it simply lives in core                                                       |
| D16 | Registries are built per need on the shared kernel; no universal hub                  | Each registry resolves differently; forcing one API produced adapters that existed only to satisfy the pattern                                                                     |
| D17 | `TemplateRegistry` lives in `core`, not in `theme`                                    | Its only readers are `DOMRenderer` (core) and `Base` (depends on core); a package plus a port was more machinery than the class                                                    |
| D18 | Each theme is its own package (`@aio-ui/theme-<id>`) under `packages/themes/<id>`     | Install on demand: a project that only wants the default theme should not ship the horizontal scroll engine. Done — engine stays in `modules/theme`, themes in `packages/themes/*` |

## 4. Target structure

```txt
gallery/                          monorepo root (current workspace folder)
├── package.json                  workspaces + root scripts
├── tsconfig.base.json
├── packages/
│   ├── styles/                   @aio-ui/styles      variables, layout, typography, components, icon
│   ├── utilities/                @aio-ui/utilities   Metadata, SelectorToTree, AttributeUtils, helper
│   ├── core/                     @aio-ui/core        DOMRenderer, ComponentRegistry, interface
│   ├── base/                     @aio-ui/base        Base, BaseAdapters/
│   ├── modules/                  @aio-ui/modules     HashRouter, EventEmitter, HttpService, Animations
│   ├── app/                      @aio-ui/app         AppShell, PageController contracts
│   └── components/
│       ├── form/                 @aio-ui/form
│       ├── table/                @aio-ui/table
│       ├── masonry/              @aio-ui/masonry
│       ├── article/              @aio-ui/article
│       ├── message/              @aio-ui/message
│       ├── rating/               @aio-ui/rating
│       └── ...                   ported from `.archives/travel-trip`
├── examples/
│   └── gallery/                  index.html, vite.config.ts, src/main.ts, src/content/**, public/
├── docs/                         technical documentation
├── .guidance/                    plan, task, rules, decisions
└── .archives/                    reference material, out of build scope
```

During Phase 0 the application stays at the repository root and imports packages through
`@aio-ui/*` aliases. It is moved to `examples/gallery` only in step 0.9, after every
package has been extracted and verified.

## 5. Progress

| Phase | Scope                                                  | Status            |
| ----- | ------------------------------------------------------ | ----------------- |
| 0     | Monorepo restructure, zero behavior change             | done              |
| 1     | `AioApp` — contract, module convention, implementation | done              |
| 2     | `ComponentRegistry` rewrite to the agreed contract     | done              |
| 3     | PageController contract + one reference implementation | done              |
| 4     | Entry implementation, `main.ts` reduced                | done (merged → 1) |
| 5     | Port remaining FULL components                         | mostly done       |
| 6     | Themes, `ThemeRenderer`, generator pipeline            | theme slot done   |
| —     | `DOMTreeMemory` / `EventBus` metadata layer            | deferred          |

---

## Phase 0 — Monorepo restructure

Goal: physical layout matches §4, application still runs, no behavior change.

### 0.1 Baseline

- [x] Create a restore point (`1116356`)
- [x] Record `npx tsc --noEmit` output — clean (after fixing `Tab` `rootElement` collision)
- [x] Record `npm test` output — 3 files, 42 tests passed
- [x] Record `npm run build` output — succeeded in 592 ms, `dist/assets/main-*.js` 77.90 kB
- [x] Record all routes rendered (`#home`, `#form`, `#blog`, `#about`, `#gallery`)
  - Baseline: `home` 122 nodes, `form` 75, `blog` 115, `about` 63, `gallery` 31; lazy `<style>` count grows 2 → 3 → 4
  - Current after the `.page` re-root: 123 / 76 / 116 / 64 / 32 (the container stays mounted, one extra node)

### 0.2 Inject Vite glob maps into `ComponentRegistry`

- [x] Replace the hardcoded `import.meta.glob` constants with constructor options
      `{ modules, styles }` (`iComponentAssetMaps`)
- [x] Update `main.ts` to pass both maps
- [x] Verify a lazy stylesheet still creates `<style id="rajutan-lazy-css__*">`
  - Verified: `rajutan-lazy-css___src_lib_Components_Form_Form_css`, `..._Table_Table_css`

### 0.3 Monorepo skeleton

- [x] Root `package.json` with `workspaces: ["packages/*", "packages/components/*", "examples/*"]`
- [x] `tsconfig.base.json`, with the root `tsconfig.json` extending it
- [x] `@aio-ui/*` path aliases in `tsconfig.base.json` and `vite.config.ts` (added per package as it lands, to avoid dead config)
- [x] Application still runs from the repository root

### 0.4 Move `styles`

- [x] Create `packages/styles`, move `src/lib/Styles/*` (git mv, history preserved)
- [x] Add `packages/styles/src/index.css` importing the five sheets in presentation order
- [x] Update imports; verify build — bundled CSS is byte-identical (`style-Cg4RrwdU.css`, 508658 B)

### 0.5 Move `utilities`

- [x] Move `Metadata`, `SelectorToTree`, `AttributeUtils`, `DomUtils`, `color.utils`, `helper`
- [x] Move `interface.ts` to `packages/core` early — `Metadata` and `SelectorToTree` depend on it,
      and the dependency direction must stay `utilities → core`
- [x] Rewrite 32 relative `interface` imports and 8 `Utility/*` imports to `@aio-ui/*` aliases
- [x] Verify build — `main-*.js` unchanged (`main-CK5ubGIe.js`, 78.00 kB)

### 0.6 Move `core` and `base`

- [x] Move `interface` to `packages/core`
- [x] Move `DOMRenderer`, `ComponentRegistry` to `packages/core`
- [x] Move `Registry/*` to `packages/core` (generic kernel used by `ComponentRegistry`)
- [x] Move `Base`, `BaseAdapters/` to `packages/base`
- [x] Break the `core` → `base` import in `ComponentRegistry` via the `iComponentSource` port
- [x] Verify build and tests — `tsc` clean, 42 tests, all five routes identical to baseline

Notes:

- Option A was implemented as `BuilderPort` (`iBuilderAdapter`, `setBuilderAdapter`, `getBuilderAdapter`).
  `packages/base` registers the adapter at module evaluation; `ComponentRegistry` never imports `base`.
- `instance.hydration` is never assigned anywhere in the codebase today, so the gate branch was dead;
  its semantics are preserved inside the adapter for when a builder starts exposing one.
- `vitest.config.ts` had no alias resolution; aliases moved to a shared `aliases.ts` used by both
  `vite.config.ts` and `vitest.config.ts`.
- Chunk hashes changed because the Vite `codeSplitting` rule matches `/src/lib/Components/`, which no
  longer contains `Base`. Chunk grouping must be reworked in 0.8 when components move to
  `packages/components/*`.

### 0.7 Move `modules`

- [x] Move `HashRouter`, `EventEmitter`, `HttpService`, `Animations` to `packages/modules`
- [x] Move `ModuleRegistry` / `ModuleLoader` there too (they depend on `@aio-ui/core/Registry`, direction stays correct)
- [x] Archive the unused `AuthService.ts` + `AuthServiceConcept.md` into `.archives/modules/`
- [x] Move `ComponentRegistry.md` next to its code in `packages/core/`
- [x] Verify the animation behaviours still bundle — 12 `@aio-ui/modules/*` imports rewritten, all routes identical

### 0.8 Move components one at a time

Order: `message` → `rating` → `masonry` → `article` → `table` → `form`.
Each component is its own gate: the route that uses it must render identically.

Must be done here: rewrite the Vite `codeSplitting` rule, which currently matches
`/src/lib/Components/` and therefore no longer covers `Base` or any package.

- [x] `message`
- [x] `rating`
- [x] `masonry`
- [x] `article`
- [x] `table`
- [x] `form`

All 17 component folders were moved in one pass into `packages/components/<lowercase>/` (flat layout,
no `src/`), so imports read `@aio-ui/components/form/Form`.

Supporting changes made in this step:

- Alias `@aio-ui/components` → `packages/components` (Vite + `tsconfig.base.json`).
- `normalizeVitePath` no longer forces a `src/` prefix: manifest `path` values are now
  project-root relative, which is what the host glob map produces.
- Host globs and the four manifests in `main.ts` point at `packages/components/**`.
- Vite `codeSplitting` rule retargeted from `/src/lib/Components/` to `packages/components/`;
  chunk names still resolve to `component-<name>`.
- `FormRegistry.ts` moved unchanged, on purpose: it is the reference case for how a component
  with installable sub-modules should eventually be structured.

### 0.9 Move the application

- [x] Move `index.html`, `vite.config.ts`, `src/main.ts`, `src/content/**`, `public/` to `examples/gallery`
- [x] Give the example its own `package.json`, `vite.config.ts`, `tsconfig.json` (own Vite root, mirroring a generated project)
- [x] Add `package.json` to all 17 component packages (`@aio-ui/<name>`)
- [x] Run `npm install` so workspaces link every package into `node_modules/@aio-ui/*`
- [x] Remove `aliases.ts` and all `paths` mapping: resolution now goes through workspace links only
- [x] Replace the host `import.meta.glob` maps with an explicit loader map (`examples/gallery/src/registry.assets.ts`)
- [x] Switch manifests from file paths to module specifiers (`@aio-ui/form/Form`)
- [x] Verify all five routes

Notes:

- A glob over `packages/**` cannot survive packaging: Vite resolves absolute glob patterns against
  the app root and does not scan `node_modules`. The loader map is the durable form, and it is
  exactly what the generator can emit for a generated project.
- Because manifests now carry specifiers, `normalizeVitePath` only strips leading `./` and `/`;
  lookup falls back to the exact key, so `@aio-ui/form/Form` and `/src/...` styles both work.
- Chunk sizes shifted (inline `?inline` CSS is now code-split per component); runtime output is
  unchanged: same node counts per route, same computed styles, no leftover `data-hydrating`.

### 0.10 Document the boundaries

- [x] Write `docs/BOUNDARIES.md` with the import rules actually proven during migration
- [x] Add a boundary check to the verification gate — `npm run check:bounds`
      (`scripts/bounds.mjs`: edge matrix, type-only `app → core`, deep-import resolution,
      `import.meta.glob` host-only, no `paths`/`alias`)
- [x] Housekeeping: plan/task docs into `.guidance/`, technical docs into `docs/`, stale root `dist/` removed
- [x] Split `packages/modules` into installable packages: `@aio-ui/router`, `@aio-ui/event-emitter`,
      `@aio-ui/http-service`, `@aio-ui/animations`, `@aio-ui/module-loader`

---

## Phase 1 — AioApp (framework entry)

Deliverable is the entry itself: contract **and** implementation, so the mandatory
logic has one home.

- [x] Define `iAppConfig`: `container`, `source`, `defaultRoute`, `theme`, `debug`
      (**no `deps`** — module config lives at `registerModule`, see Phase 1b)
- [x] Define `iAppSource`: the shape the CMS/generator produces (`pages`, `menu`, `footer`)
- [x] Define what the entry may know (registry, renderer, router, animation, events,
      storage) and what it must not
- [x] Define the registry requirements demanded by the entry, as input for Phase 2
- [x] Decide how route content and the preload graph are derived from `pages`
      (`buildersForRoute` must disappear)
- [x] Implement `AioApp`: mount, router wiring, sequence guard, preload, render, root
      swap, theme persistence, fragment scroll, controller lifecycle, event channel

### Phase 1b — module convention

- [x] Slots instead of a dependency bag: `registry`, `router`, `renderer`, `animation`,
      `events`, `storage`
- [x] The real class is the token (`static readonly slot` + `constructor(config, context)`);
      no wrapper classes, no `defineModule()` alias, no factory object
- [x] `registerModule(instance, "slot")` escape hatch for plain objects and test doubles
- [x] Registering after `render()` throws; duplicate slot warns and replaces
- [x] Required slots (`registry`, `router`, `renderer`) validated **before** creation;
      a throwing module releases the ones already created
- [x] Teardown in reverse order through `port.destroy?.()`
- [x] `@aio-ui/app` is a **type-only** dependency on `core` (`collect()` moved onto the
      registry port, renderer is a required slot)

Delivered:

- `packages/app/src/types.ts` — `iAppSource`, `iAppOptions`, `iAppConfig`,
  `iPageContent` (`iNodeContent | iPageDocument`), `iPageController`,
  `iPagePrepareContext`, `iApp`
- `packages/app/src/ports.ts` — `iComponentRegistryPort`, `iRendererPort`, `iRouterPort`,
  `iRouterFactory`, `iAnimationPort`, `iEventPort`, `iStoragePort`
- `packages/app/src/AioApp.ts` — the entry class plus `normalizeRoute`, `isPageDocument`,
  `blockToNode`, `pageToNode`
- `packages/app/src/modules.ts` — `AppStorage` (the `storage` port; every other slot is
  filled by a class the framework already ships)
- `docs/APP.md` — mount-point rule, module convention, two page shapes, preload
  derivation, events, debug channel, registry requirements, open questions

## Phase 2 — ComponentRegistry

- [x] Reduce `RegisterFn` to a single manifest signature — `iComponentManifest`
- [x] Remove `LoadFn`, `dummyLoadFn` and the unused branching in `build()`
  - `main` chunk 71.03 kB → 69.94 kB; all five routes byte-identical node counts
- [x] Add `modules` to the component manifest and resolve it during load
- [x] Make the load graph recursive (a module id may name another registered component)
- [x] Namespace `_resolvedCache` keys per module (`form:table`)
- [x] `Base.module(id)` with a single warn-once policy
- [x] `iComponentSource` dropped: no longer needed once modules are handed to builders
      through `provideModules()`; `core` never asks `base` to resolve anything
- [x] Tests: `Registry`, `ModuleRegistry`, `ModuleLoader`, `ComponentRegistry`
- [x] Auto-load: `collect(source)` + `loadFor(source)`; `buildersForRoute` deleted
- [x] Declaration key unified on `builder` (`string | string[]`)
- [ ] Split asset loading into a `ComponentLoader` if the class keeps growing
      (deferred: finalization, not function)

## Phase 3 — PageController

- [x] Finalize `iPageController` (`onPrepare`, `onReady`, `onDestroy`, `attachMenu`)
- [x] `onReady(elements)` replaced by `iPageReadyContext` (`shell`, `menu`, `footer`,
      `blocks`) — Q6 closed
- [x] Register with `registerPage(route, Controller, config)`; one instance per render
- [x] Page may come from `source.pages` **or** `onPrepare`; neither → explicit error
- [x] `attachMenu` is called by the app, not by the controller (legacy duplicated it 3×)
- [x] `iPageContext.signal` aborts when navigation moves on; superseded renders are dropped
- [x] Data through `ctx.http` only; `HttpService.endpoint(query)` serves mock JSON as a
      real request (`public/mock/*.json`), live backend is a config change
- [x] Reference controller: `examples/gallery/src/pages/blog.ts`
- [x] Reference controller: `examples/gallery/src/pages/gallery.ts` — Masonry keeps its own
      paging contract (`loadFn(page, category)`), the controller supplies it from `http`
- [x] Verify the `form`, `blog` and `gallery` routes end to end
- [ ] Reference controller for `form` (wizard) — deliberately deferred until the
      Form module owns its sub-modules
- [ ] Known defect found while verifying: on `#gallery` the fixed nav overlaps the filter
      row, so filter clicks are intercepted. Pre-existing layout issue, not a data issue

## Phase 4 — AioApp implementation → merged into Phase 1

Done as `AioApp` (`packages/app/src/AioApp.ts`); see Phase 1 and `docs/APP.md`.

- [x] Implement the entry against the Phase 1 contract
- [x] Reduce `main.ts` to configuration plus registration
- [x] Documentation channel: `debug: true` logs `mount`, `render:start`, `preload`,
      `miss`, `render:superseded`, `render:done`, `modules:created`, `destroy`
- [x] Verify all routes, including route switching, re-render, `destroy()`

## Phase 5 — Port remaining components

Ported into `src/lib/Components` already, pending review:

| Component    | Files                                                  | CSS                    | Notes                                                                                          |
| ------------ | ------------------------------------------------------ | ---------------------- | ---------------------------------------------------------------------------------------------- |
| Accordion    | `Accordion.ts`                                         | yes                    |                                                                                                |
| Carousel     | `Carousel.ts`                                          | yes                    | manual verification needed                                                                     |
| FabMenu      | `FabMenu.ts`                                           | yes                    |                                                                                                |
| Footer       | `Footer.ts`                                            | **no CSS**             | verify whether it relies on global styles                                                      |
| Menu         | `Menu.ts`                                              | yes                    | uses legacy `ElementCreatedEventBus` / `TemplateRegistry` — must be remapped to `config.slots` |
| Modal        | `Modal.ts`                                             | yes                    |                                                                                                |
| ModeSwitcher | `ModeSwitcher.ts`                                      | yes                    |                                                                                                |
| PricingCard  | `PricingCard.ts`                                       | yes                    |                                                                                                |
| Product      | `ProductCard.ts`, `ProductDetail.ts`, `ProductGrid.ts` | `ProductCard.css` only | differs from FULL (single `ProductCard.ts`); confirm intended split                            |
| Section      | `Section.ts`                                           | **no CSS**             | verify whether it relies on global styles                                                      |
| Tab          | `Tab.ts`                                               | yes                    |                                                                                                |

- [x] Resolve the missing CSS for `Footer` and `Section` — both now ship their own
      stylesheet (`Footer.css` two-row contract, `Section.css` 2–3 column grid); neither
      depends on `@aio-ui/styles` any more
- [x] Confirm the `Product` split and its CSS coverage — `ProductCard` (list unit),
      `ProductGrid` (list module), `ProductDetail` (record view, previously an empty file).
      `ProductGrid.css` `@import`s `ProductCard.css` because the grid nests cards directly
- [ ] Remap `Menu` slotting (still uses the legacy `ElementCreatedEventBus`)
- [x] Register each ported component in the example app and verify rendering — the demo
      now has four routes: `#kitchen` (elements, 13/13 ok), `#product`, `#article`,
      `#form` (page components). See `docs/DEMO.md`
- [x] Scaffolding for new components: `templates/component/` + `scripts/new-component.mjs`
      (`npm run new:component`), proven by generating `packages/components/badge`

## Phase 6 — Themes and generator

- [x] `@aio-ui/theme` package: `ThemeRegistry`, `ThemeRenderer`, `DefaultTheme`,
      `HorizontalTheme` (`HorizontalScrollingPage` moved out of the example and wrapped)
- [x] `TemplateRegistry` moved into **core** (its only readers are `DOMRenderer` and
      `Base`); `globalThis.TemplateRegistry` is gone
- [x] Theme is a slot (`iThemePort`), not an event subscriber: `prepare` → `activate` →
      `deactivate` are called by the entry — Q7 closed
- [x] `CyberpunkTheme` (tokens only: neon cyan/magenta, sharp radii, night surfaces)
- [x] Split each theme into its own package under `packages/themes/<id>`
      (`@aio-ui/theme-default`, `-horizontal`, `-cyberpunk`); the engine remains
      `@aio-ui/theme` in `modules/`, and themes depend on `core` types only
- [x] Theme switcher UI — a fab menu whose items move the hash (`?theme=`), see
      `docs/DEMO.md`; it belongs to the host, not to the framework
- [ ] Themes that override templates (`templates()`) — the store exists, nothing uses it yet
- [ ] Port `BuilderTransformer` (no imports) and `FormSchemaTransformer` as `@aio-ui/utilities`
- [ ] Add `aio.config.json` manifest handling
- [ ] Generate `main.ts` from the manifest

## Deferred

- [ ] `DOMTreeMemory` + `EventBus` metadata layer — only after the shell is stable and a
      concrete diff/regeneration requirement exists
- [ ] **IdAddress must stop carrying its own HTTP client.** `id-address-builder.ts`
      (`_fetchAPI`, ~line 1213) is where `HttpService` originally came from; IdAddress is a
      standalone library of the author's, ported into Form as plug-and-play. When the Form
      module work starts, remove that embedded fetch and depend on
      `@aio-ui/http-service` instead, so the code is smaller and every component shares one
      client. Keep the response contract aligned: `{ success, message, data, meta }`, whole
      envelope returned (`docs/API.md`)
- [ ] Styling pass — the fixed nav overlaps the filter row on `#gallery` (filter clicks are
      intercepted) and the overall visual layer is still rough. Deliberately deferred until
      every route runs on logic alone

---

## 6. Verification gate

Run after every step and before marking any task complete.

```bash
npm run typecheck       # tsc --noEmit -p tsconfig.json
npm run check:bounds    # docs/BOUNDARIES.md, enforced
npm test                # 73 tests (registry, modules, app)
npm run build           # production build, lightningcss must not fail
```

Plus a manual check of the dev server (port is whatever Vite picks, typically 5176)
for `#home`, `#about`, `#gallery`, `#blog`, `#form`: expected node counts
**123 / 64 / 41 / 116 / 76** inside `#app`, no console error or warning.

## 7. Open questions

| #   | Question                                                                                                                                                                   | Affects |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Q1  | `Footer` and `Section` ship without CSS — resolved: they relied on global styles. Ignored on purpose.                                                                      | closed  |
| Q2  | `Product` split into three builders — resolved: leftover of an abandoned module/submodule experiment. Ignored for now.                                                     | closed  |
| Q3  | Should `Menu` be remapped now or dropped? — resolved: the entry exists, so remap it to `config.slots` during Phase 5.                                                      | Phase 5 |
| Q4  | `docs/` target folder — resolved: repository `docs/`, technical docs named per contract (`API.md`, `FIELD-TYPES.md`, `APP.md`, `BOUNDARIES.md`).                           | closed  |
| Q5  | Component package naming — resolved: `@aio-ui/<name>`, so install name and import name are identical (`@aio-ui/form/Form`). The `@aio-ui/components/*` alias is retired.   | closed  |
| Q6  | What does `onReady(elements)` receive — resolved: `iPageReadyContext` with `shell`, `menu`, `footer`, `blocks` (every element carrying an `id`).                           | closed  |
| Q7  | Who applies the theme to the DOM — resolved: a `theme` slot. `AioApp` calls `prepare` before render, `activate` after attach, `deactivate` before swap. No event guessing. | closed  |

## 8. Change log

| Date       | Change                                                                                                                                                                                                                                 |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-07 | Plan created. Reference material archived by the user into `.archives/`.                                                                                                                                                               |
| 2026-11-07 | Baseline recorded: `tsc --noEmit` clean, 42 tests pass, build succeeds. Renamed `Tab.tabRoot` (was `rootElement`) to resolve a collision with `Builder.rootElement`.                                                                   |
| 2026-11-07 | Step 0.2 done: `ComponentRegistry` now receives `{ modules, styles }` instead of owning `import.meta.glob`. All five routes verified.                                                                                                  |
| 2026-11-07 | Steps 0.3–0.5 done: workspace skeleton, `packages/styles`, `packages/utilities`, and `interface` moved to `packages/core`. Build output byte-identical.                                                                                |
| 2026-11-07 | Step 0.6 done: `packages/core` (`DOMRenderer`, `ComponentRegistry`, `Registry`, `BuilderPort`) and `packages/base` (`Base`, `BaseAdapters`). Shared `aliases.ts`. All routes verified.                                                 |
| 2026-11-07 | Step 0.7 done: `packages/modules` (`HashRouter`, `EventEmitter`, `HttpService`, `ModuleRegistry`, `ModuleLoader`, `Animations`). `src/lib` now contains only `Components/`.                                                            |
| 2026-11-07 | Step 0.8 done: all 17 components in `packages/components/<name>/`. Globs, manifests, `normalizeVitePath` and the Vite chunk rule retargeted. `src/lib` removed. All routes verified; lazy CSS now loads from `packages/components/**`. |

| 2026-11-07 | Step 0.9 done: app moved to `examples/gallery` with its own Vite. Workspace links replace aliases; manifests carry module specifiers and the host supplies a loader map. All routes verified. |

| 2026-11-07 | Step 0.10 done: `docs/BOUNDARIES.md` written, plan/task docs moved to `.guidance/`, technical docs into `docs/`, stale `dist/` removed. `packages/modules` split into five installable packages. All routes verified. |

| 2026-11-08 | Type split: `core/src/interface.ts` became a barrel over `types/{renderer,content,node,registry,builder,page}.ts`; `iPageEvents` moved to `@aio-ui/event-emitter/PageEvents`. Build hashes unchanged. |

| 2026-11-08 | Phase 1 done: `@aio-ui/app` created with contract-only interfaces (`types.ts`, `ports.ts`) and `docs/APPSHELL.md`. No implementation yet. |

| 2026-11-08 | Entry implemented as `AioApp` (`packages/app/src/AioApp.ts`): container, router, sequence guard, preload, render, root swap, theme via `iStoragePort`, fragment scroll, controller lifecycle, events, debug channel. Contracts renamed `iAppShell*` → `iApp*`. Page content may be a node tree or a block document (`iPageContent`). Pages were re-rooted from `#app` to `.page` so the container stays a stable mount point. Example entry `main.ts` shrank to registration + `mount()`. |

| 2026-11-08 | Module convention: `iAppDeps` removed. Every adapter is a registered module, and **the real class is the token** (`static readonly slot` + `constructor(config, context)`), so no wrapper classes exist: `registerModule(HashRouter)`, `registerModule(AppStorage, { driver })`, `registerModule(AnimationsService)`, `registerModule(componentRegistryInstance)`. `iAppConfig` keeps only general options; config types come from `ConstructorParameters<M>`. `HashRouter` now accepts `(config, context)`; `ComponentRegistry`, `DOMRenderer`, `AnimationsService`, `EventEmitter` carry `static slot`. Modules are constructed at `mount()` (storage first so the persisted theme exists before the router), duplicates warn+replace, teardown is `port.destroy?.()` in reverse order, registering after mount throws, and a module without a slot throws with a hint. 68 tests, all routes unchanged (123/64/32/116/76). |

| 2026-11-08 | Plan reconciled with the code, and the boundary gate landed: `scripts/bounds.mjs` + `npm run check:bounds` + `npm run verify` (typecheck → bounds → test → build). The gate checks the dependency matrix from `docs/BOUNDARIES.md`, type-only `app → core`, deep-import resolution against `exports` (file fallback for map-less component packages), `import.meta.glob` outside the host, and reintroduced `paths`/`alias`. Verified by a deliberate violation probe. Phase 4 merged into Phase 1; Q3/Q4 closed; Q6 (`onReady` element map) and Q7 (theme DOM application) opened for Phase 3. |

| 2026-11-08 | Phase 3 done. `registerController` → `registerPage(route, Controller, config)`; one controller instance per render. `iPagePrepareContext` → `iPageContext` (`route`, `page`, `fragment`, `theme`, `builders`, `http`, `signal`); `onReady(Map, shell)` → `iPageReadyContext` (`shell`, `menu`, `footer`, `blocks`). A route's page may now come from `source.pages` **or** `onPrepare`. `attachMenu` is invoked by the app. Navigation aborts the in-flight pass via `AbortController`, and a superseded render is dropped instead of painting. New slot `http` (`HttpService`); `HttpService` gained `endpoint(query)` (mock JSON as a real request), returns the whole envelope (`docs/API.md`), accepts the legacy `status` envelope, and its config is fully optional. `blog` became the reference controller, reading `public/mock/blog.json`; `blog.json` no longer lives in `src/content`. 78 tests, routes unchanged (123/64/32/116/76). |

| 2026-11-08 | `gallery` became the second reference controller. Masonry already exposed `loadFn(page, category) => items`, so the controller passes `http` straight into that hook instead of pre-fetching everything; page 1 is fetched in `onPrepare`, further pages resolve to `[]` against the single-page mock. `gallery.json` moved to `public/mock/` and its envelope matched `docs/API.md`. Two findings recorded: Masonry defaults `selectedCategory` to the first category (not "All"), and the fixed nav overlaps the filter row on `#gallery`, so filter clicks are intercepted — both pre-existing, neither caused by the data change. |

| 2026-11-08 | Masonry: the initially active category became configurable (`defaultCategory`), defaulting to `null` = "All", so a visitor sees every item on first paint. A configured name that is absent from the data also resolves to `null` rather than an empty grid. Gallery now opens with 5 items and `All` active (route count 32 → 41). Deferred items recorded: IdAddress should depend on `@aio-ui/http-service` instead of its own `_fetchAPI` (to be done with the Form module), and the styling pass stays queued. |

| 2026-11-08 | Contracts written: `core/types/api.ts` (`iApiResponse`, `iFieldDescriptor`), app `iPageBlock`/`iPageDocument`, `docs/API.md` from a live response. |

| 2026-11-08 | Phase 2 started: single `iComponentManifest` (`modules`, `iComponentModuleRef`), `LoadFn`/polymorphism removed, dead branches in `build()` deleted. `main` 71.03 → 69.94 kB, all routes identical. |

| 2026-11-08 | Phase 2: `preloadComponents` renamed to `load`; `modules` resolved per component with namespaced cache keys (`form:table`) and handed to builders via `provideModules()`; `Base.module(id)` added with warn-once. Deliberately NOT on `config.modules` because Form already owns that key. |

| 2026-11-08 | Phase 2 tests: 9 registry tests (manifest, config merge, schema payload, module resolution, missing module, dedupe, unknown name). Fixed two Node-hostile spots found by the tests: `isPlainRecord` DOM guard and stylesheet derivation treating specifiers as file paths. 42 → 51 tests. |

| 2026-11-08 | Module registry complete: `modules[].path` optional (falls back to a registered component), `modules[].export` selects a named export for adapters/handlers, cycle-safe loading. `iComponentSource` dropped as unnecessary. 54 tests. |

| 2026-11-08 | Auto-load: `collectComponentNames()` + `registry.loadFor(source)`; `buildersForRoute` deleted from the example. Dynamic mounts declare `options.requires`. Form manifest declares `modules: [{ id: "table" }]`. 58 tests, all routes at baseline. |

| 2026-11-08 | Declaration key unified on `builder` (`string \| string[]`) instead of `options.requires`; DOMRenderer only treats a string `builder` as a template root. Docs and the three content nodes updated. 59 tests, all routes at baseline (122 / 75 / 115 / 63 / 31). |

| 2026-11-08 | `modal` lifecycle fixed and measured: `prepare()` returns the overlay element (registry-buildable like everything else, no auto-append to `document.body`), listeners held as stable refs with `bind()`/`unbind()`, `destroy()` idempotent, `onReady(controls)` hands the handle out. Root cause of "opens once then dies": `destroyOnClose: true` destroys on close, and the stale handle silently no-oped — it now warns via `isDestroyed`. Demo: 4 open/close cycles, one overlay, no console noise; **12/12** demo sections green. |

| 2026-11-08 | `footer` rewritten to its real two-row contract. Row 1 is `content.columns[]` — any number of free-form columns (title / description / actions), auto-fitted by CSS `auto-fit`; row 2 is the copyright line from `company` + live year, overridable via `copyright` with `{year}`/`{company}` tokens. Absent parts are no longer rendered (the old loop emitted empty `<p>` and `<ul>` per column and put description after the list). Flat payloads (`title`/`description`/`actions`) still work as one column. Action links infer their scheme: email → `mailto:`, phone → `tel:`, non-addressable text (a street address) stays visible with an inert `#`. `useInfo`/`useCopyright` became optional, `Footer.css` added, and the dead `createLegacy()` (~90 lines, no callers) was deleted. Verified against `.archives/travel-trip/main.ts:61`: 2 rows, 2 columns, `mailto:`/`tel:`/`#` resolved, copyright `© 2026 Agen Wisata SeribuTrip. All rights reserved.`, CSS injected. |

| 2026-11-08 | `carousel` hardened against its own config surface. `loop: false` used to behave exactly like `loop: true` (both branches wrapped) — non-loop now clamps at the ends and stops autoplay there. Payload is normalised (`[...]` or `{ content: [...] }`) before the slide count is derived, so a missing `content` no longer crashes `resolveRuntimeConfig`; `initialize()` resolves the runtime config itself when `run()` reaches it first. `container` accepts a selector, an element, or nothing. Hover handlers became stable refs with remove-before-add, the dead `isTransitioning` flag is gone, and the unused `@carousel>control` key now actually groups the buttons. Added ARIA (`region`/`aria-roledescription="carousel"`, `N / total` slides, labelled controls and dots with `aria-current`). Verified with 4 slides and `slidesPerView: 2`: 2 stops, 3 dots, `translateX(-25%)` per step, wrap in both directions, hover pauses autoplay. |

| 2026-11-08 | Component scaffolding added: `templates/component/*.tpl` (builder, CSS, DOM-free test, package.json, README) + `scripts/new-component.mjs` (`npm run new:component <name>`; `--title --dir --no-test --force --dry`). Four tokens (`__PASCAL__`, `__CAMEL__`, `__KEBAB__`, `__TITLE__`), no dependencies, so it drops straight into `aio-kit`. Proven by generating and shipping `packages/components/badge` (row 1 of the demo, 13/13 sections ok, 93 tests). Conventions documented in `docs/COMPONENT-CONVENTIONS.md` (keys/selectors, payload, prepare, template, initialize, lifecycle, config merge order, registrations, tests, CSS, anti-patterns, checklist) and the template itself in `docs/COMPONENT-TEMPLATE.md` (tokens, flags, the three manual registrations, CLI integration notes). |

| 2026-11-08 | `section` implemented as it was originally designed: one row, 2–3 columns, each block rendering image → eyebrow → title → description → actions, plus `Section.css` so nothing depends on `@aio-ui/styles`. Two real defects fixed on the way: `actions` never rendered (the `@section>content>actions` key received the column object instead of `col.actions`, so `Array.isArray` always failed), and `imageUrl` fell back to an always-empty `image` field. The builder now follows the conventions — exported `ELEMENT_KEYS`/`DEFAULT_SELECTORS`, pure `normalizeColumns()` (column-of-blocks, flat column, bare array, and a prebuilt `HTMLElement`), children built in `prepare()`, text-only `template()` — plus `alt` separated from `title` and a CTA that is a real `<a>` when it has `href` and a `role="button"` element otherwise. Column count is CSS-only (`auto-fit` + 18rem floor): 3 tracks page-width, 2 in the middle, 1 under 768px with the image spanning the row. Legacy `column half`/`column full` classNames are kept as hooks but `flex`/`max-width` are neutralised, otherwise `half` capped the cell at 50% and the media never filled its column. Verified in the demo: 2 columns at 634px (`301px 301px`), 3 tracks when a third column is added (`345px × 3`), single column with a full-width image at 400px. 7 new DOM-free tests (100 total). |

| 2026-11-08 | Demo split into routes by component **kind**, which is the distinction the one-page demo was hiding: `#kitchen` keeps element components (one builder, one node, manifest-driven), while `#product`, `#article` and `#form` became their own routes as page components. `product` composes at page level (filter + `product-grid` + `product-detail`, page owns "card → detail → back"), `article` composes inside `ArticleBuilder`'s slots (`controls`/`list`/`aside`/`detail`), `form` owns a schema plus its submit cycle. Data goes through `HttpService` with a mock endpoint (`public/mock/products.json`, `articles.json`), controllers respect `ctx.signal`, and product/photo assets come from `public/apparel/`. New: `ProductDetail` builder (the file was empty) with colours, back and add-to-cart hooks, `ProductGrid` gained config (`card`, `onOpen`, `onCheckout`), a payload normaliser and the missing `variants[].imageUrl` (cards previously rendered the BASE_URL as an image), `ProductGrid.css`, `docs/DEMO.md`, 6 product tests, and the article detail cover falling back to `thumbnail` (it was always the error SVG). Verified: `#product` 6 cards with loaded apparel images, filter → 4 merch items, detail shows title/price/colours, colour switch, add-to-cart status, back restores the list; `#article` 4 cards + aside + slug hash + detail/back; `#form` 7 fields and `formSubmit` data; `#kitchen` still 13/13 ok. 106 tests. |

| 2026-11-08 | Cleanup pass on the article/product path. `ArticleBuilder`: removed the payload `console.log`, replaced the hand-made `document.createElement("div")` grid with the already-declared `@article>list` key, dropped the `el._articlePayload` expandos in favour of `data-article-id` + a `Map` of records (one source, stamped in `template()` for list and aside items alike), moved click delegation out of `prepare()` into `initialize()` with a stable handler and remove-before-add, and removed both `insertAdjacentHTML` sites — meta is now built from nodes, and `detail>body` accepts a node or plain text and refuses to parse markup. Deleted the empty `ArticleController.ts` stub. `ProductCard`: dropped its own `import "./ProductCard.css"` (the registry injects it) after making `ProductGrid.css` `@import` the card sheet, since the grid instantiates cards directly and would otherwise lose the styles; deleted the dead `_navigate`/`select`/`_handleChange` trio, and `onSelected` — documented but never called — now fires from `navigate()`. `FabMenu` no longer logs on its idle timer, and `HttpService` request logging is behind a new `debug` flag (off by default). Convention recorded: never import a component's own CSS, except a parent that nests a builder directly, which `@import`s the child sheet. Verified: kitchen 13/13, product open/colour/back, article open/back — **zero console output of any level**. |

| 2026-11-08 | Removed `product-card` and `product-grid` from the `#kitchen` element table. Since `#product` renders both with real data (and its own explicit registrations), the catalogue rows duplicated a route and had already drifted from the shipped payload (`artwork.src` was never read, so those cards had no image). Kitchen: 13 → 11 sections, all `ok`; `ProductCard`/`ProductCard.css` loader entries dropped from the demo asset map because the grid imports the card module and its CSS directly. Rule recorded in `docs/DEMO.md`: a component is demonstrated in exactly one place. |

---

## 9. Handoff — 2026-11-08

Green: `npm run verify` (106 tests / 12 files), both builds, four demo routes.

### Done

- **Shell**: `AioApp` + module convention (`registerModule(Class, config)`, `static slot`),
  `registerPage(route, Controller, config)`, `HttpService` slot, contract-grade page context.
- **Registries**: `ComponentRegistry` on the shared `Registry` kernel; `TemplateRegistry`
  in `core`; per-need registries, no hub.
- **Theme**: `@aio-ui/theme` (`ThemeRenderer`, `DefaultTheme`, `HorizontalTheme`); theme is
  a slot with `prepare`/`activate`/`deactivate`.
- **Components**: `Modal` lifecycle fixed; `Footer` two-row contract; `Section` 2–3 columns
  with its own CSS; `Carousel` hardened (loop clamp, normalisation, a11y); `ProductDetail`
  written from scratch; `ProductGrid` config + normalisation + working images; `Article`
  cleaned (no `innerHTML`, no payload expandos, delegation in `initialize`).
- **Demo**: `#kitchen` (11 elements), `#product`, `#article`, `#form`; data via
  `HttpService` (`public/mock/*.json`); assets in `public/apparel/`.
- **Tooling**: `scripts/new-component.mjs` + `templates/component/*.tpl`,
  `scripts/bounds.mjs`.
- **Docs**: `APP.md`, `API.md`, `BOUNDARIES.md`, `COMPONENT-DATA.md`,
  `COMPONENT-CONVENTIONS.md`, `COMPONENT-TEMPLATE.md`, `DEMO.md`.

### Next, in order

1. ~~`Menu` finished~~ — done (see change log). The "legacy `ElementCreatedEventBus`"
   note was stale; the real bugs were a duplicated orphan hamburger, `sidebar` mode
   reading an argument nobody passes, `li` inside `div.actions`, and never unwrapping
   `content`. Its toggle now reports `aria-expanded`, which is what a theme-switcher
   button needs.
2. ~~`CyberpunkTheme` + per-theme packages~~ — done: `packages/themes/{default,horizontal,cyberpunk}`,
   engine stays `@aio-ui/theme`. Next natural step: the theme switcher UI, which now has
   `Menu`'s `aria-expanded` and a third theme to switch to.
3. `IdAddress` → `@aio-ui/http-service` (drop its own `_fetchAPI`), when Form work resumes.
4. Styling pass — fixed `nav` overlaps `#gallery`'s filter row; deferred until logic was done.
5. `BuilderTransformer`/`FormSchemaTransformer` → `@aio-ui/utilities`, then `aio.config.json`
   - generating `main.ts` from the manifest.
6. Small debt: `Base.destroy()` logs on every teardown; `Carousel.run()` is a manual
   bootstrapper full of `console.log`, unused by the registry; `ComponentLoader` split from
   `ComponentRegistry`.

| 2026-11-08 | `Menu` finished (the handoff's task #1 — and the note "still uses `ElementCreatedEventBus`" was stale: nothing in `Menu.ts` touched it, only a commented import in `Base` and a `globalThis` relay in `DOMRenderer`). Real defects fixed: the hamburger was rendered a **second time** inside `initialize()` and wired there, so the click handler was attached to an orphan element and the toggle never worked; `prepare()` never appended a hamburger at all; `sidebar` mode read `_config?.type` (an argument the registry never passes) instead of `this.config.type`; `div.actions` was filled with `li` nodes by looping array indices, duplicating the CTA that had just been appended as an `<a>`; `content` was never unwrapped, so a `{ content: { navigations } }` payload rendered an empty menu; the payload split mutated `content.actions`. Now: one `prepare()` for both types (`type` only wraps the shell), `splitMenuContent()` exported and tested, brand rendered through the shared `@menu>item>link` key, actions rendered flat, hamburger icon built with `createElementNS` instead of `innerHTML`, stable toggle handler with `aria-expanded`/`aria-controls` kept truthful on first paint, no `console.log`/`warn`. Verified: brand + 2 links + CTA, `ul#primary-navigations`, toggle `false→true→false`, no `li` inside `.actions`, zero console output. 7 new tests (113 total). |

| 2026-11-08 | Themes split into their own package group and a third theme added. `packages/themes/<id>/` now holds `default`, `horizontal`, `cyberpunk` (`@aio-ui/theme-*`); the engine (`ThemeRegistry` + `ThemeRenderer`) stays in `modules/theme` as `@aio-ui/theme`. A theme package depends on `core` types only — never on the engine — so the graph stays a tree and anyone can publish `@aio-ui/theme-<own>`. `bounds.mjs` learned the group (`themes: [core, utilities]`, components may reach themes, `theme*` specifiers categorised as `themes`, deep-import resolution searches the new folder); `docs/BOUNDARIES.md` documents it. New `CyberpunkTheme`: tokens only — `activate()` sets `data-theme="cyberpunk"` and `CyberpunkTheme.css` re-points the `--app-*` tokens (neon cyan/magenta, sharp 0.25rem radii, night surfaces), so every component restyles itself with no per-component code; the token block is declared on both the shell and `body:has(...)` because custom properties inherit downward only, otherwise the page behind the shell stayed light. Demo registers it and its chrome now reads tokens instead of literals. Verified `#kitchen?theme=cyberpunk`: shell `--app-primary-color: #00e5ff`, radius `0.25rem`, body/shell cyberpunk gradient, panel borders `rgba(0,229,255,0.28)`, 11/11 sections ok, no console output; switching back to `?theme=default` removes the marker. 124 tests / 16 files. Note: directory-level `git mv` on Windows fails while `node_modules/@aio-ui/*` junctions point into the folder — the files were moved individually and links refreshed with `npm install`. |

| 2026-11-08 | Theme switcher wired into a **fab menu** (`examples/demo/src/theme-switcher.ts`, included on all four routes). The contract is one hash change: `#<route>?theme=<id>` → `HashRouter` parses it → `AioApp` notices the theme diff, calls `ThemeRenderer.use()` and re-renders. The menu marks the active theme (`isActive`) and uses `closeOnSelected: false` so themes can be compared. `fab-menu` is now registered explicitly in the demo (`pageComponent`) so it can take `config` beside its payload. Two FabMenu defects surfaced while verifying: `.fab.bottom-right`/`.bottom-left` had their `left`/`right` swapped, and the panel's entry keyframe owned `opacity`, so when frames are frozen (background tab, throttled or reduced-motion setups) an **open panel stayed invisible** — the keyframe is transform-only now and `prefers-reduced-motion` disables it. Verified on `#kitchen`, `#product`, `#article`, `#form`: switch to cyberpunk sets the hash + `data-theme`, active item follows, page palette and 6 product cards survive the re-render; switching back to default clears the marker; zero console output. |

| 2026-11-08 | Theme registration got a proper door: **`app.theme`** (`register(theme)`, `use(id)`, `ids`, `current`) instead of forcing every theme through `registerModule(ThemeRenderer, { themes })`. Deliberately a namespace, not a third `register*` verb: `registerModule` and `registerPage` are structural (one-per-key), while a theme appends to a collection that already has an owner. `theme.register()` works before mount (queued, flushed while modules are created) and after (delegates to the port; throws a clear error if a custom port cannot accept themes). `theme.use()` goes **through the router** (`navigate(route, themeId, fragment)`), so the address bar, the persisted `active_theme` and the render stay truthful and a shared link behaves the same; without a router it just records the id. `ThemeRenderer` gained `register()` (registers templates too); `iThemePort` gained optional `register`/`ids`/`current`; `iThemePort.ids` is a **property** because the renderer exposes a getter (caught by the first browser run). Demo switcher now prefers `app.theme.use()`, with the hash as fallback. Also removed three stray `console.log`s in `HashRouter` (it printed the route list on every `navigate()`). Verified mounted: `ids` → `["default","cyberpunk"]`, `use("cyberpunk")` → hash/current/marker/storage all consistent, 6 product cards survive the re-render, menu path delegates to the same door, zero console output. 5 new DOM-free tests (129 total / 17 files). |

| 2026-11-08 | `AioApp` internal refactor, in two commits worth of work but one change: the class was carrying surface that existed because of how it was written, not because anything asked for it. **(1) Ports as a map.** Eight parallel private fields (`#registry`, `#router`, … `#http`) became one `#ports = new Map<iAppSlot, unknown>()` plus eight one-line getters, so create/release/iterate all walk one structure and `destroy()` no longer hand-nulls eight things. Module-level helpers `iPortRegistration()`, `createPort()`, `assembleShell()` and a `NO_HTTP` fallback replace five private methods (`#portOf`, `#createPort`, `#prepare`, `#assemble`, `#commit`, `#afterCommit`, `#scrollToFragment`, `#known`, `#useTheme`). Two new private methods carry the pipeline: `#paint(tree, page)` (replace children, set title, clear `body.style.overflow`, `animation.init`, scroll to fragment) and `#fail(route, message, error)` (log + `error` event). Private behaviour methods: 20 → 14, file ~810 lines. **(2) `mount()` → `render()`** across `iApp`, `AioApp`, both example entries and the docs — chosen on the user's reasoning: `mount` attaches something that already exists (a filesystem, a disk), while this call is the entry point that _turns a description plus a URL into a DOM tree that did not exist yet_, so `render` is the truthful verb. `#mounted` → `#rendered`, messages now say "must be called before `render()`", log event `render:init`. Verified `#kitchen`, `#product`, `#article`, `#form` all render (nav + fab present, 0 failed sections), `app.theme.use("cyberpunk")` still re-renders and moves the hash, zero console output. 129 tests / 17 files, boundaries clean, typecheck root+demo+gallery clean, both builds green. |

| 2026-11-08 | Events completed, both layers. **Contract** now lives at `@aio-ui/core/events` (`iPageEvents` extends `iComponentEvents`, plus `iPagePhase`/`iEventEmit`/`iEventCallback`) instead of being half-declared in `core/types/registry.ts` and half in the emitter package — `@aio-ui/app` may only import `core` types, so a contract that lived in the emitter forced the shell to type its port as `any`, which is exactly how four payload mismatches survived (`theme` vs `themeId`, `ready` without `elements`, `beforeRender` still in LandingPageBuilder shape, `error` without a phase). The shell's `iEventPort` is typed again; `EventEmitter` exports `emit` as `iEventEmit`. **Page events**: every event now names its route; `pageChanged` carries `previous`, `beforeRender`/`ready` carry `sequence`, `ready` carries the `id → element` map and is emitted _after_ `#ready()` (theme activated, `onReady` done) instead of before it; `error` carries `phase` (`prepare|preload|render|ready`); new `superseded` (a newer navigation won) and `destroyed` (emitted before the ports are released so a listener can unsubscribe). **Component events** are live: `registry.useEmitter(emit)` is called once by the shell, and `mergeBuildConfig()` injects the publisher into every builder config with order `theme < emitter < manifest < node`, so a component calls `config.emit?.(...)` without knowing whether a bus exists, a manual `config.emit` still wins (components stay framework-agnostic), and `emit: null` silences one instance. `mergeBuildConfig` is pure and tested (7 cases); selectors now merge per key _and_ per property, so a node overriding `{ "@menu": { id } }` no longer drops the theme's other `@menu` properties. ModeSwitcher stopped publishing `themeChanged` (a shell event) and publishes `modeChanged`. Verified in the browser on the demo: `pageChanged {route:"product", previous:"kitchen"}`, `beforeRender {sequence:2, components:3}`, `ready {route, elements:6, sequence:2}`, 8× `elementAdded` from real components, `themeChanged {theme:"cyberpunk", previous:"default"}` → `ready`, `superseded {route:"product", sequence:5, by:6}` on a double navigation with only the winner painting, `destroyed {route:"article"}` + shell removed, zero console errors. 141 tests / 19 files. |

## Form family — work list

Audited 2026-11-08 before touching code: 10.547 lines across 19 files, **0 tests**, `component-form`
chunk 171 kB (gzip 40,7) versus 19,85 kB for the next-largest component, and 6 of 8 sub-modules
never exercised in a browser (`cascade`, `multistep`, `calculation`, `upload`, `idAddress`, `table`).

- **Fase 0 — test foundation.** DOM environment for the form tests, and a `mountForm()` harness.
- **Fase 1 — field contract (`InputBuilder`).** One label path (`useLabel` is an on/off switch,
  default on, `position` honoured), full attribute mapping driven by one matrix
  (`maxlength/minlength/min/max/step/pattern/rows/cols/accept/multiple`), and
  `Attribute.ts#scanUnallowedAttrs` turned into a real validator instead of a last-key-wins boolean.
- **Fase 2 — submit payload (`Form`).** Own value collector: same-named checkboxes → array,
  multi-select → array, files kept out of `data`, unchecked reported explicitly; adapter
  `afterReset` hook (closes the `TODO`).
- **Fase 3 — declared config must be used.** `title`/`description`/`name`, one `multistep` source
  (`this.config`, not the `prepare()` argument), `className` not doubled.
- **Fase 4 — lite vs core for real.** `Input` stops importing `Dropdown`/`FileUploader`/
  `InputControls` statically; presets actually selectable; measure the chunk before/after.
- **Fase 5 — features proven in a browser.** Cascade, multistep, `required` + validation message,
  upload, idAddress, table-editor on the demo.
- **Fase 6 — docs & cleanliness.** `FIELD-TYPES.md` synced with the real type matrix, dead
  `console.log`/comments/mojibake removed, `Form.css` audited.
- **Fase 7 — packaging.** (21) `IdAddress` uses `fetch()` directly (`id-address-builder.ts:1253`);
  route it through `@aio-ui/http-service` (or an injected data source) instead, declared as a real
  dependency. (22) Split handlers/sub-modules (cascade, multistep, validation, calculation,
  uploader, idAddress, table) into installable packages so they can be pulled on demand rather than
  riding inside `@aio-ui/form`.

Note on `title`: it is **not** the HTML `title` attribute — it is the legacy shorthand for
`[id, name, label, placeholder]`, read as the label text (`input.label ?? input.title`). Renaming it
would break every consumer schema, so it stays an alias; the attribute matrix must therefore treat
`title` as structural (it never becomes a DOM attribute).

| 2026-11-08 | Form family, fase 0–1. **Fase 0:** `happy-dom` as a dev dependency, and the first DOM-aware tests in the repo (`// @vitest-environment happy-dom` per file, suite default stays `node`) — the form family had **zero** tests before this. **Fase 1 — `InputRegistry`:** one matrix row per field type answering the three questions that used to be answered in three places: which selector renders the control, which DOM attributes the type accepts, and which keys are structural. `Input.prepare()` now renders from the registry instead of a `switch`, and `applyAttributes()` only writes attributes the type accepts (`maxlength` on a checkbox is dropped instead of landing in markup). `Attribute.ts#scanUnallowedAttrs` was a last-key-wins loop that returned `true` if _any_ key was allowed, and kept its own copy of the matrix; it now delegates to `scanInputAttributes()` and reports `{ accepted, rejected, structural, ok }`. Defects fixed on the way: the checkbox rendered **two** labels (`useLabel` is a switch, default on — the label is now rendered once, from `config.position` only); `radio` rendered `checked` unconditionally; flat `options` written on the schema (the demo's own shape) were ignored, so the size select was empty; `false` on `required`/`disabled`/`readonly` produced an attribute anyway (a `Set` membership test written as `in`, which made every demo field disabled) — boolean attributes are now presence-only and absent when false. `title` is documented as the legacy label shorthand (`label ?? title`), never the HTML `title` attribute, so it stays structural and out of the matrix. Verified in the browser: 7 fields, one label each, no `data-position` invented, select offers S/M/L/XL, and a submit dispatches `formSubmit` with `{ name: "Budi", size: "L", … }`; zero console errors. 162 tests / 20 files. |

| 2026-11-08 | Form family, fase 1b — **`InputRegistry` is a module registry, not the type matrix**. Correction after review: "input registry" means registering the input _sub-modules_ so they can be installed/omitted on demand, the same shape `FormRegistry` already uses for the form engines. So the type matrix moved to `FieldTypes.ts` (pure data: control selector, allowed attributes, structural keys) and `InputRegistry.ts` now declares the adapters: `dropdown`, `file`, `controls`, `popover`, with `LITE_INPUT_MODULES` (empty — the field and nothing else) and `CORE_INPUT_MODULES` presets. `InputBuilder` no longer imports `DropdownBuilder`, `FileUploader` or `InputControlsBuilder`: it owns a `ModuleLoader` (`config.modules`, defaulting to the core preset) and calls `renderControl`/`decorate`/`mount` on whatever is registered; precedence is module → type matrix → plain `<input>`, so a project can own a type the registry has never heard of. The statics `collectFiles`/`parseCsvTable`/`initFileAdapters` now resolve through the default preset instead of naming `FileUploader`. Ids and interfaces live in the leaf `InputModuleTypes.ts`, because a definition importing `INPUT_MODULE_IDS` from the registry that imports the definitions closes a cycle and leaves the ids `undefined` (the form family solved this the same way) — first test run surfaced it immediately. Behaviour is unchanged except that a missing adapter now degrades instead of breaking: no `controls` module means `config.actions` renders nothing, no `file` module means a file field is a plain input. Chunk size is unchanged (173.69 kB vs 171.24 kB) **on purpose**: the definitions are still statically wired into the preset, so the saving only arrives with fase 4/7-22 (lazy load + installable packages) — the structure is what changed today. 4 new tests (custom module owns a type, lite preset drops the action set, plain field stays plain); 166 total. Verified in the browser: 7 fields, one label each, select S/M/L/XL, `formSubmit → { name: "Siti", size: "XL" }`, zero console errors. |

| 2026-11-09 | File handling leaves the input layer. `FileUploader.parseCSVToTable` was a parser that took a **form id** — so the input layer had to know about tables, and `Table.FormAdapter` had to ask the input layer for data it already held (`fileInput.files[0]`). It now lives in `@aio-ui/utilities/parseTableFile` as pure functions (`detectDelimiter`, `splitCsvRows`, `parseTableText`, `parseTableRecords`, `parseTableFile`) — text in, `{ header, body, footer }` out, testable without a DOM — and the table module parses the file it owns. The three file statics are gone from `InputBuilder`: `initFileAdapters` became `mountInputModules(root)` in the registry (used by `Input.FormAdapter.mount` and `Cascade`), `collectFiles` became the module's raw `getFiles(formId): Record<string, File[]>`, `parseCsvTable` became the table's own call. The capability is now report-only and gated by installation: the file module wires `config.onFileSelected(files, field)` with raw `File[]` and re-announces the selection as `elementChanged { type: "@field>file", data: { field, files } }`; no file module in the preset means the callback never exists and a file field is a plain input. Reporting is wired **before** the uploader UI is constructed, so a failing preview cannot take the data channel with it. Form submit no longer implies a file payload: new `iFormConfig.files` is `"ignore"` by default, or a callback `(files, form) => …` whose return value is merged — Drive serialization is now a decision, not a side effect. `FileUploader.parseCSVToTable` deleted (dead), `FileUploader.getFiles`/`getFilesForGoogleDrive` kept as the uploader's own API. 19 new tests (5 file-module, 14 parser); 185 total / 22 files, boundaries clean, both builds green. Verified in the browser: 7 fields, one label each, select S/M/L/XL, `formSubmit → { name: "Rani", size: "S" }`, zero console errors. |

| 2026-11-09 | Checkbox label positioning fixed, and a correction to yesterday's diagnosis: the `data-position="right"` I dismissed as "inherited through the reactive proxy" was the demo's own `position: "right"` on the field — the proxy was innocent, and reading `position` from `config` only is what broke the demo. `Input.prepare()` now accepts both spellings (`{ position }` on the field, `config.position`) and defaults a **toggle** (`checkbox`/`radio`) to `right` when neither is given, because the switch grid (`grid-template-areas` under `:has(> label[data-position=…])`) never matches without a hint and the label then stacks on top of the toggle. Verified in the browser by geometry, not by eye: label `data-position="right"`, control at x=239 w=47, label starts at x=291, `overlaps: false`. 3 new tests (toggle default, explicit position from field/config, plain text stays without a hint); 188 total / 22 files. |

| 2026-11-09 | Inline field groups, as **rows** — a new layout container rather than a flag on `group`, because `group` already means `<fieldset>` + `<legend>` and overloading it with `display` made the element type and the legend rules ambiguous. Schema: `{ label, column: N, row: [ … ] }` where `column` is the **column count** (default 2, clamped 1..16) and each child's share comes from the existing-but-until-now-unused `config.wide` (`50` = half, `0.5` = half as a fraction, `"auto"` = whole row) or an explicit `span`. Children wrap on their own once the columns run out; a row nests inside a row, so a stacked column is `{ column: 1, wide: 50, row: [...] }` and no separate `column` container is needed (`column` is a number here, so reusing the word for a container would collide). New `FormLayout.ts` holds the arithmetic as pure functions (`columnsOf`, `spanOf`, `childSpanOf`, `applyRowSpan`, `applyRowColumns`) — 14 node-only tests. `Form` gained `@form>row` / `@form>row>title` selectors, a `"row" in input` branch in `prepare()`, and `renderRow()` which mirrors `renderGroup`'s child handling (raw HTML, nested row, nested group, field) plus the cascade `hold()` path `${parent}.row.${i}`; `Cascade.walkInputs()` and `collectFieldSteps()` now walk into `row` too, or a conditional child inside a row would never be evaluated. CSS got a `7b. Row Layout` block that must use `.field.group.row` (two classes lose to the base `.native.form .field { display: block; width: 100% }` — the first attempt rendered a perfect grid that stayed stacked, caught by measuring rects rather than eyeballing the DOM), children drop their block width/margin, `grid-column: span var(--span, 1)`, heading/note span `1 / -1`, and one column under 640px. `row`/`column`/`wide`/`span` added to the structural keys so they never become DOM attributes. Verified in the browser at 1280px: `display: grid`, columns `236px 236px`, `first` and `last` on the same line (x=128 / x=382), `street` span 2 at full 490px, title 490px, no `<legend>`; at 500px everything collapses to one 323px column. Demo has an `Identitas pemesan` row. 204 tests / 24 files. |

| 2026-11-09 | Toggle radios and a class-name pass. `config.style: "toggle"` now renders a **radio** in the same switch shell a checkbox uses: new `@field>toggle` selector (shared by both, type comes from the field) chosen up front in `prepare()` instead of rendering the native dot and discarding it, and the switch CSS matches `input:is([type="checkbox"], [type="radio"])` in one `:is()` per rule instead of a duplicated block. A radio without the style keeps its native dot — a group of options should not become a wall of switches unless the schema asks. Verified by clicking: initial `courier` checked, clicking `pickup` unchecks `courier` (group semantics intact), both toggles keep `data-position="right"` with no label overlap, checkbox unchanged. Class names follow the short/hyphen-free convention: the row container is now just `.field.group` (the `.row` class is gone; the CSS hook is the `[data-column]` attribute `applyRowColumns` already writes, which also keeps the older single-field inline variant `.field.group[data-display]` untouched), `group-title` → `.title`, `group-desc` → `.desc`, and all new rules stay nested-style. Browser check at 1280px: row `display: grid`, cells 236/236 side by side, `street` 490 full row, `.title` 490, no `.row` class anywhere. 208 tests / 24 files. |

| 2026-11-09 | Form fase 2 — the submit payload stops lying. `Object.fromEntries(new FormData(form))` was the collection, which drops every unticked checkbox, collapses several checkboxes sharing a name to the last value, and keeps only the last option of a multi-select. New `FormValues.ts#collectFormValues(form)` states the rules explicitly: fields as strings, `select[multiple]` as an array, a lone checkbox as `true`/`false` (an unticked "agree" is information), several checkboxes with one name as the array of ticked values, a radio group as the checked option or **omitted**, files never (uploads are `config.files`), and disabled controls/buttons skipped like a real submission. The collector reads `form.elements` and groups by name, so it needs no DOM beyond the form. Also closed the reset `TODO`: new `iFormAdapter.reset(form)` hook, called by `#resetForm()` right after `form.reset()`, used by both `complete()` and the `reset()` helper — the browser restores its own controls, the modules clear what they own (preview table, uploader list). Removed a stray `console.log("found string submit button")`. Verified through the builder: `formSubmit → { name, email, size: "L", qty: "2", agree: false, delivery: "courier", … }` — `agree` and `delivery` simply were not in the payload before. 14 new tests (9 collector cases, 5 submit cases through `FormBuilder`); 222 total / 26 files. |

| 2026-11-09 | Two cleanups. **(1) Selector property types unified.** `iElementProperty` and `iActionProperty` were the same shape in practice (the second only added `label/href/src/isActive/isRoot/onClick`), so every consumer wrote `iElementProperty | iActionProperty` or `any` and the checker learned nothing. The action fields moved into `iElementProperty`, `iActionProperty` was deleted, and all 13 files / 37 references now use one name — plus `attributes` (the list form `applyAttributeList` already accepted) is declared, `Base._applyNodeAttributes(selector)` is typed instead of `any`, and `resolveConfig()` no longer casts selectors to `Record<TType, any>` (`iBuilderSelectorsConfig` is now `Record<TType, iElementProperty>`). No runtime change; typecheck of packages + both examples clean. **(2) `excludeEmpty` on the form.** Keeping `""`/`false` keys is right for an **update** payload: the backend must be able to tell "clear this cell" from "this column was not part of the form". It is wrong for an insert, where an absent key and an empty one mean the same thing — so `collectFormValues(form, { excludeEmpty })` drops `""`, `false` and empty arrays when asked, and `iFormConfig.excludeEmpty` (default `false`) exposes it. 3 new tests (default keeps, opt-in drops, a ticked checkbox with a real value survives). 225 tests / 26 files. |

| 2026-11-09 | Form fase 3 — every key `iFormConfig` declares now reaches the DOM. `title`/`description` render as `h2.title` / `p.desc` above the first group (new `@form>title` / `@form>desc` selectors), `name` lands on the element, `className` is added token-by-token instead of string-concatenated (concatenation appended a second copy on every re-render and left double spaces), and a multistep form is marked with `classList.add("multistep")` for the same reason. Two declared-but-decorative hooks are now wired: `onSubmit(data)` fires with the completed payload (after adapter contributions, wrapped so a throwing consumer cannot stop the dispatch) and `resetOnSubmit` clears the controls **before** the consumer answers — the payload is already captured, so a second entry can start while the first uploads. Also fixed a two-source bug: `prepare()` gated the multistep hold on the `_config` argument while the rest of the file read `this.config.multistep`, so a form built with `config.multistep` through `create()` could hold steps in one place and not mark them in the other. Nested group `className` uses `classList.add` too. 10 new tests (7 config→DOM, 3 submit hooks); 235 total / 27 files. Verified in the browser: `#form-demo-order-form`, `className="native form loading"` with no doubled token, payload unchanged. |

| 2026-11-09 | Form fase 5 (first half) — cascade and multistep finally run in a browser, and both had real defects. **Cascade gained a hold mode**: `config.cascadeMode: "template" | "hidden"`. `template` (default) plants a `<template>` and builds the element only while the condition holds — which is exactly why `IdAddress` could not work: its chained selects need a live element to inject the response of the previous query into. `hidden` builds the item during `prepare()` and only toggles `hidden` + `data-cascade-hidden` (the attribute exists because Form.css keeps `[hidden]` fields in the flow), so nothing is rebuilt and an injected option survives the toggle — pinned by a test that stamps a marker, toggles twice, and expects the marker still there. The build path moved into `#build()` so both modes and both containers (group, row) share it; `FormCascadeHost` gained `renderRow`. **Multistep's Next gate never worked**: it called `fieldset.checkValidity()`, and a fieldset does **not** validate its descendants — proven with a synthetic fieldset holding a required empty input (`fs.checkValidity() === true`, `form.checkValidity() === false`) — so every step advanced regardless of `required`. Replaced with per-control validation (`#stepIsValid`) that reports the first invalid control and still calls `reportNativeInvalid` for the toast. Verified in the browser: empty required email blocks on step 1 (toast "Periksa Kembali — 'Email' — Please fill out this field."), filling it walks 1→2→3, and submitting from the last step yields `{ "ms-email": "budi@example.com", "ms-city": "Bandung", "ms-agree": false }`. Demo now has two forms on `#form`: the single form (cascade `hidden` with a courier note driven by the delivery radio) and a 3-step multistep form. 9 new tests (5 cascade, 2 gate, plus DOM wiring); 242 tests / 28 files. |

| 2026-11-09 | IdAddress loses its internal HTTP stack (fase 7-21, done early because it blocked fase 5). The picker carried fetch + AbortController + timeout + its own localStorage cache **and** a hardcoded Google Apps Script deployment URL — which is why the address cascade never worked anywhere but that deployment. Now: `IdAddressConfig.loader(query)` (dry data source, preferred), `config.service` (share the app's `HttpService`), or `url` (the builder builds a service from it). `getRegionalData()` is three lines; `_fetchAPI()` is a thin adapter that forwards the query and unwraps the envelope (`HttpService` returns `{ success, data, meta }`, the picker wants `data`). Deleted: `_abortControllers`, `_validateCache`, `_loadCache`, `_writeCache`, the cache-key builder, and the whole fetch/timeout block — 1750 → 1574 lines. `HttpService` gained `destroy()` (it is an app module; `port.destroy?.()` must have a door) and now exports `iHttpServiceConfig`. The adapter no longer hardcodes an endpoint: it reads `config.address` (`loader`/`service`/`url`) and warns once, with the setting name, when address fields exist but no source is configured — that silence is what hid the problem. `@aio-ui/http-service` is now a declared dependency of `@aio-ui/form`. Demo has a real address group driven by a mock loader tree. Verified in the browser: `propinsi 31 → kota [3171] → kecamatan [317101] → kelurahan`, kodepos auto-filled from the chain, and the submit payload carries `address-propinsi: "31"`, `address-kota: "3171"`. 6 new tests (loader, envelope unwrap, bare payload, fail-fast on no source, injected service not destroyed); 248 tests / 29 files. Known gap: `IdAddress.FormAdapter.beforeSubmit` maps `<level>_name` onto a control literally named `<level>`, while the demo names them `address-<level>`, so resolved _names_ still do not land — the ids do. Convention decision, queued for fase 6. |

| 2026-11-09 | Demo wired to the **real** address endpoint (the mock tree is gone), which immediately exposed a bug in the shared HTTP layer: `HttpService._constructCacheKey()` built the key from the query's **key names only** (`Object.keys(query).join("-")`), so `{ level: "kota", parentId: 12 }` and `{ level: "kecamatan", parentId: 3273 }` collapsed onto one key and the first level's rows were served for every later level — the picker received province rows, found no `kota_id`, and rendered empty options. The key now includes values (sorted, so `{a,b}` and `{b,a}` still match). Two tests pin it: different parent ids must fetch twice, the same query in a different key order must hit the cache once. Verified against the live deployment in the browser: 34 provinces → JAWA BARAT (12) → 21 cities → BANDUNG (161) → 62 districts, all through `HttpService` with its own cache, zero console errors, and the submit payload carries `address-propinsi: "12"`, `address-kota: "161"`. 250 tests / 29 files. |

| 2026-11-09 | Form fase 5 (second half) — **upload and the table editor are now proven in a browser**, and both had gaps. `FileUploader` worked, but nothing in a form could produce a CSV preview: the table module listens for `input[type="file"][data-uploader-csv]` and no field ever set that attribute, so the whole `parseTableFile → TableBuilder` path was unreachable from a schema. A `file` field now opts in with `config.csv: true` (the input layer still parses nothing — it only declares the file as tabular), the demo has a `Berkas` group with one tabular field and one photo field, and a submit carries `product-csv: [{nama, harga, stok}, …]`. The preview's payload key was hardcoded to `product`; it is now the field's own `name`, so two CSV fields cannot overwrite each other. Two things the module wiring hid: **`Table.ts` never imported `Table.css`** (the import was commented out) and the demo registry had no `table` entry, so the preview rendered as an unstyled bare `<table>` — a table built directly by a form module never passes through the registry, so the component now ships its own stylesheet; and **a form field was built with `new InputBuilder({ formId })` only**, no `themeId`/`namespace`/`emit`, so `elementChanged` from a field never reached the application bus while the form itself published fine. The host's builder config is now threaded through `iFormModuleContext.builderConfig` (fields) and `FormCascadeHost.fieldConfig` (conditional fields). Verified in the browser: `elementChanged {type:"@field>file", field:"product-csv", files:1}` twice, thumbnail for the image, preview table right after the field with headers `#/nama/harga/stok/Actions` and typed values (`harga: 150000`), styled by the component CSS (padding 11.9/15.2, radius 3.8px, header fill). 255 tests / 29 files. |

| 2026-11-09 | **Stylesheets go back through the loader** — every `import "./X.css"` inside a component is gone (`Accordion`, `Dropdown`, `FileUploader`, `InputControls`, `Message`, `Table`, plus the eight commented-out ones). A static CSS import is resolved by the bundler, so the sheet rides inside the JS chunk: it is downloaded with the component _and_ injected again by the lazy loader, which is exactly what the lazy loader exists to avoid — and it broke `Table.css` in the other direction (nobody injected it, so the CSV preview rendered naked). The seam is now `@aio-ui/core/Stylesheets`: `useStylesheetAssets(styles)` is called by the `ComponentRegistry` constructor with the host's own map, and `ensureStylesheet("./Table.css")` resolves a component's relative declaration against that map (exact specifier → normalized → **by file name**, because a component cannot know the host's key layout), then writes exactly one `<style id="rajutan-lazy-css__…">`. `Builder.create()` calls it on every build, so a component built _outside_ the registry (a table inside a field, a dropdown inside an input) is styled by the same path; `FileUploader` is not a `Builder` and asks in its constructor; `Dropdown` regained the `stylesheet` it had blanked to `""`. The registry's own `injectCssString` now delegates to the same seam and id scheme, so preload-then-build and a nested builder cannot double-inject. "Ready" is verified against the DOM, not just remembered. Hosts declare the sheets they used to get for free: `Dropdown.css`, `FileUploader.css`, `inputControls.css`, `Message.css` are in both asset maps. Verified in the browser: form page → 5 `<style>` (form, dropdown, uploader, table, fabmenu), kitchen → form → 15, **zero duplicates**, table padding 11.9/15.2 back, zero console errors. 261 tests / 30 files. |

| 2026-11-09 | **Control sets are scoped** — `InputControlsBuilder` used to act on one control (`parentElement.querySelector(...)`), so a `<fieldset>` was impossible. The unit of work is now a **scope**: every operation (lock/unlock, copy, add, delete, search) enumerates the scope's controls, and the same builder serves a field and a group. Group wiring follows the table pattern: `Form.renderGroup()` offers the fieldset through `iFormAdapter.renderActions` → `Input.FormAdapter` → `InputRegistry.mountControls()`, so `FormBuilder` never learns that a button exists and a preset without the `controls` module silently has no buttons. Two stated points implemented: (1) **edit policy** — with `edit` the scope starts locked (`<select>`/non-text → `disabled`, text-like → `readOnly`, `data-locked` on the scope) and Save locks it again; without `edit` the scope must not be left locked, and "locked by the set" is answered by the set's own bookkeeping (`data-locked` + per-control snapshot) because `readOnly`/`disabled` reflect to attributes and an author's lock looks identical. When `edit` *and* `save` are both declared they are a pair — one enabled at a time — instead of appending a second `Simpan` next to the existing one. (2) **`search`** is a read: collects the scope with `collectFormValues` (same vocabulary as submit; signature widened to accept a fieldset/wrapper), dispatches a bubbling `search` CustomEvent, puts the query in `context.result`, marks the scope `.searching`/`aria-busy` while an async `onClick` runs, and Enter inside a text control triggers it. Also fixed on the way: buttons are `type="button"` (a set inside a form could submit it), `delete` refuses to remove the form, `add` numbers clones per base id (`rec-1` → `rec-1-1`, not `-2`) and the clone's buttons act on the clone, and group buttons get a solid surface + header-corner placement (they were inheriting the translucent input fill and were unreadable). Verified in the browser: `search → {"lookup-invoice":"INV-77","lookup-status":"Diproses"}`, customer group `locked → edit → unlocked → save → locked` with the value kept, one button enabled per state, zero console errors. 275 tests / 31 files (+14 in `InputControls.test.ts`); new `docs/INPUT-ACTIONS.md`. |

| 2026-11-09 | `iBasicInputNode.editable` now means what it says: a field marked `editable: true` stays writable **even when the scope has an `edit` action**. `InputBuilder` writes the marker as `data-editable="true"` on the `.field` wrapper (one attribute, so no control kind has to know about the lock), and `InputControls._lock()` skips any control whose ancestor carries it — which is what makes the rule work per field inside a locked group (a record viewer with Edit/Save can still keep one live field). `config.editable` is accepted as well as the node-level key, and `editable` joined `INPUT_STRUCTURAL_KEYS` so the attribute scan stops reporting it as an unknown attribute. Verified in the browser on the `customer` group: locked → `name.readOnly === false` (editable) while `tier.disabled === true`; Edit opens both; Save locks the tier again and leaves the name open. 276 tests / 31 files (+1). |

| 2026-11-09 | Control sets gain **pair presets**: `iActionType` adds `editor` (edit+save) and `repeater` (add+delete), and `actions` accepts a mixed array — `["editor", { type: "copy", onClick }]`. A bare name is a preset (built-in behaviour, label from the type, no callback); an object stays literal. `actionMode` was dropped (fragile string joining, and it duplicated `actions`). Normalisation happens once, in the module's `renderActions`, so groups, rows and fields share it. Also fixed: a **row** is now a scope like a group (`Form.#appendActions` used by both), a **repeated group** inherited the locked DOM as its baseline so Edit could never open the clone, and a **dropdown** was never locked — its hidden value input stayed live and `closest(".dropdown")` matched the box itself, so it went unhandled. Browser: `customer` 4 buttons locked→Edit→unlocked→Save→locked with `customer-name` always writable, clone `customer-1` opens on Edit, row `row-record` has Edit/Save with both inputs locked, `lookup` shows Search/Copy. 282 tests / 31 files. New `AGENT_RULES.md`. |

| 2026-11-09 | `Form.renderGroup` handled `string`, `group` and fields — a `{ row: [...] }` child fell through to the field renderer, so a nested row rendered as **one nameless input** instead of a grid. Added the missing `row` branch (reusing `renderRow`, keeping the cascade path at `${path}.group.${i}`); the demo's `row-record` now renders `div.field.group[data-column="2"]` with both fields and its Edit/Save set. 283 tests / 31 files. |

| 2026-11-09 | **Cascade finished.** Two real holes closed, both created by the control set. (1) The engine tracked *one* element per conditional path (`hiddenItems`/`placeholders` maps + `querySelector`), so a repeated group's copy was never driven: sync now toggles **every** instance stamped with a path, and template mode builds/unmounts per placeholder. (2) Conditions resolved by field name against the whole form, so a copy's own inputs (`sku-1`) could not drive it; resolution is now scoped to the instance (`[data-instance]`, set by `duplicate`), and a field built inside a copy gets the copy's suffix so ids do not collide. Also: `duplicate()` dispatches `scopeAdded`, which `Form` forwards to the cascade — a fresh copy starts from its own empty values instead of inheriting "conditional field visible". Browser (locked row scope): initial note hidden → Edit+type SKU → visible → Save keeps it visible and re-locks → repeat → **clone's note hidden** → type in clone → clone visible, source unchanged. 285 tests / 31 files (+2 covering both hold modes). |

| 2026-11-09 | **Packaging pilot: `@aio-ui/form-cascade`.** The cascade engine moved out of `@aio-ui/form` and no longer imports form internals: `#build` asks `host.renderField()` for a field and `host.mountInputs()` to wake adapters, so the package has **no runtime dependency** on the form (`@aio-ui/form` is a peer for types only). The contracts it implements (`FormCascadeHost`, `iFormCondition`, `iCascadeEventDetail`, `iCascadeState`, `FormCascadeMode`, `CascadeBlockedInfo`) moved into the form's `FormModuleTypes`, which also removed the Cascade↔Validation type cycle. Same batch: `iCalculationFormula` + context types extracted to `CalculationTypes.ts`, so `InputBuilder` no longer imports a form handler (first step toward a standalone `@aio-ui/input`). Gate 285 tests / 31 files, demo build OK, browser: cascade in the locked row still `hidden → visible → save keeps it → clone starts hidden → clone fills → source unchanged`. |

| 2026-11-09 | **Subpath map over the form package** (decision: group by owner, not by consumer). `@aio-ui/form-cascade` dissolved back into `@aio-ui/form` as `adapters/Cascade.ts` with the entry `./cascade-adapter`; the package gained a real `exports` map (35 entries, enumerated from every deep import in the repo — `.`, `./Input`, `./FormModuleTypes`, `./InputRegistry`, `./Form.css` + the three nested sheets included), so a typo in a specifier now fails at resolve time instead of silently reaching a file. Everything else keeps its owner: input modules stay out (they belong to `@aio-ui/input`), and `table`/`message` bridges must live under their own package to avoid re-creating the form→table cycle. 285 tests / 31 files, boundaries clean (deep imports now validated through the map), browser: cascade in the locked row still `hidden → visible`, no console errors. |

| 2026-11-09 | **`@aio-ui/input` is its own package.** Moved out of `@aio-ui/form`: `Input`, `FieldTypes`, `Attribute`, `InputModuleTypes`, `InputRegistry`, `FormValues`, `CalculationTypes`, `Popover.InputModule`, plus the three adapters as subpaths (`./dropdown`, `./file-uploader`, `./controls` — no `input-` prefix, as agreed). Nothing in it imports the form anymore (`FormValues` moved here so `controls`/`search` read control values without reaching into form). `@aio-ui/form` now depends on `@aio-ui/input` and keeps only form-owned code (`Form`, `FormLayout`, `FormModuleTypes`, `FormRegistry`, `Input.FormAdapter`, `Handlers/*`, `adapters/Cascade`, `IdAddress`, `Form.css`); its exports map shrank to match and the input package got its own. Hosts updated: demo type import → `@aio-ui/input/Input`, and both asset maps key the sheets as `@aio-ui/input/{dropdown,file-uploader,controls}.css`. Four test files moved with their subject. Verified: gate 285 tests / 31 files, boundaries clean, `component-input` chunk appears (16.4 kB) and `component-form` drops 204.9 → 188.6 kB; browser: cascade `hidden → visible`, uploader + dropdown mount (sheet `__aio-ui_input_dropdown_css`), dropdown locked as a unit (`data-locked`, hidden input disabled), controls `Edit/Save(off)/Add/Delete`. |

| 2026-11-09 | **Form adapters are subpaths, and the form no longer imports `table`/`message`.** `Handlers/*` became `adapters/*` with entries `./cascade-adapter`, `./multistep-adapter`, `./validation-adapter`, `./calculation-adapter` (the `./Handlers/*` entries are gone). `CORE_FORM_MODULES` now contains only what the form owns; `tableFormAdapter` and `messageFormAdapter` are composed by the host — `new ModuleLoader("form", [...CORE_FORM_MODULES, tableFormAdapter, messageFormAdapter])` — so the `form → table → form` cycle is gone and `@aio-ui/table` left the form's dependencies. Host (`examples/demo`) composes the set for both forms via a `formModules()` factory (a fresh loader per form, since the loader owns module instances). Verified: gate 285 tests / 31 files, boundaries clean, `component-form` 188.6 → **155.7 kB** while `component-table` grew to 46.7 kB (adapter now rides with its owner); browser: CSV preview 2 rows, multistep validation toast `.message` appears, controls `Edit/Save/Add/Delete`, no console errors. |

| 2026-11-09 | **`@aio-ui/id-address` is its own package** — the exception from the map. Entries: `.` (builder), `./adapter`, `./adapter.native`, `./adapter.base`, and `./form` (the bridge). The builder half depends only on `@aio-ui/http-service` + `module-loader`; `@aio-ui/form` is an **optional peer**, used by the `./form` entry alone — so the picker still works with neither form nor input installed. Its adapter left `CORE_FORM_MODULES`: the host composes it (`@aio-ui/id-address/form`). `component-form` 155.7 → **134.9 kB**, new `component-id-address` 20.8 kB. Verified: gate 285 tests / 31 files, boundaries clean, browser: 35 provinces → JAWA BARAT → 22 cities (DEPOK first) through the real endpoint, no console errors. |

| 2026-11-09 | **IdAddress is independent down to its stylesheet.** The package now ships `id-address.css` — only what the picker itself contributes (`loading`/`error` on the `[data-level]` controls it decorates, `--app-*` tokens with fallbacks), because it never renders fields and must not restyle them; the base look stays with whoever renders the controls (`@aio-ui/input`, `@aio-ui/form`, or the host). `IdAddressBuilder.init()` requests the sheet through `@aio-ui/core/Stylesheets`, and the host declares it in its `styles` asset map — same seam as every other component, injected exactly once (`rajutan-lazy-css____aio-ui_id-address_id-address_css`, 992 chars, no duplicate). Answer to "just ask people to install form.css": no — `Form.css` is 1.6k lines scoped under `.native.form` and would give a standalone picker a form's look. README updated where the HTTP extraction made it wrong: install entries (+ the optional `form` peer and the sheet), a new **Styling** note, and the **Cache System** section rewritten around `{ url | service | loader }` + `HttpService` (cache key = query values). Verified: gate 285/31, browser 35 provinces → 22 cities, zero console errors. |
