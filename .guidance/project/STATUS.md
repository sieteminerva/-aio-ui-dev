# Project Status

## Current State

- Portfolio home content has been developed in English.
- Indonesian home content exists separately in `src/content/home_id.ts`.
- About content exists in `src/content/about.ts`.
- Portfolio categories and archive direction have been defined.
- Masonry component is being refined for responsive item distribution.
- Monorepo and AIO Kit generator plans have been documented.
- Registry architecture: one shared kernel (`core/Registry`) plus registries built per need. The universal-registry / `AppRegistry` hub is **dropped** (see `.archives/ReusableModuleRegistry_plan.md`).
- Form-specific module registry migration has been planned without implementing it yet.
- The reusable registry kernel is implemented under `src/lib/Registry/` and covered by Vitest (20 tests).
- `ComponentRegistry` now stores builder registrations through the kernel while keeping its public API, lazy stylesheet loading, and hydration gating unchanged.
- `SlotRegistry` was reviewed and intentionally left independent: it stores live DOM children, not resolvable definitions, so it has no kernel fit yet.
- `ModuleRegistry` is a definition store; `ModuleLoader` owns load/unload, dependency ordering, reverse-order teardown, and applies each definition's `matches()` (13 tests).
- Every Form engine and collaborator is a module: `validation`, `cascade`, `multistep`, `calculation`, `input`, `idAddress`, `table`, `message`.
- `FormBuilder` imports no implementation; it imports types, module ids, presets, and the loader only. Field rendering goes through the `input` module's `renderField` hook.
- `DropdownBuilder`, `InputControlsBuilder`, and `FileUploader` are grouped as `InputAdapters/` owned by `InputBuilder`; `Cascade` no longer imports `FileUploader`.
- Presets are exported data: `CORE_FORM_MODULES` (all eight modules, default) and `LITE_FORM_MODULES` (input module only).
- `ModuleLoader` has 16 tests; there is still no DOM-level test for `FormBuilder` itself.
- Browser check on the wizard testbed (`#form`): cascade mounts conditional fields, idle, uploader view container attaches, and a selected CSV builds a preview table. `IdAddress` also runs; its API fetch fails here only because the external Apps Script endpoint is unreachable.
- Presets are exported data: `CORE_FORM_MODULES` (default) and `LITE_FORM_MODULES` (empty).
- `FormBuilder` still constructs `InputBuilder` (field rendering) and `MessageBuilder` (its own toast); both are core to form rendering rather than optional collaborators.
- No content file currently renders a form, so the module path is opt-in and app behaviour is unchanged.

## Active Focus

Prepare this gallery project to become a reliable example project for the AIO framework monorepo and future website generator. The next framework focus is activating the Form runtime in a real example and migrating a second module (`calculation`), then `cascade` and `multistep`.

## Known Follow-up

- Connect About content to routing.
- Build the actual portfolio data model.
- Add gallery project detail pages.
- Add blog/content module.
- Design and implement i18n switching.
- Extract framework packages after the example behavior is stable.
- Implement the shared registry kernel and only the adapters a feature actually needs.
- Refactor optional Form features behind `FormModuleRegistry`.
- Compose modules with `registerModule` and registries per need; the `AppRegistry` hub idea is dropped.
- Add Vitest coverage for the `ComponentRegistry` adapter; this requires a DOM environment such as `jsdom`.

## Last Updated

2026-11-07
