# Project Decisions

## 2026-11-06 — Portfolio as Archive and Professional Entry Point

The website is both a professional portfolio and a personal archive. Selected work should be easy for clients to understand, while the archive can contain experiments and older work.

## 2026-11-06 — Portfolio Categories

Use four broad categories:

- Visual, Motion & Brand
- Software Engineering
- Product & Fabrication
- Music & Audio

Use tags for narrower disciplines such as web application, JavaScript library, animation, packaging, or CNC.

## 2026-11-06 — Locale Content

English and Indonesian content must be authored as separate, complete objects. Do not use partial runtime string translation for production content.

## 2026-11-06 — Framework Extraction

The portfolio project should become a real example of the framework before the framework is split into monorepo packages.

## 2026-11-06 — Registry Architecture

Registry implementations should share a generic typed registry kernel, but remain exposed through domain-specific adapters. `ComponentRegistry`, `TemplateRegistry`, `PageRegistry`, `ModuleRegistry`, and `SlotRegistry` should not be collapsed into one untyped global registry.

## 2026-11-06 — Application Composition Naming

Use `AppRegistry` for the collection of registries available to one application. Use `ModuleLoader` for loading, enabling, resolving, and unloading optional modules. Avoid using `AioRegistry` as the primary internal name because it implies a global framework singleton.

## 2026-11-06 — Form Module Boundaries

`FormBuilder` is a host and lifecycle orchestrator, not the owner of every optional feature. Input-level modules must be usable without a Form, while container-level modules receive a Form host context. Lite should load only selected modules; Full may provide broader presets.

## 2026-11-06 — Session Handoff

The next framework session should begin by auditing registry implementations and dependencies before changing `FormBuilder`. The monorepo extraction and registry work should be coordinated rather than performed as unrelated refactors.

## 2026-11-07 — Registry Kernel Is Storage Only

`Registry<TValue>` stores and resolves values; it does not load, instantiate, render, or inject styles. Lazy loading remains an adapter concern because `ComponentRegistry` values are themselves functions, so a kernel-level "lazy function" flag would be ambiguous and would break builder registration.

Consequent choices:

- `duplicate` defaults to `"error"` in the kernel so new adapters fail loudly on accidental collisions.
- `iRegistryOptions.lazy` from the plan is deliberately not implemented until a concrete adapter needs it.
- `resolve()` returns values, never instances. Adapters such as `ModuleRegistry` call `definition.create(context)` themselves.
- `onDispose` runs on `unregister()` and `clear()`, but not on duplicate replacement, because replacement is re-registration (HMR, preset rebuild), not disposal.

## 2026-11-07 — ComponentRegistry Keeps Its Behaviour

`ComponentRegistry` adopts the kernel with `duplicate: "replace"` because the previous `Map.set()` implementation overwrote silently. Its `clear()` still does not remove builder registrations, matching prior behaviour and avoiding route-change breakage. Lazy `import.meta.glob` loading, `?inline` CSS injection, the anti-FOUC ledger, and `HydrationGate` release stay inside the adapter.

## 2026-11-07 — SlotRegistry Stays Independent

`SlotRegistry` was reviewed and not migrated onto the kernel. It stores live attached DOM children keyed by slot, not resolvable definitions, and its `attach/detach` semantics do not match register/resolve. Forcing it onto the kernel would add an abstraction without a demonstrated need.

## 2026-11-07 — Vitest as the Test Runner

Vitest is used for framework validation, with a dedicated `vitest.config.ts` so the application `vite.config.ts` (base path, Lightning CSS targets, Rolldown chunk splitting) is not applied to Node test runs. Kernel tests use the `node` environment; adapter tests that need DOM will add `jsdom` when `ComponentRegistry` gains coverage.

## 2026-11-07 — Module Lifecycle Uses `load`, Not `create`

Module definitions expose `load(context)` and `destroy(instance)`. This follows the existing repository vocabulary:

- `create()` is reserved for declarations that produce DOM, matching `Base.create(content, config): HTMLElement`.
- `activate()` is reserved for page and shell controllers, matching `iHorizontalPage.activate(shell, elements)`.
- `load()` describes loading and wiring a sub-module, matching `ComponentRegistry.loadModule`.

The collision with `Builder.load(key)`, which reads a rendered node from the node store, is accepted because the receivers and contexts differ.

## 2026-11-07 — Form Modules Are Injected via `iFormConfig.modules`

Every Form engine (`validation`, `cascade`, `multistep`, `calculation`) is loaded through a `ModuleLoader`. `FormBuilder` contains no `new FormXHandler(...)` call and imports handler classes as types only.

Activation is decided by each definition's `matches()` predicate, not by `FormBuilder`:

- `cascade` — `config.cascading` or `config.autoDisableNextStep`, and it `requires` `validation`.
- `multistep` — `config.multistep`.
- `calculation` — `config.calculation`.

Presets are exported data in `FormModulePresets.ts`: `CORE_FORM_MODULES` (all adapters, the default when no loader is injected, preserving previous behaviour) and `LITE_FORM_MODULES` (input adapter only, so fields render without engines or collaborators). There is no `FULL` preset: the current set is core, not optional.

Rejected alternatives:

- A `useModuleRegistry` boolean in `iFormConfig`, which leaves two permanent code paths inside `FormBuilder`.
- Keeping a built-in fallback per feature, which reintroduces the hardcoding the module layer exists to remove.
- `createLiteRuntime` / `createFullRuntime` factories, which added a name and an indirection for three lines of assembly.

## 2026-11-07 — ModuleRegistry Stores, ModuleLoader Loads

`ModuleRegistry` is a definition store (`register`, `resolve`, `has`, `ids`). `ModuleLoader` owns lifecycle (`load`, `unload`, `resolveAll`, dependency ordering, teardown) and builds its registry from a scope plus a definition array. Consequences:

- `load()` applies the definition's `matches()` predicate, so callers never re-implement activation conditions.
- `load()` destroys any previous instance first, which matches repeated `FormBuilder.prepare()` rebuilds.
- `requires` is resolved before loading, and missing or cyclic dependencies raise `MISSING_DEPENDENCY` / `CYCLIC_DEPENDENCY` errors.
- `unloadAll()` tears down newest first so dependants release before their dependencies.
- `resolve()` returns definitions only; instances come from `load()`.

## 2026-11-07 — Form Engine Loading Phases

`validation`, `cascade`, and `multistep` load inside `prepare()` because they must exist while the schema is still being rendered: cascade and multistep hold placeholders for groups they own. `calculation` loads inside `initialize()`, after submit listeners are attached, because it reads final DOM including lazily mounted multistep steps.

## 2026-11-07 — Collaborators Participate Through Hooks

`FileUploader`, `IdAddressBuilder`, and `TableBuilder` are independent components, so they are modules built from the same loader. `FormBuilder` never imports them; it iterates its loaded modules and calls five optional hooks:

- `renderField(input, formId)` — create one field; the only mandatory hook, because a form with no renderer cannot produce anything.
- `mount(root)` — attach to the form once and to every lazily mounted multistep fieldset. Must be idempotent.
- `beforeSubmit(payload)` — mutate the submit payload (files, address names, CSV table).
- `renderTable(spec, target)` — build schema-driven tables for groups declaring `table`; first module returning nodes wins.
- `notify(content, target)` — present a status message; degrades to a console warning when no module handles it.

Consequences:

- Module load happens in two phases. `prepare` loads engines and collaborators; `initialize` loads modules that read final DOM (`calculation`). The phase is part of the module context, and `ModuleLoader.resolveAll()` skips modules that already hold an instance so a second phase only loads what becomes applicable.
- `FormBuilder` keeps a typed handle on an engine by calling `ModuleLoader.loaded(id)`, which never reloads.
- Registration order in `CORE_FORM_MODULES` is also mount order, so the uploader still mounts before the address picker.

## 2026-11-07 — Adapter Files Live Beside Their Component

A Form adapter lives with the code it adapts. Two shapes are used, chosen by need rather than by symmetry:

- **Separate file** — when the adapter accompanies a component that also works standalone outside the form. File: `<Component>.FormAdapter.ts`, exporting `<Component>FormAdapter`, and its implementation class uses the same name.
- **Same file** — when the adapter is only a definition whose sole consumer is `FormBuilder` and the handler already lives in that file. Splitting it added a file with no independent value.

| Adapter                  | File                                      |
| ------------------------ | ----------------------------------------- |
| `validationFormAdapter`  | `Form/Handlers/Validation.ts`             |
| `cascadeFormAdapter`     | `Form/Handlers/Cascade.ts`                |
| `multistepFormAdapter`   | `Form/Handlers/Multistep.ts`              |
| `calculationFormAdapter` | `Form/Handlers/Calculation.ts`            |
| `inputFormAdapter`       | `Form/Input.FormAdapter.ts`               |
| `idAddressFormAdapter`   | `Form/IdAddress/IdAddress.FormAdapter.ts` |
| `tableFormAdapter`       | `Table/Table.FormAdapter.ts`              |
| `messageFormAdapter`     | `Message/Message.FormAdapter.ts`          |

Only `FormModulePresets.ts` imports adapters; nothing else in the framework knows they exist.

## 2026-11-07 — Input Adapters Belong to InputBuilder

`DropdownBuilder`, `InputControlsBuilder`, and `FileUploader` live in `src/lib/Components/Form/InputAdapters/` and are owned by `InputBuilder`. Only `InputBuilder` imports them; every other layer reaches file data through `InputBuilder.initFileAdapters()`, `collectFiles()`, and `parseCsvTable()`. Each adapter imports its own stylesheet so it can be used standalone, and `FormBuilder` imports the two baseline input stylesheets as well so field appearance never depends on which input module is plugged in. Vite emits a single stylesheet, so the duplicate import adds no bytes.

`Cascade` no longer imports `FileUploader`: newly born DOM is handed to `InputBuilder.initFileAdapters()`, and the cascade predicate is asked of the loaded engine (`this.#cascade?.isCascadeItem()`), so `FormBuilder` imports no handler class as a value.

## 2026-11-07 — Every Form Feature Is a Plug-in Module

`FormBuilder` holds only a `ModuleLoader` and calls optional hooks on the loaded modules: `renderField`, `mount`, `beforeSubmit`, `renderTable`, and `notify`. The module set is `validation`, `cascade`, `multistep`, `calculation`, `input`, `idAddress`, `table`, and `message`.

Consequences:

- Unplugging a module never breaks field rendering. Only `renderField` is mandatory, and when it is missing the builder throws a named error instead of rendering an empty form.
- `notify` degrades to a console warning when the message module is absent, so feedback can be swapped or removed without touching the builder.
- `LITE_FORM_MODULES` contains just the input module: fields only, no engines, no collaborators, no toasts.
- `@aio-ui` integration stays open: a host can register its own definitions (custom message renderer, custom table) without editing `FormBuilder`.

## 2026-11-07 — Rejected Names for the Module Assembly Step

No factory exists now. Names considered and rejected: `createRuntime` (absent from every planning document), `ModuleLoaderGet`, `GetModule`, `ApplyModule`, `ModuleAdapters`, `LoadAdapters`, and `useModules`. Reasons: `get*` means retrieval in this repository, "adapter" already means a bridge layer (`BaseAdapters`, `BuilderProxy`), `use*` carries React hook semantics, and `apply*` / `load*` imply immediate action while a preset only declares data.

## 2026-11-07 — Form Modules Receive a Narrow Host Context

`iFormModuleContext` carries the form element, emitter, message host callback, and resolved config. It does not expose the `FormBuilder` instance, so sub-modules cannot reach into builder internals or depend on private state.

## 2026-11-07 — Input Adapters Mount After DOM Attachment

`InputBuilder` mounts an input adapter only after the element is appended to its `.field` wrapper. `FileUploader` resolves its host by `input.closest('.field')` at construction, so mounting earlier left `container` null: the uploader existed, its `change` listener worked, but no view container was attached and drag-and-drop was skipped — a silent half-broken state with no error.

Consequence: adapter mounting is the last step of `prepare()`, not part of the element switch. Any future adapter that resolves a parent container must follow the same rule.

Verified in the browser against the wizard testbed: uploader instance created with `container` set to the `.field`, view container connected, and selecting a CSV file produced a two-row preview table through the `table` module.
