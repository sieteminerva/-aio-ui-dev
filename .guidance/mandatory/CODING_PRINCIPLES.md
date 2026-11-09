# Coding Principles

- Understand before changing.
- Remove unnecessary layers, dependencies, and repetition.
- Keep names explicit and consistent with the existing system.
- Do not introduce abstractions without a demonstrated need.
- Preserve established selector, class, and nesting conventions.
- Prefer composable modules over large global files.
- Keep types close to the package or component that owns them.
- Use comments to explain decisions, not obvious code.
- Validate focused changes before broad changes.
- Never claim completion without checking the relevant build or test.

## Justified Code Only

- Do not add functions, helpers, wrappers, or factories that have no significant role.
- A new helper must earn its place through at least one of: an abstraction that removes real duplication, a specific usage repeated at more than one call site, or a purpose that makes the call site measurably clearer or safer.
- A short helper with no clear purpose is worse than the lines it replaces: it hides intent and adds a name the reader must learn.
- Prefer direct construction and plain data over a factory that only assembles two objects.
- If a helper exists only to rename an operation, delete the helper and name the operation itself clearly.
- Presets should be exported data (`const FULL_X = [...]`), not functions that build the same list on every call.

## Naming and CSS

- Prefer clean, single-word CSS classes.
- Modifier names may use one hyphen, but avoid deeply compounded class names.
- Preserve the repository's intentional CSS nesting style.
- Use `clamp()` for responsive typography where appropriate.
- Do not introduce component-specific hardcoded colors when a variable is available.

## Definition of Done

A task is done when the requested behavior works, affected imports are valid, formatting is clean, and the relevant validation command has been run or its limitation has been documented.
