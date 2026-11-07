# Reusable Module Registry Plan

## Objective

Create one reusable, typed registry foundation for components, templates, pages, optional modules, slots, and future framework extension points.

The goal is not to merge every registry into one untyped global map. The goal is to share registry mechanics while preserving domain-specific contracts and APIs.

## Naming Decision

- `AppRegistry` is the application-level composition container.
- `ModuleLoader` loads, enables, resolves, and unloads optional modules.
- `Registry<TValue>` is the reusable low-level storage and resolution primitive.
- `AioRegistry` is not the preferred internal name because it suggests a global singleton.

## Existing Registry Patterns

The framework currently contains or anticipates several registry types:

```txt
ComponentRegistry  → resolves component and builder factories
TemplateRegistry   → resolves theme and selector template overrides
PageRegistry       → resolves route-specific page controllers
ModuleRegistry     → resolves optional feature modules
SlotRegistry       → resolves attachable slot targets
```

These registries share operations such as registration, resolution, duplicate handling, removal, cleanup, and optional lazy loading.

## Proposed Architecture

```txt
Registry<TValue>
├── ComponentRegistry
├── TemplateRegistry
├── PageRegistry
├── ModuleRegistry
└── SlotRegistry
```

Each adapter keeps its domain-specific methods while delegating generic storage and lifecycle behavior to the base registry.

## Registry Kernel

Suggested location:

```txt
src/lib/Registry/
├── Registry.ts
├── RegistryTypes.ts
├── RegistryError.ts
├── RegistryScope.ts
└── index.ts
```

Suggested base API:

```ts
class Registry<TValue> {
  constructor(scope: string, options?: iRegistryOptions);

  register(id: string, value: TValue): this;
  resolve(id: string): TValue | null;
  has(id: string): boolean;
  unregister(id: string): boolean;
  clear(): void;
  entries(): iRegistryEntry<TValue>[];
}
```

Suggested options:

```ts
interface iRegistryOptions {
  duplicate?: "error" | "warn" | "replace" | "ignore";
  lazy?: boolean;
}
```

## Typed Adapters

### ComponentRegistry

Keeps component-specific behavior such as `build`, stylesheet loading, manifests, and dynamic component factories.

```ts
componentRegistry.build("masonry", data);
```

### TemplateRegistry

Uses an instance scope such as `template:default` or `template:cyberpunk` instead of a static global map.

```ts
const templates = new TemplateRegistry("default");
templates.register("@field", handler);
```

### PageRegistry

Stores page controller factories instead of eagerly created page instances.

```ts
pageRegistry.registerPage(
  "dashboard",
  (builder) => new DashboardPage(builder),
);
```

Factories allow lazy creation, clean route replacement, and independent page state.

### ModuleRegistry

Stores optional module factories with matching rules, dependencies, and lifecycle support.

```ts
moduleRegistry.register("file-upload", fileUploadDefinition);
```

## AppRegistry

The earlier `RegistryHub` concept is now named `AppRegistry`.

Full runtime may expose one composition container without forcing all consumers to use every registry:

```ts
interface iRegistryHub {
  components: ComponentRegistry;
  templates: TemplateRegistry;
  pages: PageRegistry;
  modules: ModuleRegistry;
  slots: SlotRegistry;
}
```

```ts
const registries = createRegistryHub({
  themeId: "default",
});
```

Lite can create only the registries it needs.

## Dependency Direction

```txt
Registry kernel
    ↓
Typed registry adapters
    ↓
Runtime registry hub
    ↓
Lite / Full presets and CLI-selected features
```

The kernel must not import Form, DOMRenderer, pages, animations, or application-specific code.

## Important Constraints

- Do not create one universal untyped registry for every value.
- Keep registry scopes explicit.
- Prefer instance registries over static global registries.
- Prefer factories for pages, modules, and stateful controllers.
- Preserve existing public APIs through adapters during migration.
- Make cleanup explicit and safe for multiple runtime instances.
- Keep optional modules out of core dependencies.
