# Menu (`@aio-ui/menu`)

One navigation bar, built from a flat link list. The list is split by convention — first entry is
the brand, an entry marked `button` (or a `tel:` link) is the call to action, the rest are links —
so a spreadsheet row and a hand-written array produce the same bar.

`type: "top"` renders a `<nav class="nav">`; `type: "sidebar"` wraps it in an `aside.sidebar` and
adds the `vertical` modifier to the nav.

## Payload

```ts
{
  navigations: [{ label: "Home", href: "#home" }, { label: "CTA", href: "#x", className: "button" }];
}
```

`{ content: { navigations } }` is accepted too (the registry unwraps envelopes). A single object is
wrapped into a one-entry list. `content.actions` is optional and is appended to the actions group.

| Slot        | Rule                                                              |
| ----------- | ----------------------------------------------------------------- |
| brand       | `navigations[0]` — falls back to `{ label: "Brand", href: "#home" }` |
| actions     | `className === "button"` or an `href` containing `tel:`, plus `content.actions` |
| navigations | everything else, in payload order                                 |

The split is `splitMenuContent()` in `Menu.engine.ts` — pure, exported from the package entry so the
rule can be tested without a DOM.

## Config

| Option         | Default                                             | Meaning                                                        |
| -------------- | --------------------------------------------------- | -------------------------------------------------------------- |
| `type`         | `"top"`                                             | `"top"` or `"sidebar"` (adds `aside.sidebar` + `vertical`)      |
| `selectors`    | see Nodes                                           | Per-key tag/class override, merged over the defaults           |
| `defaultRoute` | `"home"`                                            | Route used when a link has no usable `href`                    |
| `routes`       | `["home", "package", "gallery", "dashboard", "wizard"]` | Routes considered known when resolving a link              |
| `themeId`      | `"default"`                                         | Passed through to the theme                                    |
| `onNavigate`   | returns `true` when the link has an `href`           | Return `true` to swallow the click. **The default swallows every link that has an `href`** — pass a handler that returns `false` to let the router own navigation |

## Nodes

| Key                       | Default tag | Class / note                                        |
| ------------------------- | ----------- | --------------------------------------------------- |
| `@container`              | `aside`     | `sidebar` — only used when `type: "sidebar"`        |
| `@menu`                   | `nav`       | `nav`                                               |
| `@menu>brand`             | `div`       | `brand`, carries the logo `src` attribute           |
| `@menu>hamburger`         | `button`    | `hamburger-btn`, toggles the `.open` class          |
| `@menu>navigations`       | `ul`        | `navigations`; its id is forced to `primary-navigations` |
| `@menu>navigations>item`  | `li`        | `item` — one per navigation link                    |
| `@menu>item>link`         | `a`         | gets the entry's `className` and `href`             |
| `@menu>item>icon`         | `i`         | `icon`                                              |
| `@menu>actions`           | `div`       | `actions` — holds the CTA entries                   |

## Tokens

Declared once on `:root, [data-theme]` in `Menu.css`. Before that layer the sheet read a private
namespace (`--surface-bg`, `--text-main`, `--border-soft`, …) that no package declares, so it only
rendered because the host bridged those names onto the app tokens. The values below are exactly that
bridge — the pass renamed a host bridge into the package's own tokens and changed nothing visually.

| Token                    | Derives from                        | Used for                          |
| ------------------------ | ----------------------------------- | --------------------------------- |
| `--menu-background`      | `--app-surface-background-color`    | Bar surface                       |
| `--menu-border-color`    | `--app-border-color`                | Hairline                          |
| `--menu-shadow`          | `--app-shadow-soft`                 | Bar shadow                        |
| `--menu-radius`          | `--app-component-border-radius`     | Bottom corner radius              |
| `--menu-heading-color`   | `--app-text-color`                  | Brand / heading text              |
| `--menu-text-color`      | `--app-text-color`                  | Link text                         |
| `--menu-muted-color`     | `--app-text-accent-color`           | Secondary text                    |
| `--menu-hover-background`| `--app-surface-muted`               | Hover / active row wash           |

`--menu-heading-color` derives from `--app-text-color`, **not** `--app-text-heading-color`, on
purpose: the host bridge mapped `--text-heading` to the body colour, and this layer preserves that
value. Changing it is a restyle, not a layer change.

## Wiring checklist

1. Add `"menu"` to `iBuilderRegistry` in `packages/core/src/types/registry.ts`.
2. Add a loader for `@aio-ui/menu/Menu` to the host's asset map.
3. Add a `stylesheet` loader for `@aio-ui/menu/Menu.css`.
4. List it in the host's route plan: `registerModule(components, [{ route, components: ["menu"] }])`.
   A menu built inside `onCreated` is invisible to `collect(nodes)`, so a cold load fails without it.
