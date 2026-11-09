# Documentation Rules

## Declaration Documentation

When creating or updating a function, method, class, or meaningful variable, add or update the documentation block immediately above the declaration.

For JavaScript, use complete JSDoc. For TypeScript, use JSDoc compatible with TypeDoc.

The documentation should include:

- a concise purpose;
- a `@summary` explaining briefly how the declaration works;
- every parameter with its name and type;
- the return type and meaning;
- thrown errors, when applicable;
- a practical usage example;
- important side effects or lifecycle behavior.

Example:

```ts
/**
 * Registers a component factory in the registry.
 *
 * @summary Stores the factory under a stable component name so it can be resolved lazily when the renderer needs it.
 * @param name - Public component identifier.
 * @param factory - Function that creates or loads the component.
 * @returns The current registry instance for fluent configuration.
 * @throws {Error} When the component name is empty or already reserved.
 * @example
 * registry.register("masonry", createMasonry);
 */
register(name: string, factory: ComponentFactory): this {
  // Step 1: Validate the public component identifier.
  // Step 2: Store the factory in the registry map.
  // Step 3: Return the registry for chained configuration.
}
```

## Inline Process Comments

Inside a function, add concise comments in this format:

```ts
// Step 1: Normalize the incoming payload.
// Step 2: Resolve the required component.
// Step 3: Render the result and attach lifecycle handlers.
```

Use step comments only for meaningful logical stages. Do not comment every obvious assignment, loop, or language operation.

## Update Behavior

- Update stale documentation when behavior changes.
- Do not copy inaccurate comments forward during refactoring.
- Keep examples aligned with the current public API.
- Document reasons and side effects, not only syntax.
- Prefer concise explanations over decorative prose.
