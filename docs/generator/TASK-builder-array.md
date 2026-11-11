# GLOBAL_TASK.md — generator follow-ups for the closed `builder` array

Scope: `orchestrator/**` and `docs/generator/**` only. The Framework band (`packages/**`,
`examples/**`) already closed the path; do **not** change it from here.

## Landed in the Framework band (treat as the contract)

- `builder` names **one** component — the component the node _is_. `builder: ["a", "b"]` is
  ignored by `collectComponentNames()` (`packages/core/src/ComponentRegistry.ts`).
- A route's components are declared once, where the registry is registered:

  ```ts
  app.registerModule(components, [{ route: "article", components: ["article", "fab-menu"] }]);
  ```

  Type: `iComponentRoute = { route: string; components: string[] }` (`@aio-ui/app`).
  Routes are normalised like `source.pages` keys; duplicate entries for one route merge;
  a plan on a slot other than `registry` throws at registration.

- `AioApp` preloads the union of the plan and `registry.collect(nodes)`.
- Page blocks are unaffected: a document block still becomes `{ builder: "<type>" }`
  (`blockToNode`), and `collect()` still recognises `type` on a block document.

## Tasks

> **Superseded by P9b:** the generated entry no longer declares a route plan. It declares
> `const pageDefinitions: iPageDefinition[] = [{ route, requires }]` and calls
> `app.registerPage(definition)`; `iComponentRoute` is no longer emitted. The rule is
> unchanged — a node that _is_ component X sets `builder: "X"`, and a page lists what it
> mounts in `requires`.

- [ ] **Stop emitting `builder: [...]`.** Audit every template/fixture in `orchestrator/`
      (`fixtures.ts`, `scenarios.ts`, `emit.ts`, `generate.ts`, tests) and replace each
      array with a single name (the node's own component) or no `builder` at all.
- [ ] **Emit the route plan.** The generated entry must declare
      `const componentRoutes: iComponentRoute[] = [{ route, components: [...] }]` and call
      `registerModule(components, componentRoutes)`. One entry per route the preset
      defines; include shared chrome (e.g. `fab-menu`) in every route that mounts it.
- [ ] **Keep the two meanings apart in emitted code.** A node that _is_ component X sets
      `builder: "X"`. A node that only **mounts** components in `onCreated` carries no
      `builder`; its components are listed in the route plan.
- [ ] **Update prompts and docs.** `orchestrator/prompt.content.md` and the instructions
      under `docs/generator/**` must state the single-name rule and the plan shape, and
      must no longer teach `builder: [names]`.
- [ ] **Pin it with a test.** Extend the generator tests so an emitted site containing
      `builder: [` fails, and so every route's plan covers every `build("<name>")` call
      reachable from that route's handlers.
- [ ] **Imported-name gate.** The release/import-map test must verify every name in the
      plan exists in the emitted import map and every reachable bare import has an exact
      key (same rule already applied to component subpaths).
- [ ] **Smoke site.** Regenerate a site and confirm in the browser: no `404` for component
      modules, no `[AioApp] miss` logs, and each route paints with its stylesheet once.

## Blocked on the Framework band

- [ ] **`isRoot` in the emitted `mount()` pass.** `.guidance/plan-generator.md` §3.11 is
      still open: the renderer only names metadata with `isRoot` today. Do not emit
      `isRoot: true` in generated content until the renderer owns the swap. Current
      decision to respect when it lands: `onCreated` wins and keeps the host.

## Done in the Gallery band (2026-11-11)

`examples/gallery` no longer declares `builder: [names]`; its preload plan lives in the entry:

- `examples/gallery/src/main.ts` — `const componentRoutes: iComponentRoute[]` with
  `gallery → ["masonry"]`, `blog → ["article"]`, `form → ["form"]`, handed to
  `registerModule(components, componentRoutes)`.
- `examples/gallery/src/pages/blog.ts`, `pages/gallery.ts`, `content/wizard.ts` — the host
  nodes drop `builder` entirely: they are not the component, they mount it in `onCreated`.

Remaining work in this file is generator-side only.

## Out of scope here

- `packages/**`, `examples/demo/**`, `scripts/**` — a change needed there goes through the
  Framework band's own batch and gate (`npm run verify`).
