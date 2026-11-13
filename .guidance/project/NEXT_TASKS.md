# Next Tasks — single queue

One queue for all three projects. Order inside a lane = priority.
Lifecycle: `plan.md` (why) → **this file** (queue) → `STATUS.md` (top 3 in progress).
An item lives in exactly one file: it starts here, moves to `STATUS.md` when work begins, and is
**deleted** when done (proof lives in `git log` / `DECISIONS.md`). See `AGENT_RULES.md` §9.

## Framework (`packages/`, `examples/demo`)

- [ ] **Restructure the anti-FOUC gate — it is too convoluted for what it does.** The current
      shape spans six places: `HydrationGate` (class, 5 methods, `#holdRoot`, `isLoaded`),
      `Builder.hydration` + `isLoaded` accessors, `BuilderPort.releaseHydration` (base→core
      indirection), `ComponentRegistry._launchPostLoadInstance` + `_stylesReady`/`_stylesLoading`,
      `Stylesheets.ready`/`loading`, and `isStylesheetPending`. Target: **one** function that takes
      a root + specifier, marks it, releases it when `ensureStylesheet` settles, and nothing else —
      no gate object, no per-instance flag, no adapter method. Decide the public-API break
      (`HydrationGate` is exported from `@aio-ui/base` and listed in `PUBLIC-API.md`/`api-map`) and
      the version bump before deleting it.
- [ ] Sync the `#form` demo documentation with what the page actually does (`examples/demo/src/pages/form.ts`
      grew states, the Id Address cascade, the CSV table and `stateBlock`); check `DEMO.md`
      §Page components, `FIELD-TYPES.md` and the form package README against the code.
- [ ] Give `#kitchen/<name>` a teardown path: `AioApp.#release()` runs only when the route name
      changes, so a fragment switch never calls `onDestroy` and no page can destroy its builders.
      Needs an instance registry (or a controller-owned list) plus `KitchenPage.onDestroy`.
      _Why it matters: `Dropdown` already ships the abort pattern and `Carousel`/`Masonry` have
      working `destroy()`s — nothing calls them. The next builder that adds a global listener or a
      timer will leak exactly like batch 15's two cases._
- [ ] Review `AioApp` entry/render output, then define and implement `isRoot` builder semantics
      (default host wraps; `isRoot: true` replaces the host with the builder root). See `plan-generator.md` §3.11.
- [ ] Fix and validate the Masonry column distribution.
- [ ] Audit remaining `TemplateRegistry` and page registration references.
- [ ] Activate a `ModuleLoader` in a real Form instance and verify both paths in the browser.
- [ ] Add a jsdom regression test for the file adapter mount order (adapter must see its `.field` parent).
- [ ] Verify a real form in the browser with the CORE preset and with the manifest presets.
      _(The `LITE_FORM_MODULES` variant was removed; preset sets are manifests now.)_
- [ ] Notify collaborators on form reset so their held state (CSV table, address detail) is cleared.
- [ ] Add typed `TemplateRegistry` and `PageRegistry` adapters.
- [ ] Add Vitest coverage for the `ComponentRegistry` adapter (needs `jsdom`).
- [ ] Define `AppRegistry` as the application registry composition container.
- [ ] Migrate Form optional features through `FormModuleRegistry`.

## Gallery (`examples/gallery` — profile model)

- [ ] Connect `AboutContent` to the router.
- [ ] Decide the first portfolio data schema.
- [ ] Create selected work records for each major category.
- [ ] Add project detail content with problem, process, result, and media.
- [ ] Add archive browsing and filtering.
- [ ] Add Flash game archive fallback using Ruffle or gameplay media.
- [ ] Create blog content model.
- [ ] Add English and Indonesian content objects consistently.
- [ ] Add language switcher after content structure is stable.
- [ ] Make gallery the first generated profile example.

## Generator (`orchestrator/`)

- [ ] GitHub release workflow: tag → `verify` → `release.mjs` → `publish-cdn.mjs` → upload assets.
- [ ] Verify `npm i <tarball>` from a clean folder (bundler project) and a Node ESM import.
- [ ] Feed `parsePreset()`/`parseAiContent()` issues back to the model verbatim (retry loop).
- [ ] Regenerate `layout.json` inside the release workflow so the map cannot describe a moved package.

## Examples — manual model references (official release gate)

- [ ] `store` reference: catalog, product, cart, checkout with a real data shape _(paused;
      `product` now composes grid + detail itself — re-check before resuming)_.
- [ ] `profile` reference: home, services, contact, portfolio.
- [ ] `blog` reference: home, post list, post, about.
- [ ] Document each reference's boundaries: capabilities it proves and avoids.

## Rules (docs & process)

- [ ] Delete an item once it is done — this file holds open work only.
