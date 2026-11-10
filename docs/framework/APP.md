# AioApp — Framework Entry

`AioApp` (`packages/app/src/AioApp.ts`) is the framework entry point. It is the only
class an application has to instantiate, and every adapter it consumes is a
**registered module** — nothing is instantiated outside and handed in silently:

```ts
const app = new AioApp({
  container: "#app",
  defaultRoute: "home",
  source: { pages },
})
  .registerModule(components) // instance you assembled
  .registerModule(HashRouter) // class, no config
  .registerModule(AppStorage, { driver: localStorage }) // class + config
  .registerModule(AnimationsService)
  .registerModule(emitter);

await app.render();
```

The contract lives beside it: `iApp` (public surface), `iAppConfig`, `iAppSource`,
`iAppOptions`, `iAppSlots`, `iAppModuleClass`, `iAppModuleContext` (`types.ts`) and one
port per adapter (`ports.ts`).

## Why the entry exists

Before it, every mandatory step was hard-coded in `examples/gallery/src/main.ts`:

| Responsibility                    | Before (entry file)         | Now                                       |
| --------------------------------- | --------------------------- | ----------------------------------------- |
| Resolve the mount point           | `start(container)`          | `AioApp.render()`                         |
| Map route → content               | `pageContentFor()`          | `iAppSource.pages`                        |
| Wire the router + valid routes    | `bootRouting()`             | `AioApp.render()`                         |
| Decide what to preload            | `buildersForRoute()`        | `collectComponentNames` + `registry.load` |
| Preload, render, swap root        | `renderPage()`              | `#renderRoute()`                          |
| Guard against overlapping renders | `renderSequence`            | `#sequence`                               |
| Theme persistence                 | `localStorage` in the class | `AppStorage` → `iStoragePort`             |
| Fragment deep link                | —                           | `#scrollToFragment()`                     |
| Run animations after render       | `animation.init()`          | `#afterCommit()`                          |
| Report failures                   | `catch (console.error)`     | `events.emit("error")`                    |

`pageContentFor` and `buildersForRoute` existed because a route had to be declared twice:
once for content, once for its components. Both are gone — `pages` is the single list,
and the component names are derived from the tree.

## Modules — register first, use second

The app declares **slots**, not adapters. `iAppSlots` is the complete list:
`registry`, `router`, `renderer`, `animation`, `events`, `storage`.

**The real class is the token.** No wrapper class, no `defineModule()` alias, no
`factory` object — the class already knows what it is, because it declares its slot:

```ts
export class HashRouter {
  static readonly slot = "router" as const;
  constructor(config: iHashRouterConfig = {}, context?: iHashRouterContext) { … }
}
```

```ts
const app = new AioApp({ container, source: { pages } })
  .registerModule(components) // instance you assembled
  .registerModule(HashRouter) // class, no config
  .registerModule(DOMRenderer) // required, no default
  .registerModule(AppStorage, { driver: localStorage }) // class + config
  .registerModule(AnimationsService)
  .registerModule(emitter);

await app.render();
```

Two members are the whole convention:

| Member                            | Meaning                                                                      |
| --------------------------------- | ---------------------------------------------------------------------------- |
| `static readonly slot = "<slot>"` | which port this class becomes                                                |
| `constructor(config, context)`    | `config` is what `registerModule` received; `context` is supplied by the app |

A class with a different constructor shape still works — it just ignores the extra
argument. `registerModule(instance)` is accepted too: the slot is read from
`instance.constructor.slot`, which lets a host assemble something the app should not
build itself (the example passes the `ComponentRegistry` it already filled with
manifests). A plain object or test double cannot carry a static, so it passes the slot
explicitly: `registerModule(fakeRouter, "router")`.

| Rule                                                                           | Why                                                                                                                   |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| the class decides the slot                                                     | registering a storage class for the router slot is rejected by the type system, not discovered at runtime             |
| config is `ConstructorParameters<M>[0]`, so it is typed by the class itself    | no duplicated config interface; `AppStorage` infers `iStorageConfig`                                                  |
| config lives at the registration, never in `iAppConfig`                        | `iAppConfig` stays general (`container`, `source`, `defaultRoute`, `theme`, `debug`) no matter how many modules exist |
| modules are constructed in `render()`, not at registration                     | a router needs the route list, the restored theme and the change callback, which only exist when the entry runs       |
| required slots are checked **before** anything is created                      | a missing slot is a configuration mistake, not a half-working app                                                     |
| a module that throws mid-creation releases the ones already created            | no port is left running unattended                                                                                    |
| registering after `render()` throws                                            | "register first, use second" is enforced, not documented                                                              |
| a module without a slot throws with a hint (mentioning the explicit-slot form) | an untagged object would otherwise land nowhere                                                                       |
| duplicate slot → warn + replace                                                | a generated project that lists one slot twice must not silently lose behaviour                                        |
| teardown runs in reverse registration order, calling `port.destroy?.()`        | no extra teardown convention; any port that owns resources exposes `destroy()` (`EventEmitter.destroy()` → `clear()`) |

`registry`, `router` and `renderer` are required; `storage` falls back to memory,
`animation` and `events` are skipped when absent.

Creation order has one exception: **storage is created first**, because the persisted
theme must be restored before the router is constructed with it. Everything after that
follows registration order.

`iAppModuleContext` is the injection point: `routes`, `defaultRoute`, `theme`, `debug`
and `onRouteChanged`. It is why `registerModule(HashRouter)` needs no config — the three
arguments a router cannot know by itself arrive through it.

| Slot        | Class               | Package                 |
| ----------- | ------------------- | ----------------------- |
| `registry`  | `ComponentRegistry` | `@aio-ui/core`          |
| `router`    | `HashRouter`        | `@aio-ui/router`        |
| `renderer`  | `DOMRenderer`       | `@aio-ui/core`          |
| `animation` | `AnimationsService` | `@aio-ui/animations`    |
| `events`    | `EventEmitter`      | `@aio-ui/event-emitter` |
| `http`      | `HttpService`       | `@aio-ui/http-service`  |
| `storage`   | `AppStorage`        | `@aio-ui/app`           |

`@aio-ui/app` itself imports **types only** — no renderer, router, animation or
collector is bundled with it. Deriving component names goes through
`iComponentRegistryPort.collect(source)`, and the renderer must be registered like any
other module, so the app adds zero bytes of core to a project that swaps it out.

## What `AioApp` owns

```txt
source (pages/menu/footer) ──┐
                             ├─► derive names ──► preload ──► render ──► swap root ──► animate
router (injected) ───────────┘                        │
page controller (optional) ──────────────────────────┘
```

1. Resolve the container once, at `render()`.
2. Create every registered module (storage first, then registration order).
3. Create the route's controller for this pass (`new Controller(config, ctx)`), then run
   its `onPrepare`; the page is whatever it returns, or the one in `source.pages`.
4. Derive the component names from the page (and the menu/footer nodes).
5. Await `registry.load(names)` before rendering. `registry.build` is synchronous, so
   an unloaded component cannot be built.
6. Render through the renderer port, replace the container's children, keep one root.
7. Drop a render that was superseded by a newer navigation, and abort its `signal`.
8. Run `animation.init(root)` on the new root when an animation port is provided.
9. Scroll to the URL fragment, then run `onReady` with the mounted elements.
10. Run the outgoing controller's `onDestroy` before its DOM is replaced.

## Themes — a namespace, not another `register*`

`registerModule` answers _which object fills which slot_; `registerPage` answers _who
renders which route_. Both are structural, one-per-key. Adding a theme is neither: it
appends to a collection that already has an owner, so it gets a collection-shaped door
rather than a third `register*` method (which would make the app a growing list of verbs).

```ts
const app = new AioApp({ … })
  .registerModule(components)
  .registerModule(HashRouter)
  .registerModule(ThemeRenderer, { themes: [new DefaultTheme()] }); // the port + its initial set

app.theme.register(new CyberpunkTheme());   // add one — before or after render()
app.theme.ids;                              // ["default", "cyberpunk"]  (empty if the port can't list)
app.theme.current;                          // "default"

await app.render();

app.theme.use("cyberpunk");                 // switch + re-render the current route
```

Why `use()` goes through the router: a theme is part of the URL (`#route?theme=id`). Routing
the switch through `router.navigate(route, themeId, fragment)` keeps three things truthful
at once — the address bar, the persisted `active_theme`, and the render — and reuses the
path a visitor takes when they open a shared link. `use()` without a router (nothing rendered yet) just records the id.

`register()` before `render()` is queued and flushed while modules are created, because the
theme port does not exist yet. It throws a clear error if the registered port cannot accept
themes (a custom port without `register`); pass the initial set to
`registerModule(ThemeRenderer, { themes })` in that case.

## Page controller

A route may be described by **content** (`source.pages[route]`), by a **controller**, or
by both. One of them must supply the page; otherwise the render fails with an explicit
message. The controller is bound to a route at registration, and one instance is created
per render — so `onDestroy` genuinely releases what `onPrepare` acquired:

```ts
class BlogPage implements iPageController {
  async onPrepare({ http, signal }: iPageContext): Promise<iPageContent | void> {
    const article = await http.get({ sheetName: "blog" });
    if (signal.aborted) return; // a newer navigation already started
    return { ".page": { content: { ...navigationMenu, "main#blog": { … } } } };
  }
}

app.registerPage("blog", BlogPage, { limit: 5 });
```

| Hook         | Receives            | Purpose                                                             |
| ------------ | ------------------- | ------------------------------------------------------------------- |
| `onPrepare`  | `iPageContext`      | load data, return the page to render                                |
| `onReady`    | `iPageReadyContext` | attach listeners once the DOM exists                                |
| `onDestroy`  | —                   | release what the controller acquired                                |
| `attachMenu` | `iBasicNode`        | rewrite the menu node; **called by the app**, not by the controller |

`iPageContext` = `{ route, page, fragment, theme, builders, http, signal }`.
`iPageReadyContext` = `{ route, page, shell, menu, footer, blocks }`, where `blocks` maps
every rendered element that carries an `id`.

Three rules keep a controller from becoming the legacy god object:

1. **No shell, no builder.** It never touches the router, renderer or registry — it
   receives a context, not the application.
2. **Data goes through `ctx.http`** — never `fetch`, never a JSON import.
3. **Registration owns the route.** The class does not declare `route`; `registerPage`
   does, so a route has exactly one definition of where it comes from.

### Data — mock and live behave the same

The `http` slot is filled by `HttpService`. Its config has an optional `endpoint(query)`,
so a project can serve mock JSON as a **real request**:

```ts
.registerModule(HttpService, {
  endpoint: (q) => `${import.meta.env.BASE_URL}mock/${q.sheetName}.json`,
})
```

Moving to the deployed backend means deleting `endpoint` and setting `url`. No controller
changes — that is the whole point of routing mock data through the same port.

`get()` resolves with the **whole envelope** (`{ success, message, data, meta }`, see
`docs/framework/API.md`), because consumers need `meta` for pagination. A legacy
`{ status: "success" }` payload is still accepted.

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

One channel carries two layers, both typed by `iPageEvents` in `@aio-ui/core/events`
(`iPageEvents` extends `iComponentEvents`, so an emitter registered for pages accepts
component events without a cast). A project may ignore the port entirely.

Emitted by the shell through the injected `iEventPort`:

| Event          | Payload                                    | When                                                    |
| -------------- | ------------------------------------------ | ------------------------------------------------------- |
| `pageChanged`  | `{ route, previous }`                      | a render pass starts; `previous` is `null` on the first |
| `beforeRender` | `{ route, components, missing, sequence }` | names derived, before preload                           |
| `ready`        | `{ route, shell, elements, sequence }`     | page attached, theme activated, `onReady` done          |
| `superseded`   | `{ route, sequence, by }`                  | a newer navigation won; this pass will not paint        |
| `themeChanged` | `{ theme, previous, shell }`               | the router reported a different theme id                |
| `error`        | `{ message, route, phase, error }`         | a step failed; previous DOM stays mounted               |
| `destroyed`    | `{ route }`                                | `destroy()` released the modules and removed the shell  |

`phase` is `"prepare" | "preload" | "render" | "ready"`, so a listener can tell which
step failed without pattern-matching the message. Every event names its route: a
listener attached once for the whole session never has to guess which page it is about.
`ready.elements` is the same `id → element` map the controller receives as `blocks`.

### Component events

A component reports what it does to its own nodes — `elementAdded`, `elementChanged`,
`elementRemoved` — through `config.emit`. The registry owns the wiring: the shell calls
`registry.useEmitter(...)` once, at module creation, and every later `registry.build()`
injects that publisher into the component config.

```ts
// in the shell (AioApp does this for you)
registry.useEmitter((event, data) => events?.emit(event, data));
```

The consequences that matter:

| Rule                                       | Why                                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| no emitter registered → no `emit` key      | a LITE project without an event bus keeps working; `config.emit?.(...)` is a no-op    |
| manual config still wins                   | a component is framework-agnostic; `config.emit` is its only channel, so it overrides |
| `emit: null` silences one instance         | the merge order is `theme < emitter < manifest < node`                                |
| unknown event names are allowed            | a component may name its own: `formValidation`, `tabs:content-loaded`, `modeChanged`  |
| a throwing listener does not stop the rest | the bus reports, it is not control flow                                               |

ModeSwitcher used to publish `themeChanged`, which belongs to the shell ("the router
reported a different theme id"); it now publishes `modeChanged`, so one key never carries
two unrelated payloads.

## Debug channel

`debug: true` writes one prefixed line per phase (`render:init`, `modules:created`,
`render:start`, `preload`, `miss`, `render:superseded`, `render:done`, `destroy`). It is
the place to see the decision the entry made without adding console noise to a
production build.

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
