# Form Module Registry Plan

## Objective

Decouple optional Form capabilities from `FormBuilder` so each feature can be loaded only when required.

`FormBuilder` should remain a host and orchestrator. It should not hardcode every optional feature such as table editing, file upload, ID address, calculation, cascade, multistep, or validation.

## Current Problem

`FormBuilder` currently imports and initializes several submodules directly. This creates unnecessary coupling:

- A simple form may load features it never uses.
- `InputBuilder` and `FormBuilder` overlap in feature ownership.
- Features such as file upload or ID address cannot be entered independently through an input-level API.
- Adding a new Form feature requires modifying the central Form implementation.
- The Lite and Full variants become harder to keep consistent.

## Proposed Scope Model

### Input-level modules

These can be used without `FormBuilder`:

- Dropdown
- File upload
- ID address
- Popover
- Input actions
- Calculation fields

### Container-level modules

These need a form or another lifecycle host:

- Cascade
- Multistep
- Validation
- Table editor
- Form submission lifecycle

## Form Registry

The Form layer should own a typed registry instance:

```ts
const formModules = new ModuleRegistry("form", {
  duplicate: "warn",
  lazy: true,
});
```

The registry should resolve modules by capability rather than forcing `FormBuilder` to import every implementation.

```ts
const cascade = formModules.resolve("cascade", {
  builder: formBuilder,
  config: formBuilder.config,
  inputs,
});
```

The Form builder should also support resolving all matching modules:

```ts
const modules = formModules.resolveAll({
  scope: "form",
  config: formBuilder.config,
  inputs,
});
```

## Module Definition

Each Form module should provide metadata and a factory:

```ts
interface iFormModuleDefinition<TContext = unknown, TResult = unknown> {
  id: string;
  enabled?: boolean;
  requires?: string[];
  matches?: (context: TContext) => boolean;
  create: (context: TContext) => TResult;
}
```

The module lifecycle should support, where needed:

- `initialize(context)`
- `mount(context)`
- `refresh(context)`
- `destroy()`

## Initial Module Mapping

```txt
FormModuleRegistry
├── cascade
├── multistep
├── validation
├── calculation
├── table-editor
├── file-upload
└── id-address
```

The registry should not automatically enable every module. Presets or the application entrypoint should decide which modules are available.

## Input Integration

`InputBuilder` should resolve input-level modules independently:

```txt
InputBuilder
├── native input
├── dropdown when type = dropdown
├── file-upload when type = file or config requests it
├── id-address when the input schema requests it
├── popover when config.popover exists
└── calculation when config.calculator exists
```

This allows an input to use a module without requiring a complete Form instance.

## FormBuilder Responsibilities After Refactor

`FormBuilder` should remain responsible for:

- building the form structure;
- providing a host context;
- exposing group and field rendering callbacks;
- coordinating module lifecycle;
- handling final form submission;
- disposing module instances during rebuild or destroy.

It should not own the implementation details of every optional feature.

## Lite and Full Variants

### Lite

Load only the core registry and explicitly selected input modules.

```ts
createLiteRuntime({
  modules: ["dropdown"],
});
```

### Full

Load Form lifecycle modules and advanced integrations through a preset or explicit configuration.

```ts
createFullRuntime({
  modules: [
    "cascade",
    "multistep",
    "calculation",
    "file-upload",
    "id-address",
    "table-editor",
  ],
});
```

## Migration Order

1. Define the reusable registry contract.
2. Create a Form-scoped registry adapter.
3. Move validation, cascade, multistep, and calculation behind module definitions.
4. Move input-level integrations behind input module definitions.
5. Replace direct Form imports with registry resolution.
6. Preserve existing Form APIs during migration.
7. Add explicit Lite and Full registration presets.
8. Remove obsolete hardcoded initialization only after behavior is verified.

## Acceptance Criteria

- A plain input does not initialize Form-only modules.
- A simple form does not load table, ID address, or file upload logic unless requested.
- Input-level modules work without `FormBuilder`.
- Form lifecycle modules receive a consistent host context.
- All created module instances can be destroyed cleanly.
- Existing Form schemas remain compatible during migration.
