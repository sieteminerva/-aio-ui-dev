# Architecture Guidance

## Core Belief

Build systems from the root of the problem. Prefer understandable foundations, explicit boundaries, and components that can be used independently.

## Framework Boundaries

- Core must not depend on concrete components.
- Components may depend on core and base contracts.
- Component-specific logic and styles stay with the component.
- Utilities are imported only when needed.
- Global styles contain foundations, not component-specific rules.
- Use public barrels and package exports instead of deep internal imports.

## Data and Lifecycle

- Keep data, rendering, and interaction logic separable.
- Make important state observable and traceable.
- Respect mount, update, and unmount lifecycle boundaries.
- Avoid hidden global state and accidental coupling.

## Change Strategy

Prefer small, reversible migrations. Preserve existing behavior before improving structure. Record architectural decisions in `.guidance/project/DECISIONS.md`.

## Project Structure Rules

- Use semantic HTML elements such as `main`, `section`, `nav`, and `aside`; do not use generic `div` elements as outer structure when a semantic element is appropriate.
- Keep reusable global styles in `src/lib/Styles/` or the equivalent framework styles package.
- Keep `src/style.css` for application-level composition and page-specific styling.
- Keep global CSS variables in `variables.css` and prefix them with `--app-`.
- Component variables must be component-scoped and should inherit from global variables.
- Override component themes through global application variables rather than editing component internals directly.
