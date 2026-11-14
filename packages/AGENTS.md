> **STEP 0 — memory recovery + claim (mandatory, first action of any session):** `git log --oneline -12`,
> then `git status --short`, then open the active checkpoint — `/memories/session/<task>.md`,
> falling back to `.guidance/project/STATUS.md`. **Then read the claim board
> `.guidance/project/AGENTS.md` and take your row before the first edit** — overlapping a live row
> is a stop-and-ask, not an override. Only then plan. Every finished action category leaves
> **3 pointer lines** (`CHANGED →`, `PROVED →`, `NEXT →`); see `.guidance/AGENT_RULES.md` §10
> (checkpoint) and §11 (claims).

# AGENTS.md — Framework band (`packages/**` + `examples/demo/**`)

AIO UI framework source plus its showcase demo. This is the trunk.

## Layout

`base/` (adapters, `Builder`), `core/` (registry, renderer, stylesheets), `app/` (`AioApp`,
type-only on core), `components/*` (flat `<name>/<File>.ts`), `modules/*` (router, theme,
http-service, event-emitter, module-loader, animations), `themes/*`, `utilities/`, `styles/`,
`kits/*` (aggregators: `frameworks`, `modules`, `themes`).

## Commands

```bash
npm run typecheck        # tsc --noEmit whole repo
npm run build:pkgs       # build all 37 packages (scripts/build-pack.mjs)
npm run test             # vitest run
npm run new:component <name>   # scaffold from templates/component/
npm run dev:demo         # run the showcase demo
npm run verify           # full gate — run once per batch, not per step
```

## Conventions (non-obvious)

- **Modules own capabilities; components only render.** Fix the seam, not the abstraction.
- A builder **never** `import "./X.css"`. The sheet is requested through `ensureStylesheet`
  (`@aio-ui/core`); `Builder.create()` holds the root until it lands. A parent that nests a builder
  `@import`s the child sheet (e.g. `ProductGrid.css` → `ProductCard.css`).
- The hold itself lives next to the builder (`@aio-ui/base/BaseAdapters/Hydration`), not in core:
  `create()` hides the unstyled root, using the component's own `loading()` mockup built from
  `@aio-ui/skeleton` (mandatory — loaded with the app shell) or the generic shimmer skin.
- Publish through `config.emit?.(…)`; a component is framework-agnostic and never imports the app.
- A component self-describes sub-components via `manifest modules` (self-contained packages).
- A route's components are declared **once**, in the plan handed to the registry:
  `registerModule(components, [{ route, components: ["article", "fab-menu"] }])`. `builder` on a
  node names the component the node **is** — never a dependency list (`builder: []` is closed).

## Traps (do not regress)

- Import map needs the `"imports"` wrapper; map every package root + exact `exports` subpath.
- CSS subpaths prefer `dist/` (root CSS is not packed).
- `scripts/build-pack.mjs` adds `.js` to relative imports and strips CSS side-effect imports;
  only `.js/.json/.css` count as an extension (dotted basenames like `Input.FormAdapter` are not).
- Adding a package `exports` entry needs `npm install` **and** a dev-server restart
  (`touch vite.config.ts`); Vite caches the old exports map through `node_modules` symlinks.

## Read when relevant (do NOT read by default)

- `docs/framework/COMPONENT-CONVENTIONS.md`, `docs/framework/COMPONENT-TEMPLATE.md` — writing a component.
- `docs/framework/DEMO.md` — demo routes and `manifest.ts`.
- `packages/core/ComponentRegistry.md` — registry/loader internals.
- Do **not** read `docs/generator/apps-script-integration.md` or `orchestrator/**` from this band.

## `isRoot` — decided and implemented (`core/src/DOMRenderer.ts`, `dd34f2d`)

| Input                            | Result                                                                              |
| -------------------------------- | ----------------------------------------------------------------------------------- |
| builder resolves, no `onCreated` | the builder root **replaces** the host; the key's `id`/classes/`attrs` move onto it |
| `onCreated` present              | the host stays; the builder element becomes its content (a hook owns its mount)     |
| builder missing/unresolved       | the host stays, and dev warns once per builder name                                 |

`AioApp.blockToNode()` emits `isRoot: true` for every page block, so a page document renders the
component as the block instead of nesting it. Decided against: a helper or a new renderer
parameter — `buildStructure` already holds `builderFn`, and `attachMetadata` recognises a builder
root by its `getMetadata`. A node with `builder` and no `isRoot` keeps the host.

## Verify

`npm run verify` at the end of a batch. For UI geometry claims, measure
`getBoundingClientRect`/`getComputedStyle` and report exact numbers — never claim UI behaviour
without measuring.
