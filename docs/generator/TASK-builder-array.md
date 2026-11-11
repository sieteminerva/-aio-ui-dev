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
> `const pageDefinitions = [{ route, requires }]` (plain JavaScript — no `import type`, no
> type annotation, both of which are syntax errors in a browser) and calls
> `app.registerPage(definition)`. `iComponentRoute` is no longer emitted. The rule is
> unchanged — a node that _is_ component X sets `builder: "X"`, and a page lists what it
> mounts in `requires`.

- [x] **Stop emitting `builder: [...]`.** No template, fixture or scenario in `orchestrator/`
      writes an array: every `builder` there is one catalogue word. `inspectContent()` now
      **rejects** a non-string `builder` (`INVALID_SHAPE`, "one word, never a list") instead of
      walking past it, so model output that still uses the old shape fails validation.
- [x] **Emit the route plan.** Superseded by P9b and already emitted: `pageRequires()` writes
      `const pageDefinitions = [{ route, requires }]`, handed to
      `app.registerPage(definition)`. `requires` is the component words reachable in that page's
      content, deduplicated and sorted, with field modules (`input`, `dropdown`,
      `input-controls`) left out.
- [x] **Keep the two meanings apart in emitted code.** `mount()` reads `owner.builder` as *the
      component the node is*; nothing in the emitted site treats `builder` as a dependency list.
- [x] **Update prompts and docs.** `orchestrator/prompt.content.md` states the rule under
      AUTHORING RULES: "`builder` is **one word**, never an array … never treat it as a
      dependency list."
- [x] **Pin it with a test.** `runtime.test.ts` → "one word per node": no emitted `app.js`
      contains `builder: [`, every route's `requires` equals the words its own nodes build, and
      every required word has a `registry.register("<word>"`. `parse.test.ts` → "rejects a
      builder array instead of silently ignoring it".
- [x] **Imported-name gate.** `release.test.ts` → "registers and maps every component a page
      requires": each `requires` word has a binding **and** its specifier is a key in the emitted
      import map (next to the existing closure and prefix-directory checks).
- [x] **Smoke site.** `node .draft/smoke/serve.mjs 5300`, then both generated sites over
      `http://localhost:5300/.draft/smoke/<site>/`: `store#checkout` renders the order form
      (`Pemesanan` + 3 field groups), `gallery#/` renders, 0 requests ≥ 400, 0 duplicate
      stylesheet links. **This is what caught the boot bug below** — unit tests were green.

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

## Found by the smoke pass (2026-11-11)

`app.js` was being emitted with TypeScript-only syntax: `import type { iPageDefinition }` and
`const pageDefinitions: iPageDefinition[] = …`. A browser rejects the first line
(`SyntaxError: Unexpected token '{'`), so **every generated site failed to boot** while all unit
tests passed — they only asserted the string was present. Fixed: the template emits plain JS,
and `runtime.test.ts` now asserts `/^import type /m` and `/pageDefinitions:\s/` are absent.
Lesson: a template test must assert the *language* of the output, not just its content.

## Out of scope here

- `packages/**`, `examples/demo/**`, `scripts/**` — a change needed there goes through the
  Framework band's own batch and gate (`npm run verify`).
