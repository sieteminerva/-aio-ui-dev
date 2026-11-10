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
- A builder **never** `import "./X.css"`. Load via `@aio-ui/core/Stylesheets`; registry injects
  the component's own CSS. A parent that nests a builder `@import`s the child sheet
  (e.g. `ProductGrid.css` → `ProductCard.css`).
- Publish through `config.emit?.(…)`; a component is framework-agnostic and never imports the app.
- A component self-describes sub-components via `manifest modules` (self-contained packages).

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

## Open design (decide, do not implement blind)

`isRoot` (`.guidance/plan-generator.md` §3.11): default builder node wraps (`div#masonry` host);
`isRoot: true` should **replace** the host with the builder root. `AioApp.blockToNode()` already
sets `isRoot: true` for page blocks — one flag, two meanings. Review `AioApp`'s entry/render path
before implementing.

## Verify

`npm run verify` at the end of a batch. For UI geometry claims, measure
`getBoundingClientRect`/`getComputedStyle` and report exact numbers — never claim UI behaviour
without measuring.
