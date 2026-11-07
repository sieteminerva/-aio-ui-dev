# Monorepo Migration Task for AI Agent

## Role

You are a careful repository migration agent. Your task is to analyze the existing AIO framework project and incrementally reorganize it into a maintainable monorepo without changing runtime behavior.

The migration must prioritize correctness, traceability, and reversible steps over speed.

## Primary Objective

Analyze the existing project and split the framework source into the following monorepo structure:

```txt
aio-framework/
├── package.json
├── tsconfig.base.json
├── tsconfig.json
├── packages/
│   ├── core/
│   ├── base/
│   ├── styles/
│   ├── modules/
│   ├── utilities/
│   └── components/
│       ├── form/
│       ├── masonry/
│       ├── table/
│       ├── article/
│       ├── rating/
│       ├── message/
│       └── ...other-component/
├── examples/
|   ├── profile/
|   ├── gallery/
|   ├── blog/
|   ├── ecommerce/
│   └── news/
└── scripts/
```

The current gallery project must remain runnable as an example application after the migration.

## Important Constraints

1. Do not rewrite framework logic unless required to repair an import or package boundary.
2. Do not change public behavior, DOM structure, selector conventions, CSS nesting style, or runtime lifecycle behavior.
3. Preserve existing CSS class names and component selector conventions.
4. Do not introduce new naming conventions without documenting the reason.
5. Do not publish anything to npm.
6. Do not create a Git commit or branch.
7. Do not delete source files until their replacement path is verified.
8. Preserve existing user changes and unrelated files.
9. Use `index.ts` files as public barrels instead of exposing deep internal paths.
10. Keep generated `dist/` files out of source control unless the repository already requires them.

## Phase 1: Repository Audit

Before editing anything:

1. Read all applicable `AGENTS.md` files.
2. Inspect `package.json`, `tsconfig.json`, `vite.config.ts`, and all build scripts.
3. List every file under `src/lib`.
4. Identify imports and dependencies between:
   - `DOMRenderer`
   - `ComponentRegistry`
   - `Base`
   - `BaseAdapters`
   - `Modules`
   - `Utility`
   - `Styles`
   - `Components`
5. Identify all dynamic imports, `import.meta.glob` paths, CSS loading paths, and Vite-specific assumptions.
6. Identify which components are used by the current gallery application.
7. Produce an audit report before moving files.

The audit report must include:

- current file path;
- proposed package;
- direct dependencies;
- CSS dependencies;
- whether the file is public or internal;
- migration risk;
- required import path changes.

## Phase 2: Define Package Boundaries

Use these boundaries unless the audit proves a different placement is required.

### `packages/core`

Move or expose:

- `DOMRenderer`;
- `ComponentRegistry`;
- framework interfaces and contracts;
- shared registry types.

Core must not import concrete UI components.

### `packages/base`

Move or expose:

- `Base`;
- `BaseAdapters`;
- shared builder lifecycle behavior.

Base may depend on core, but core must not depend on base.

### `packages/styles`

Move global styles only:

- variables;
- reset styles;
- layout styles;
- typography styles;
- shared component styles.

Do not move component-specific CSS into this package.

### `packages/modules`

Move optional application modules such as:

- router;
- HTTP service;
- animation service;
- build store;
- event emitter.

Modules may depend on core, base, or utilities where necessary.

### `packages/utilities`

Move reusable utilities such as:

- metadata helpers;
- selector parsing;
- attribute utilities;
- generic helpers;
- file or data utilities.

Utilities must not import concrete components.

## Interface and Type Organization

The current `src/lib/interface.ts` contains multiple kinds of contracts. Do not keep every interface in one global file after migration.

Split interfaces according to ownership.

### Core public contracts

Move framework-wide contracts to `packages/core/src/contracts/`:

```txt
packages/core/src/contracts/
├── content.ts
├── builder.ts
├── registry.ts
├── lifecycle.ts
└── index.ts
```

These contracts may include:

- node content definitions;
- renderer contracts;
- builder lifecycle contracts;
- registry contracts;
- shared event and render proxy types;
- public configuration primitives.

The public barrel should expose only stable contracts:

```ts
export type * from "./content";
export type * from "./builder";
export type * from "./registry";
export type * from "./lifecycle";
```

### Base contracts

Types specific to the abstract builder lifecycle belong in:

```txt
packages/base/src/contracts/
├── base-config.ts
├── adapter.ts
└── index.ts
```

`base` may import public types from `core`, but `core` must not import types from concrete components or from `base`.

### Component-local contracts

Component-specific types must stay inside the component package:

```txt
packages/components/masonry/src/
├── Masonry.ts
├── Masonry.types.ts
├── Masonry.css
└── index.ts
```

Examples of local types:

- Masonry item payload;
- Masonry filter configuration;
- Masonry-specific selector map;
- Masonry pagination callbacks.

Do not place these types in core merely because they are used by the registry.

### Module-local contracts

Module-specific interfaces belong beside the module:

```txt
packages/modules/http-service/src/
├── HttpService.ts
├── HttpService.types.ts
└── index.ts
```

### Shared data contracts

Only genuinely cross-package data models should be moved to a separate package:

```txt
packages/contracts/src/
├── api.ts
├── data.ts
└── index.ts
```

Do not create a shared contracts package prematurely. Start with `core/contracts` and extract a separate package only when multiple independent packages need the same domain types.

## Registry Typing and Component Independence

The current `iBuilderRegistry` must not force `core` to import every component. Prefer an extensible registry contract.

Core can define the base shape:

```ts
export interface BuilderRegistryMap {
  [key: string]: unknown;
}
```

Component packages can extend it through a type declaration or generated registry type. The component package owns its own config and payload types.

The dependency direction must remain:

```txt
core contracts
      ↑
base contracts
      ↑
component contracts
```

Never make `core` import `Masonry`, `Form`, or `Table` only to describe their types.

## Interface Migration Rules

When migrating `src/lib/interface.ts`:

1. Classify every type before moving it.
2. Mark each type as public, package-internal, or component-local.
3. Move public framework contracts to `core/contracts`.
4. Move builder lifecycle contracts to `base/contracts`.
5. Move component-specific contracts beside their component.
6. Update imports through package barrels.
7. Remove duplicate type definitions only after all references are updated.
8. Run type checking after each package group.

Do not perform a mechanical file split without checking generic constraints, registry keys, builder types, and import cycles.

### `packages/components/*`

Each component should become an independently selectable package containing:

```txt
component-name/
├── package.json
├── tsconfig.json
├── src/
│   ├── ComponentName.ts
│   ├── ComponentName.css
│   └── index.ts
└── dist/
```

Each component package must declare its own dependencies explicitly.

## Phase 3: Add Package Metadata

Create a package-level `package.json` for every package.

Use private workspace dependencies during monorepo development:

```json
{
  "dependencies": {
    "@aio-ui/core": "workspace:*",
    "@aio-ui/base": "workspace:*"
  }
}
```

Each package must define:

- `name`;
- `type`;
- `main`;
- `types`;
- `exports`;
- `build` script;
- explicit dependencies.

Use `index.ts` as the package public barrel.

Example:

```ts
export { DOMRenderer } from "./DOMRenderer";
export { ComponentRegistry } from "./ComponentRegistry";
export type * from "./interfaces";
```

## Phase 4: Configure the Root Workspace

Create or update the root `package.json`:

```json
{
  "name": "@aio-ui/framework-monorepo",
  "private": true,
  "workspaces": ["packages/*", "packages/components/*", "examples/*"]
}
```

Add root scripts for:

- installing dependencies;
- type checking;
- building all packages;
- running the gallery example;
- testing all packages where tests exist.

Do not remove the ability to run the existing gallery project.

## Phase 5: TypeScript and Build Output

Create a shared `tsconfig.base.json` and package-specific TypeScript configs.

Each package should compile:

```txt
src/SomeFile.ts
        ↓
dist/SomeFile.js
dist/SomeFile.d.ts
dist/SomeFile.js.map
```

`dist/` is generated output. It must not be manually edited.

Build order must respect dependencies:

```txt
utilities → core → base → modules/components → examples
```

Use TypeScript project references or an equivalent dependency-aware build process if necessary.

## Phase 6: Import and Runtime Migration

Replace internal deep imports with package imports or workspace aliases.

Avoid imports such as:

```ts
import { DOMRenderer } from "../../packages/core/src/DOMRenderer";
```

Prefer:

```ts
import { DOMRenderer } from "@aio-ui/core";
```

Update all affected:

- TypeScript imports;
- dynamic imports;
- `import.meta.glob` paths;
- stylesheet paths;
- Vite aliases;
- ComponentRegistry manifests;
- example project imports.

Pay special attention to lazy component loading and CSS injection. Verify that component styles are still discovered and injected after the move.

## Phase 7: Preserve the Gallery Example

The current gallery application becomes `examples/gallery` or remains the root example temporarily if moving it would create unnecessary risk.

It must still support:

- Vite development server;
- production build;
- dynamic component loading;
- component stylesheet loading;
- current routes;
- current content files;
- current CSS behavior.

## Phase 8: Validation Checkpoints

After each migration group:

1. Run TypeScript type checking.
2. Run the relevant build.
3. Inspect generated import paths.
4. Verify that no old source path remains unexpectedly.
5. Check the gallery in the browser.
6. Confirm that CSS is loaded for every selected component.

Required final checks:

```bash
npm install
npm run typecheck
npm run build
npm run dev
```

If a command cannot run because of environment restrictions, report the exact command and reason.

## Phase 9: Final Report

At the end, report:

- files moved;
- files created;
- packages created;
- import paths changed;
- build configuration changes;
- remaining risks;
- commands successfully run;
- commands not run and why.

Do not claim the migration is complete unless the gallery example builds successfully and the package boundaries are internally consistent.
