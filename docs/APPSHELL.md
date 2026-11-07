# AppShell Contract

Phase 1 deliverable: the contract only. Interfaces live in `packages/app/src/{types,ports}.ts`;
no implementation exists yet.

## Why the shell exists

Today every responsibility below is hard-coded in `examples/gallery/src/main.ts`:

| Responsibility | Current location |
| --- | --- |
| Resolve the mount point | `start(container)` |
| Register components | inline `.register(...)` chain |
| Build renderer callbacks | `renderFn`, `buildBuilderFn` |
| Map route → content | `pageContentFor()` |
| Decide what to preload | `buildersForRoute()` |
| Preload, render, swap root | `renderPage()` |
| Guard against overlapping renders | `renderSequence` |
| Wire the router | `bootRouting()` |
| Run animations after render | `animation.init()` |

Three of those entries (`pageContentFor`, `buildersForRoute`, `register`) must be
edited by hand for every new route or component. A generated project cannot do
that, which is the entire reason for the shell.

## What the shell owns

```txt
source (pages/menu/footer) ──┐
                             ├─► derive builder names ──► preload ──► render ──► swap root ──► animate
router (injected) ───────────┘                                     │
page controller (optional) ────────────────────────────────────────┘
```

1. Resolve the container once, at `mount()`.
2. Derive the builder names of a page tree (see "Preload derivation").
3. Await `registry.preload(names, pagesData)` before rendering. `registry.build` is
   synchronous, so an unloaded component cannot be built.
4. Run the page controller's `onPrepare`, use its returned tree when provided.
5. Render through the injected renderer, swap the previous root, keep one live root.
6. Ignore a render that was superseded by a newer navigation.
7. Run `animation.init(root)` on the new root when an animation port is provided.
8. Run `onReady(elements, shell)` for the active controller, after attach.
9. Run `onDestroy()` of the outgoing controller before replacing its DOM.

## What the shell must not know

- Which components exist. Names come from the page tree; registrations belong to the
  target application, never to the shell.
- How a component loads its assets. That is `iComponentRegistryPort.preload`.
- How routing works. The shell only needs `navigate`, `parseUrlHash`, `destroy`, and it
  receives the router through `iRouterFactory` because it must supply the callback.
- How animations are implemented. Only `init(root)` is used.
- How a page is stored. `iAppShellSource.pages` is already a node tree; converting CMS
  JSON into one is the transformer's job, not the shell's.

## Preload derivation

`buildersForRoute()` disappears. The name set is derived from the page tree:

```ts
// Walk the tree, collect every node whose `builder` is a string.
function collectBuilderNames(node: unknown, out: Set<string>): void {
  // arrays and plain objects are traversed; anything else is ignored
}
```

The derived set is the preload input. It is also exposed to `iPagePrepareContext.builders`
so a controller can inspect it before the render, and to the debug channel.

The rule must tolerate unknown builders: a name that is not registered is reported
through the debug channel and skipped, not thrown. This keeps the LITE promise — a
missing component is a normal state.

## Debug channel

`options.debug` enables one place to observe the shell:

- resolved source and route list
- derived builder names, per route
- registry hits and misses during preload
- render sequence numbers, so a cancelled render can be recognised

Without `debug`, the shell stays silent.

## Requirements this places on the registry (input for Phase 2)

| Requirement | Reason |
| --- | --- |
| `preload(names, pagesData)` resolves stylesheets **and** modules before returning | `build` is synchronous |
| `build(name, data)` is synchronous | it runs inside the renderer's node walk |
| `has(name)` exists | the shell must report a miss without throwing |
| Missing assets are recoverable | LITE edition ships without optional modules |
| Component manifests carry their own sub-modules (`modules`) | the shell must not know that Form has engines |

## Open questions

1. Does `iAppShellSource` also need `theme` per route, or is theme purely a router concern?
2. Should the shell own `localStorage` theme persistence (currently done by `LandingPageBuilder`), or does that belong to the `ModeSwitcher` component?
3. Does `pageChanged`/`beforeRender` emission belong to the shell (it emits into the injected
   event port) or to the router callback?
4. Is one root element per shell enough, or do multi-page applications need named outlets?
