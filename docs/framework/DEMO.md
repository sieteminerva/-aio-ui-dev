# Demo — routes

The demo exists to measure components, so it is split by the two kinds of thing the
framework actually has. They behave differently, and jamming them into one page hid that.

| Route              | Kind    | What it proves                                                       |
| ------------------ | ------- | -------------------------------------------------------------------- |
| `#getting-started` | docs    | setup, the import map, and `docs/framework/APP.md` rendered verbatim |
| `#modules`         | docs    | one row per module package; the body is that package's own README    |
| `#kitchen`         | element | every component that is "one builder, one node", driven by a table   |
| `#product`         | page    | list + filter + detail, composed **at page level**                   |
| `#article`         | page    | the same shape, but composed **inside the builder** (its slots)      |
| `#form`            | page    | a schema with validation, handlers and its own submit cycle          |

The two `docs` routes print what the packages really declare: Getting Started quotes
`packages/app/src/types.ts`, and the module rows quote each package's `slot`, config and public
methods. `#modules` selects in the fragment (`#modules/router`), like `#kitchen/<name>`.

## Deployed copy

`https://sieteminerva.github.io/-aio-ui-dev/` — the demo, rebuilt from `main` by
`.github/workflows/deploy.yml` (`npm ci` → `npm run build:pkgs` → demo build → Pages). The
workflow sets `DEMO_BASE=/-aio-ui-dev/` because a project page lives under the repository name;
local dev keeps the default `/demo/`. Routing is hash-only, so the site needs no 404 fallback.

## Element components (`#kitchen`)

`manifest.ts` is the single source: one row per component with `path`, `stylesheet`,
`payload`, optional `config` and `note`. `pages/kitchen.ts` turns the table into one
`section` per row and mounts it through the registry, catching failures per section so a
broken builder shows a red status line instead of blanking the page.

Adding a component here is a row, not an edit in three files.

**A component appears in exactly one place.** `product-card` and `product-grid` used to
sit in this table as well; once `#product` showed them with real data, the table rows were
removed — a catalogue entry that duplicates a route tests nothing new and drifts from the
real payload. Coverage of a component is measured where it is actually used.

## Page components (`#product`, `#article`, `#form`)

Big components own a route. They take data asynchronously, decide their own layout, and
hold state (selected product, open article, form values). Two composition styles are
demonstrated on purpose:

- **Page-level composition** — `pages/product.ts` builds three modules itself:
  a filter block, `product-grid` (one `product-card` per record) and `product-detail`.
  The page owns "card clicked → open detail → back → list", so each module stays
  ignorant of navigation. The modules are mounted by the host node's handler and named
  in the route plan in `main.ts` (`{ route: "product", components: […] }`), which is
  what preloads them.

- **Builder-level composition** — `#article` mounts one `article` builder and gets the
  whole slot layout (`controls` → `list` → `aside`, with `list` swapping to `detail` on
  selection) from inside `ArticleBuilder`. The page only supplies data and config.
  Which style a component uses is a judgement call: article's slots are always the same,
  product's are configuration.

`#form` is the third case: the page supplies a schema and listens for `formSubmit` /
`formValidation`; everything else — fields, labels, validation, submit — belongs to the
builder. The route holds four things worth reading before changing it:

- **The schema is a page artefact** (`pages/form.ts`): three exported sets — `InputControlSet`
  (action rows, `search`/`copy`/`editor`/`repeater`), `AddressSet` (the Id Address cascade),
  `DropdownSet` — plus a multistep schema on a second host. Nothing in it is component code.
- **Modules are declared, not imported** — `formManifest()` returns `FORM_ADAPTER_MANIFEST`
  plus the three foreign adapters (`id-address/form`, `table/adapters/FormAdapter`,
  `message/adapters/FormAdapter`). The registry resolves each as its own chunk; the page never
  imports `table` or `id-address`.
- **The cascade needs `cascadeMode: "hidden"`** — `cascading: true` alone plants a
  `<template>`, which gives the next picker nothing to inject into. `AddressSet`'s four
  dropdowns carry `data-level` (`propinsi` → `kota` → `kecamatan` → `kelurahan`) and the
  kodepos text field closes the chain; each dropdown sets `max: 100`, because `max` is the
  picker's render cap, not a search limit (the default 10 truncated a 61-district list).
- **Read-only actions bubble up** — a group's `search` is a read, not a submit: the event
  reaches the page from the fieldset, so the page answers it without knowing the controls
  layer. `formSubmit` / `formValidation` are logged into a `pre.form-log` beside the form.

The address endpoint lives in the page (`address: { url, useAdapter: "aio" }`); the picker
ships no endpoint of its own.

## Data

Every route goes through `HttpService`, including the static mocks:

```ts
const mockApi = {
  url: "",
  endpoint: (query) => `${import.meta.env.BASE_URL}mock/${query.sheetName}.json`,
};
```

| Sheet      | File                        | Used by    |
| ---------- | --------------------------- | ---------- |
| `products` | `public/mock/products.json` | `#product` |
| `articles` | `public/mock/articles.json` | `#article` |

Moving to a real backend means deleting `endpoint` and setting `url` — no page changes.
Controllers respect `ctx.signal`: a navigation that supersedes a fetch drops the result
instead of painting it.

## Assets

Product photography lives in `public/apparel/` and is referenced by **relative path**
(`apparel/man_tshirt_standard_o-neck.png`):

- `ProductCard` prefixes `import.meta.env.BASE_URL` itself, so the record stays portable;
- `ProductDetail` and `ArticleBuilder` get the same relative path and resolve against the
  page URL.

Files: two apparel shots (`man_tshirt_standard_o-neck.png`, `man_shirt_long_slevee.png`)
and four merchandise shots (`Promotion_Mug/Cushion/Balloon/Pin.png`).

## Page-component registrations

The demo registers page components explicitly in `main.ts`, because they take
`{ config, schema }` rather than "the whole node is the payload":

```ts
components
  .register("product-grid", pageComponent("@aio-ui/product/ProductGrid", "…/ProductGrid.css"))
  .register("product-detail", pageComponent("@aio-ui/product/ProductDetail", "…/ProductDetail.css"))
  .register("article", pageComponent("@aio-ui/article/Article", "…/Article.css"))
  .register("form", pageComponent("@aio-ui/form/Form", "…/Form.css"));
```

Element rows from `manifest.ts` keep the simpler registration (`schema: data`). Both are
valid; the difference is whether a component needs a config _and_ a payload at once.

`HttpService` logs nothing by default. If you need request diagnostics while wiring a
route, pass `debug: true` next to `endpoint`:

```ts
.registerModule(HttpService, { ...mockApi, debug: true })
```

## Theme switcher

The switcher is host chrome, wired into a **fab menu** (`src/theme-switcher.ts`), and it is
included on every route:

```
fab item click → location.hash = "#<route>?theme=<id>"
              → HashRouter parses ?theme →
              → AioApp sees a different theme → ThemeRenderer.use() → re-render
```

That is the whole contract — no framework API was invented for switching. Notes:

- the menu marks the active theme with `isActive`, read from the current URL;
- `closeOnSelected: false` keeps the panel open while comparing themes, and the idle timer
  still closes it;
- `fab-menu` is registered explicitly in `main.ts` (`pageComponent(...)`) so it can receive
  `config` (`position`, `displayIcon`, …) next to its payload;
- the demo's own chrome (body/nav/sections) reads `--app-*` tokens, so a theme switch is
  visible end-to-end instead of only inside components.

Available ids: `default`, `cyberpunk` — add one by importing its package in `main.ts` and
appending it to `THEMES`.

The switcher prefers the app's own door when a handle exists:

```ts
const app = (globalThis as any).__app; // the demo keeps its handle for debugging
if (app?.theme?.use)
  app.theme.use(id); // router-driven: URL + storage + re-render
else location.hash = hashWithTheme(id); // fallback: the hash alone is enough
```

See [`APP.md`](./APP.md#themes--a-namespace-not-another-register) for why themes are
registered through `app.theme.register()` instead of a third `register*` method.
