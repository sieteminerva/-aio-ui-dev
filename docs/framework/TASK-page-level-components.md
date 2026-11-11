# TASK — page-level components

Compact checklist. The long analysis was context weight, not knowledge: what matters is
below, and the evidence lives in the code it refers to.

Status: **done** — P0–P9b landed and test-backed (2026-11-11).

## Contract (agreed)

1. **Shell keeps control.** A page-level component gets a port `{ route, params, data,
navigate, build, events, signal }` — no `history`, no `fetch`, no DOM outside its root.
2. **`requires` replaces `iComponentRoute`** as the preload source; same function, new owner.
3. **Slots stay in `base`** (`config.slots` + `attach`/`detach`); a real consumer exists in
   `.archives/Editor/Editor.ts`, so it must not be deleted — only given an explicit door.
4. **Category taxonomy** (`ecommerce`, `blog`) is generator work, not this batch.
5. **Slot ≠ view.** A slot is a place a foreign component may fill; a view is an internal
   state (`list` ⇄ `detail`) that the component switches itself.
6. **A component never owns the URL.**

## Steps

| Step       | Goal                                           | Acceptance                                                                                                                                                              |
| ---------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0 ✅      | Green the tree                                 | `iComponentRoute` defined in `app/src/types.ts`; `#record` dropped                                                                                                      |
| P1 ✅      | A manifest names its own export                | registry test: one module, two words, two `export`s → two different classes                                                                                             |
| P2 ✅      | `product` is a real builder word               | registering it typechecks without `as any`                                                                                                                              |
| P3 ✅      | Explicit slot door in `base`                   | `host(slot)` / `project(slot, node)` / `detach(slot)`; test proves project → weld → restore without a `#active` caller; `attach()` implemented on top                   |
| P4 ✅      | Dev warning: >1 builder, no `export`           | already in `loadModule()` (DEV only)                                                                                                                                    |
| P5 ✅      | `scope` = the slot a module fills              | documented on `iComponentModuleRef`; no behaviour change                                                                                                                |
| P6 ✅      | `iPageDefinition` + `registerPage(definition)` | definition with sub-routes renders both; preload plan from `requires`; `data` → `ctx.data`; component has no `history`                                                  |
| P7 ✅      | Article follows the contract                   | no URL access; `views`; `data-view`; `initialSlug`/`initialView`; 4 tests                                                                                               |
| P8 ✅      | Product follows the contract                   | one word `product`; sub-parts via `manifest.modules`; declarative config (`view`, `slots`, `onAddToCart`); `onOpen`/`onBack` dropped                                    |
| P9a ✅     | Generator emits the plan                       | `componentRoutes: iComponentRoute[]` + `registerModule(registry, componentRoutes)`; 3 tests                                                                             |
| **P9b** ✅ | Generator emits page definitions               | entry declares `pageDefinitions: iPageDefinition[]` + `app.registerPage(definition)`; `requires` replaces `iComponentRoute`; content still from `source.pages`; 3 tests |

P9b landed without a new field: `iPageDefinition.word` is the route key, `requires` carries
the preload plan, and `#createPage` now prefers declared content over the definition's root
builder word — so a generated page keeps its tree and still gets a definition-owned route.
`iComponentRoute` remains public for hand-written entries (`examples/demo`), it is simply no
longer emitted by the generator.

## Why (short)

- **P1** exists because the loader falls back to `default`, then the first exported function.
  `@aio-ui/product` exports three builders, so two registration words resolved to
  `ProductCardBuilder` — that is why "product tidak tereksekusi".
- **P3** exists because `attach()` finds its target through `Builder.#active`, pinned only
  during `create()`. One `await`, or a child resolved from the registry, loses the caller and
  `attach()` silently returns `this`.
- **P6** exists so a page can declare its own routes and data instead of a host page doing it.

## Gotchas

- `npm run verify` once per batch. API surface: `node scripts/api.mjs --write`, then check.
- No `export *` outside `packages/kits/*`; entry aliases are retired (root barrel only).
- `build-pack` post-processes dist: adds `.js` to relative specifiers, strips CSS imports.
- `message` ⇄ `form` is a type-level cycle; build-pack retries once — do not reorder.
- Vite caches the `exports` map: `npm install` + restart after adding an entry.
- A parallel agent edits this repo; re-read before editing.
