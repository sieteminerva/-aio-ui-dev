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

| #   | Decision                                                                       | Rationale                                                                                                                            |
| --- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | LITE (`gallery`) is the trunk; FULL is not a superset                          | FULL is the older generation: no registry kernel, inline validation/cascade/multistep, legacy `EventBus`/`TemplateRegistry` slotting |
| D2  | Physical restructure happens before the rewrite                                | Rewriting first would move files twice and hide which failure belongs to which change                                                |
| D3  | Package scope is `@aio-ui/*`                                                   | Middle ground between `@aio-ui/framework/core` and `@aio/core`                                                                       |
| D4  | App shell lives in its own package, not `core`                                 | `LandingPage` level code touches registry, renderer, router and animation                                                            |
| D5  | Component manifest keeps exactly one shape                                     | Only the Style 3 manifest stays; the direct-builder, loadable-builder and promise variants are dropped                               |
| D6  | `ComponentRegistry` receives its `import.meta.glob` maps from the host         | A package cannot own an absolute Vite glob rooted at the host application                                                            |
| D7  | A component declares its sub-components through `modules` in its manifest      | Required for `packages/components/*` to be self-contained                                                                            |
| D8  | `Base` exposes a static port (`iComponentSource`) that the registry plugs into | `ComponentRegistry` already imports `Builder`; the inverse import would be a cycle                                                   |
| D9  | `DOMTreeMemory` / `EventBus` metadata layer is deferred                        | It requires rewriting every component to emit intents instead of mutating the DOM                                                    |
| D10 | `examples/gallery` is the live example application                             | Keeps one runnable end-to-end target at all times                                                                                    |

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

| Phase | Scope                                                  | Status                     |
| ----- | ------------------------------------------------------ | -------------------------- |
| 0     | Monorepo restructure, zero behavior change             | in progress (0.1–0.2 done) |
| 1     | AppShell contract (interfaces only)                    | not started                |
| 2     | `ComponentRegistry` rewrite to the agreed contract     | not started                |
| 3     | PageController contract + one reference implementation | not started                |
| 4     | AppShell implementation, `main.ts` reduced             | not started                |
| 5     | Port remaining FULL components                         | not started                |
| 6     | Themes, `ThemeRenderer`, generator pipeline            | not started                |
| —     | `DOMTreeMemory` / `EventBus` metadata layer            | deferred                   |

---

## Phase 0 — Monorepo restructure

Goal: physical layout matches §4, application still runs, no behavior change.

### 0.1 Baseline

- [ ] Create a restore point (`git add -A && git commit`)
- [x] Record `npx tsc --noEmit` output — clean (after fixing `Tab` `rootElement` collision)
- [x] Record `npm test` output — 3 files, 42 tests passed
- [x] Record `npm run build` output — succeeded in 592 ms, `dist/assets/main-*.js` 77.90 kB
- [ ] Record all routes rendered at `http://localhost:5175/gallery/` (`#home`, `#form`, `#blog`, `#about`, `#gallery`)
  - Verified: `home` 122 nodes, `form` 75, `blog` 115, `about` 63, `gallery` 31; lazy `<style>` count grows 2 → 3 → 4

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

- [ ] Move `HashRouter`, `EventEmitter`, `HttpService`, `Animations` to `packages/modules`
- [ ] Verify the animation behaviours still bundle

### 0.8 Move components one at a time

Order: `message` → `rating` → `masonry` → `article` → `table` → `form`.
Each component is its own gate: the route that uses it must render identically.

- [ ] `message`
- [ ] `rating`
- [ ] `masonry`
- [ ] `article`
- [ ] `table`
- [ ] `form`

### 0.9 Move the application

- [ ] Move `index.html`, `vite.config.ts`, `src/main.ts`, `src/content/**`, `public/` to `examples/gallery`
- [ ] Verify all five routes

### 0.10 Document the boundaries

- [ ] Write `docs/BOUNDARIES.md` with the import rules actually proven during migration
- [ ] Add a boundary check to the verification gate

---

## Phase 1 — AppShell contract

Deliverable is a contract document plus interfaces. No implementation.

- [ ] Define `iAppShellConfig`: `container`, `pages`, `menu`, `footer`, `defaultRoute`, `theme`, `debug`
- [ ] Define `iAppShellSource`: the shape the CMS/generator produces
- [ ] Define what the shell may know (registry, renderer, router, animation) and what it must not
- [ ] Define the registry requirements demanded by the shell, as input for Phase 2
- [ ] Decide how route content and the preload graph are derived from `pages`
      (`buildersForRoute` must disappear)

## Phase 2 — ComponentRegistry

- [ ] Reduce `RegisterFn` to a single manifest signature
- [ ] Remove `LoadFn`, `dummyLoadFn` and the unused branching in `build()`
- [ ] Add `modules` to the component manifest and resolve it during preload
- [ ] Make the preload graph recursive
- [ ] Namespace `_resolvedCache` keys per module
- [ ] Implement `iComponentSource` (`has`, `resolve`) and register it with `Base`
- [ ] Add `Base.sub(id)` with a single warn-once policy
- [ ] Split asset loading into a `ComponentLoader` if the class keeps growing
- [ ] Tests: manifest resolution, module preload, missing module policy

## Phase 3 — PageController

- [ ] Finalize `iPageController` (`onPrepare`, `onReady`, `onDestroy`, `attachMenu`)
- [ ] Implement one reference controller for the wizard route
- [ ] Verify the wizard route end to end

## Phase 4 — AppShell implementation

- [ ] Implement the shell against the Phase 1 contract
- [ ] Reduce `main.ts` to configuration plus registration
- [ ] Add a `debug` channel: resolved manifests, preload graph, missing `sub()` lookups
- [ ] Verify all routes, including route switching and re-render

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

- [ ] Resolve the missing CSS for `Footer` and `Section`
- [ ] Confirm the `Product` split and its CSS coverage
- [ ] Remap `Menu` slotting
- [ ] Register each ported component in the example app and verify rendering

## Phase 6 — Themes and generator

- [ ] Port `ThemeRenderer` and the three themes (`Default`, `Cyberpunk`, `Horizontal`)
- [ ] Port `BuilderTransformer` (no imports) and `FormSchemaTransformer` as `@aio-ui/utilities`
- [ ] Add `aio.config.json` manifest handling
- [ ] Generate `main.ts` from the manifest

## Deferred

- [ ] `DOMTreeMemory` + `EventBus` metadata layer — only after the shell is stable and a
      concrete diff/regeneration requirement exists

---

## 6. Verification gate

Run after every step in Phase 0 and before marking any task complete.

```bash
npx tsc --noEmit        # types
npm test                # 42 registry/module tests
npm run build           # production build, lightningcss must not fail
```

Plus a manual check of `http://localhost:5174/gallery/` for `#home`, `#form`, `#blog`,
`#about`, `#gallery`.

## 7. Open questions

| #   | Question                                                                                     | Affects       |
| --- | -------------------------------------------------------------------------------------------- | ------------- |
| Q1  | `Footer` and `Section` ship without CSS — resolved: they relied on global styles. Ignored on purpose. | closed        |
| Q2  | `Product` split into three builders — resolved: leftover of an abandoned module/submodule experiment. Ignored for now. | closed |
| Q3  | Should `Menu` be remapped now or dropped from the port list until the shell exists?          | Phase 5       |
| Q4  | `docs/` target folder for technical documentation (currently `.archives/docs`)               | Phase 0.10    |

## 8. Change log

| Date       | Change                                                                                                                                                               |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-07 | Plan created. Reference material archived by the user into `.archives/`.                                                                                             |
| 2026-11-07 | Baseline recorded: `tsc --noEmit` clean, 42 tests pass, build succeeds. Renamed `Tab.tabRoot` (was `rootElement`) to resolve a collision with `Builder.rootElement`. |
| 2026-11-07 | Step 0.2 done: `ComponentRegistry` now receives `{ modules, styles }` instead of owning `import.meta.glob`. All five routes verified.                                |
| 2026-11-07 | Steps 0.3–0.5 done: workspace skeleton, `packages/styles`, `packages/utilities`, and `interface` moved to `packages/core`. Build output byte-identical.               |
| 2026-11-07 | Step 0.6 done: `packages/core` (`DOMRenderer`, `ComponentRegistry`, `Registry`, `BuilderPort`) and `packages/base` (`Base`, `BaseAdapters`). Shared `aliases.ts`. All routes verified. |
