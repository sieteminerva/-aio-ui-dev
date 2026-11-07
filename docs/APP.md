# AioApp — Framework Entry

`AioApp` (`packages/app/src/AioApp.ts`) is the framework entry point. It is the only
class an application has to instantiate:

```ts
const app = new AioApp({
  container: "#app",
  defaultRoute: "home",
  source: { pages },
  deps: { registry, routerFactory, animation, events, storage },
});

await app.mount();
```

The contract lives beside it: `iApp` (public surface), `iAppConfig`, `iAppSource`,
`iAppOptions` (`types.ts`) and `iAppDeps` plus one port per collaborator (`ports.ts`).

## Why the entry exists

Before it, every mandatory step was hard-coded in `examples/gallery/src/main.ts`:

| Responsibility                    | Before (entry file)         | Now                                       |
| --------------------------------- | --------------------------- | ----------------------------------------- |
| Resolve the mount point           | `start(container)`          | `AioApp.mount()`                          |
| Map route → content               | `pageContentFor()`          | `iAppSource.pages`                        |
| Wire the router + valid routes    | `bootRouting()`             | `AioApp.mount()`                          |
| Decide what to preload            | `buildersForRoute()`        | `collectComponentNames` + `registry.load` |
| Preload, render, swap root        | `renderPage()`              | `#renderRoute()`                          |
| Guard against overlapping renders | `renderSequence`            | `#sequence`                               |
| Theme persistence                 | `localStorage` in the class | `iStoragePort`                            |
| Fragment deep link                | —                           | `#scrollToFragment()`                     |
| Run animations after render       | `animation.init()`          | `#afterCommit()`                          |
| Report failures                   | `catch (console.error)`     | `events.emit("error")`                    |

`pageContentFor` and `buildersForRoute` existed because a route had to be declared twice:
once for content, once for its components. Both are gone — `pages` is the single list,
and the component names are derived from the tree.

## What `AioApp` owns

```txt
source (pages/menu/footer) ──┐
                             ├─► derive names ──► preload ──► render ──► swap root ──► animate
router (injected) ───────────┘                        │
page controller (optional) ──────────────────────────┘
```

1. Resolve the container once, at `mount()`.
2. Derive the component names of the page (see "Preload derivation").
3. Await `registry.load(names)` before rendering. `registry.build` is synchronous, so
   an unloaded component cannot be built.
4. Run the controller's `onPrepare`, use its returned page when provided.
5. Render through the injected renderer, replace the container's children, keep one root.
6. Drop a render that was superseded by a newer navigation.
7. Run `animation.init(root)` on the new root when an animation port is provided.
8. Scroll to the URL fragment, then run `onReady` for the active controller.
9. Run the outgoing controller's `onDestroy` before its DOM is replaced.

## The mount-point rule

The container element is a **stable mount point**: `#app` survives a route change,
`AioApp` only replaces its children. A page tree therefore never renders `#app` itself —
LITE pages are rooted at `.page`, exactly like a component that owns only its own markup.

When the source declares `menu` and/or `footer` slots, the entry renders one wrapper
(`.aio-shell`) around `menu + page + footer`. A hand-written page tree normally already
contains its own nav and footer, so the slots stay empty and the authored DOM is
untouched — no extra wrapper, no duplicated navigation.

## Page content: two shapes, one entry

`iPageContent = iNodeContent | iPageDocument`:

| Shape                    | Used by                | Handling                                          |
| ------------------------ | ---------------------- | ------------------------------------------------- |
| node tree                | LITE (`src/content/*`) | rendered as-is                                    |
| page document (`blocks`) | generated projects     | each block becomes a builder root (`blockToNode`) |

Detection is structural (`Array.isArray(page.blocks)`), never nominal, so JSON coming
straight from an editor works. A block is `{ type, props, children }`; `source`/`query`
bindings are **not** copied into the node, because the renderer would turn them into DOM
attributes. Filling a tabled block with records is a controller/transformer job — the
entry never fetches.

## Preload derivation

`buildersForRoute()` is gone. Implemented in `@aio-ui/core` as
`collectComponentNames(source)`; `AioApp` calls it and hands the names to the registry:

```ts
const names = collectComponentNames(node); // derived, never hand-listed
const known = names.filter((name) => registry.has(name));
await registry.load(known, [node]); // build() stays synchronous
```

Recognised shapes:

| Shape                         | Recognised by                |
| ----------------------------- | ---------------------------- |
| node trees                    | `builder: "form"`            |
| node trees that mount several | `builder: ["form", "table"]` |
| page blocks                   | `type` on a block            |

`builder` is already a reserved key, so declaring components there can never leak into
the DOM. An earlier attempt used a top-level `requires` key and produced an extra element
on every node that carried it; the array form of `builder` replaced it.

The derived set is also exposed to `iPagePrepareContext.builders` so a controller can
inspect it before the render, and to the debug channel.

The rule tolerates unknown builders: a name that is not registered is reported and
skipped, not thrown. This keeps the LITE promise — a missing component is a normal state.

## Events

Emitted through the injected `iEventPort` (a project may ignore the port entirely):

| Event          | Payload                          | When                                      |
| -------------- | -------------------------------- | ----------------------------------------- |
| `pageChanged`  | `{ route }`                      | a render pass starts                      |
| `beforeRender` | `{ route, components, missing }` | names derived, before preload             |
| `ready`        | `{ route, shell }`               | page attached, animation run              |
| `themeChanged` | `{ theme, shell }`               | the router reported a new theme           |
| `error`        | `{ message, route, error }`      | a step failed; previous DOM stays mounted |

## Debug channel

`debug: true` writes one prefixed line per phase (`mount`, `render:start`, `preload`,
`miss`, `render:superseded`, `render:done`, `destroy`). It is the place to see the
decision the entry made without adding console noise to a production build.

## Requirements this places on the registry

| Requirement                                                                    | Reason                                        |
| ------------------------------------------------------------------------------ | --------------------------------------------- |
| `load(names, pagesData)` resolves stylesheets **and** modules before returning | `build` is synchronous                        |
| `build(name, data)` is synchronous                                             | it runs inside the renderer's node walk       |
| `has(name)` exists                                                             | the entry must report a miss without throwing |
| Missing assets are recoverable                                                 | LITE ships without optional modules           |
| Component manifests carry their own sub-modules (`modules`)                    | the entry must not know that Form has engines |

## Open questions

1. Does `iAppSource` also need `theme` per route, or is theme purely a router concern?
2. Should the entry own theme DOM application (`data-theme` on the root), or stay a pure
   event emitter and leave it to a theme service?
3. Is one root element enough, or do multi-page applications need named outlets?
4. Should `onReady` receive a named element map (`menu`/`page`/`footer`) instead of an
   empty map today?
