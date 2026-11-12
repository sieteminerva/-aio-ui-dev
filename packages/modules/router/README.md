# HashRouter (`@aio-ui/router`)

The `router` slot. Hash routing for a single-page app: one grammar for route, fragment and
theme, and a redirect instead of a blank screen when the hash names a route nobody registered.

## Payload

None. A route change is reported through `onRouteChanged` (or the app's render pass), never
through a payload.

### Hash grammar

| Hash                         | Read as                           |
| ---------------------------- | --------------------------------- |
| `#route`                     | route, no fragment, current theme |
| `#route/fragment`            | route + the fragment to scroll to |
| `#route/fragment?theme=<id>` | all three                         |

The first segment is the route. An unknown first segment is **not** an error: the router calls
`redirect(defaultRoute, theme, segment)`, so the URL becomes `#<default>/<segment>?theme=…` and
the default page renders. That is why a bare section anchor (`#faq`) silently becomes
`#home/faq` — a section anchor has to be a fragment of a real route.

## Config

| Option           | Default     | Meaning                                                       |
| ---------------- | ----------- | ------------------------------------------------------------- |
| `defaultRoute`   | `"home"`    | Where an unknown or empty hash lands                          |
| `initialTheme`   | `"default"` | Theme id before the hash names one                            |
| `validRoutes`    | `[]`        | Routes that may appear in a hash (the app fills this for you) |
| `onRouteChanged` | no-op       | Called with `{ route, theme, fragment }`                      |

When registered as a module, the host context wins over `config`: `defaultRoute` and `theme`
come from the app, and `routes` comes from what the app really registered.

## Nodes

None — the router never touches the DOM. It only reads and writes the hash.

## Tokens

None.

## Methods

| Method                               | Meaning                                                   |
| ------------------------------------ | --------------------------------------------------------- |
| `parseUrlHash()`                     | Current hash read as `{ route, theme, fragment }`         |
| `navigate(routeId, theme, fragment)` | Go to a route; uses `pushState`, so no `hashchange` fires |
| `redirect(route, theme, fragment)`   | Replace the current entry; what an unknown route triggers |
| `updateValidRoutes(routes)`          | Replace the set of acceptable routes                      |
| `updateValidRoute(route)`            | Add one route                                             |
| `destroy()`                          | Remove the `hashchange` listener                          |

A plain `href="#x"` link bypasses `navigate()`/`redirect()` and only fires `hashchange`;
that is why the listener exists at all.

## Wiring checklist

1. Add `HashRouter` to the app: `.registerModule(HashRouter)`.
2. Do not fill `validRoutes` by hand: the app derives it from `pages ∪ controllers ∪
pageDefinitions`.
3. Read `app.slots.router` when a route must change outside a link.
4. Call `destroy()` only if the app itself is being torn down — it removes the listener.
