# Reusable Module Registry Task

Use `AppRegistry` for application composition and `ModuleLoader` for optional module loading and activation.

## Objective

Analyze the current repository and implement a reusable, typed registry foundation without breaking existing component, template, page, module, or slot behavior.

## Instructions

1. Read all applicable `AGENTS.md` files and the project guidance under `.guidance/`.
2. Read `ReusableModuleRegistry_plan.md` and `src/lib/Components/Form/FormModuleRegistry_plan.md`.
3. Inspect the current `ComponentRegistry`, `TemplateRegistry` references, `SlotRegistry`, builder registration APIs, and any existing page registration logic.
4. Identify duplicated registry mechanics and document compatibility risks before editing.
5. Create the generic registry kernel under `src/lib/Registry/`.
6. Define strict TypeScript contracts for registry entries, options, scopes, factories, and lifecycle behavior.
7. Refactor `ComponentRegistry` to reuse the kernel while preserving its current public methods.
8. Design a typed `TemplateRegistry` adapter with instance-scoped storage instead of relying on a global static registry where practical.
9. Design and implement a `PageRegistry` adapter for lazy page controller factories.
10. Design the reusable `ModuleRegistry` adapter for optional Form, animation, CMS, and runtime modules.
11. Add a `RegistryHub` only if it improves composition without forcing Lite consumers to load Full runtime features.
12. Keep `DOMRenderer`, core builders, and Lite dependencies free from optional Full-only modules.
13. Preserve existing registration and resolution call sites through compatibility adapters where necessary.
14. Add focused tests or type-level checks for registration, resolution, duplicate handling, lazy creation, cleanup, and isolated registry scopes.
15. Update the relevant documentation and project status files.
16. Run the narrowest relevant validation first, then broader validation if practical.

## Non-goals

- Do not migrate every Form submodule in the same task unless the registry foundation is stable.
- Do not redesign unrelated component APIs.
- Do not introduce a universal untyped map.
- Do not remove existing public APIs without a migration path.
- Do not make optional modules mandatory dependencies of the core package.

## Expected Deliverables

- Generic registry kernel.
- Typed registry adapters where justified.
- Compatibility-preserving component registration behavior.
- Page factory registration support.
- Module registration contract suitable for the Form registry migration.
- Tests or validation evidence.
- Updated documentation describing migration decisions and remaining work.

## Final Report

Report:

- files added or changed;
- registry types implemented;
- compatibility behavior preserved;
- remaining hardcoded registry logic;
- validation commands and results;
- recommended next migration step for `FormBuilder`.
