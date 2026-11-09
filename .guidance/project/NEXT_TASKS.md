# Next Tasks

## Immediate

- [ ] Fix and validate the Masonry column distribution.
- [ ] Connect `AboutContent` to the router.
- [ ] Decide the first portfolio data schema.

## Framework Registry

- [x] Audit `ComponentRegistry` and `SlotRegistry` registration behaviour.
- [ ] Audit remaining `TemplateRegistry` and page registration references.
- [x] Implement the reusable registry kernel under `src/lib/Registry/`.
- [x] Adopt the kernel in `ComponentRegistry` with `duplicate: "replace"`.
- [x] Add the `ModuleRegistry` adapter with dependency ordering and teardown.
- [x] Migrate `validation` behind the Form module runtime, with the built-in path preserved.
- [ ] Activate a `ModuleLoader` in a real Form instance and verify both paths in the browser.
- [x] Migrate `validation`, `cascade`, `multistep`, and `calculation` behind module definitions.
- [x] Migrate `FileUploader`, `IdAddressBuilder`, and `TableBuilder` behind collaborator hooks (`mount`, `beforeSubmit`, `renderTable`).
- [x] Group `Dropdown`, `InputControls`, and `FileUploader` as `InputAdapters/` owned by `InputBuilder`.
- [x] Add the `message` module so `FormBuilder` owns no message renderer.
- [x] Verify the wizard form in a browser: mount hooks and CSV preview table work.
- [ ] Add a jsdom regression test for the file adapter mount order (adapter must see its `.field` parent).
- [ ] Verify a real form in the browser with the CORE preset and with the manifest presets.
      _(The `LITE_FORM_MODULES` variant was removed; preset sets are manifests now.)_
- [ ] Notify collaborators on form reset so their held state (CSV table, address detail) is cleared.
- [ ] Add typed `TemplateRegistry` and `PageRegistry` adapters.
- [ ] Add Vitest coverage for the `ComponentRegistry` adapter (needs `jsdom`).
- [ ] Define `AppRegistry` as the application registry composition container.
- [ ] Define `ModuleLoader` as the module loading and activation mechanism.
- [ ] Migrate Form optional features through `FormModuleRegistry`.

## Portfolio

- [ ] Create selected work records for each major category.
- [ ] Add project detail content with problem, process, result, and media.
- [ ] Add archive browsing and filtering.
- [ ] Add Flash game archive fallback using Ruffle or gameplay media.

## Content

- [ ] Create blog content model.
- [ ] Add English and Indonesian content objects consistently.
- [ ] Add language switcher after content structure is stable.

## Framework

- [x] Audit `src/lib` dependencies. _(2026-11-10 — migration complete)_
- [x] Extract core contracts and interfaces.
- [x] Create monorepo package boundaries. _(2026-11-10 — 34 packages, see `.guidance/RAJUTAN.md`)_
- [ ] Make gallery the first generated profile example.
- [ ] ~~Implement `aio new --type website --preset profile`.~~ Superseded by the Rajutan
      preset engine: AI content → `iWebPreset` → `plan/emit/generate` (`.draft/preset/`,
      `.guidance/RAJUTAN.md`).

## Process

- [ ] Update this file after completing a task.
- [ ] Move completed items to a short Completed section with date.

## Completed — 2026-11-07

- [x] Implemented the registry kernel: `Registry`, `RegistryError`, scope helpers, and type contracts.
- [x] Added Vitest with a dedicated `vitest.config.ts` and 20 kernel tests.
- [x] Refactored `ComponentRegistry` to delegate builder storage to the kernel.
- [x] Added `ModuleLoader` with `load`/`unload`, dependency ordering, and tests.
- [x] Split `ModuleRegistry` (storage) from `ModuleLoader` (lifecycle); presets are exported data.
- [x] Removed all handler construction from `FormBuilder`; engines load through `CORE_FORM_MODULES`.

## Completed — 2026-11-06

- [x] Added mandatory guidance for documentation and language conventions.
- [x] Documented the Form module registry design.
- [x] Documented the reusable registry kernel and migration task.
- [x] Decided to use `AppRegistry` and `ModuleLoader` terminology.
