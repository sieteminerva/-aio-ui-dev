# Product (`@aio-ui/product`)

A catalogue with two views that only make sense together: a grid of cards and a detail
record. `ProductBuilder` is the composition root — it owns the swap and the host keeps what
only it can know (where the data came from, what "add to cart" means).

## Payload

The shape of the content decides the first view:

| Content                       | View                   |
| ----------------------------- | ---------------------- |
| `[...]` or `{ items: [...] }` | Grid of `ProductCard`s |
| `{ record: { … } }`           | Detail view directly   |

## Config

| Option        | Default     | Meaning                                                   |
| ------------- | ----------- | --------------------------------------------------------- |
| `view`        | `"grid"`    | Starting view; `"detail"` only works with a single record |
| `grid`        | `{}`        | Forwarded to `ProductGridBuilder`                         |
| `detail`      | `{}`        | Forwarded to `ProductDetailBuilder`                       |
| `onAddToCart` | —           | `{ product, color }` after the shopper confirms           |
| `onOpen`      | —           | A card was opened (routing / analytics)                   |
| `onBack`      | —           | Detail view was left                                      |
| `selectors`   | see kit     | Per-key tag/class override                                |
| `themeId`     | `"default"` | Passed through to the theme                               |
| `namespace`   | `null`      | Prefix for generated ids                                  |

## Sub-modules

`productModules()` returns the two views as registry sub-modules with their own `scope` and
`stylesheet`, so a host registers one word:

| Id       | Scope    | Export                 | Stylesheet          |
| -------- | -------- | ---------------------- | ------------------- |
| `grid`   | `grid`   | `ProductGridBuilder`   | `ProductGrid.css`   |
| `detail` | `detail` | `ProductDetailBuilder` | `ProductDetail.css` |

`ProductBuilder` itself declares **no** stylesheet: it renders one wrapper class, and each view
brings its own sheet. `ProductGrid.css` `@import`s `ProductCard.css`, because the grid
instantiates cards directly (not through the registry) and their stylesheet would otherwise
never be injected.

## Nodes — detail

| Key                             | Tag       | Class                    |
| ------------------------------- | --------- | ------------------------ |
| `@detail`                       | `article` | `product-detail`         |
| `@detail>media`                 | `div`     | `product-detail-media`   |
| `@detail>media>image`           | `img`     | `product-detail-image`   |
| `@detail>body`                  | `div`     | `product-detail-body`    |
| `@detail>body>eyebrow`          | `div`     | `product-detail-eyebrow` |
| `@detail>body>title`            | `h2`      | `product-detail-title`   |
| `@detail>body>desc`             | `p`       | `product-detail-desc`    |
| `@detail>body>price`            | `div`     | `product-detail-price`   |
| `@detail>body>colors`           | `div`     | `product-detail-colors`  |
| `@detail>body>colors>item`      | `button`  | `product-detail-color`   |
| `@detail>body>actions`          | `div`     | `product-detail-actions` |
| `@detail>body>actions>back`     | `button`  | `product-detail-back`    |
| `@detail>body>actions>checkout` | `button`  | —                        |

## Nodes — grid

| Key               | Tag       | Class            |
| ----------------- | --------- | ---------------- |
| `@grid`           | `section` | `grid`           |
| `@grid>container` | `div`     | `row full-width` |

The grid builder's registry name is `product-card-grid`; the cards are `.product`.

## Tokens

Three sheets, three prefixes — a card never inherits the detail view's look by accident.

`ProductDetail.css`, declared once on `:root, [data-theme]`:

| Token                            | Derives from                                   | Used for                               |
| -------------------------------- | ---------------------------------------------- | -------------------------------------- |
| `--product-detail-gap`           | `--app-gap`                                    | Media / body gap                       |
| `--product-detail-media-radius`  | `--app-image-border-radius`                    | Media corner radius                    |
| `--product-detail-media-surface` | `--app-surface-strong` + `--app-surface-muted` | Media radial wash                      |
| `--product-detail-eyebrow-size`  | `--app-font-size-xs`                           | Eyebrow size                           |
| `--product-detail-title-size`    | `--app-font-size-2xl`                          | Title size                             |
| `--product-detail-price-size`    | `--app-font-size-xl`                           | Price size                             |
| `--product-detail-text-size`     | `--app-font-size-base`                         | Description size                       |
| `--product-detail-action-size`   | `--app-font-size-sm`                           | Back button size                       |
| `--product-detail-accent-color`  | `--app-primary-color`                          | Eyebrow, active swatch, hover hairline |
| `--product-detail-border-color`  | `--app-border-color`                           | Media and swatch hairline              |
| `--product-detail-focus-ring`    | `--app-border-focus`                           | Focus outline                          |
| `--product-detail-swatch-ring`   | `--app-accent-subtle`                          | Ring around the active swatch          |
| `--product-detail-title-color`   | `--app-text-heading-color`                     | Title and price text                   |
| `--product-detail-text-color`    | `--app-text-accent-color`                      | Description and back button            |

`ProductGrid.css`, declared once on `:root, [data-theme]`:

| Token                       | Derives from         | Used for      |
| --------------------------- | -------------------- | ------------- |
| `--product-grid-gap`        | `--app-gap`          | Card grid gap |
| `--product-grid-focus-ring` | `--app-border-focus` | Focus outline |

Redeclare any `--product-detail-*` / `--product-grid-*` on an ancestor to retheme one view.

**Open gap, not fixed here:** `ProductCard.css` declares nothing. It reads `--surface-main`
and `--radius-image` (neither is declared by any package) and hardcodes a dark-page look —
`border: 1px solid rgba(255, 255, 255, 0.06)`, `background-color: #f5f5f5`,
`box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2)`. Its tokens are therefore named `--product-card-*`
once someone designs that layer; on a light theme the card currently renders on a host bridge.

## Wiring checklist

1. Add `"product"` to `iBuilderRegistry` in `packages/core/src/types/registry.ts`.
2. Register with the sub-modules: `registry.register("product", () => ({ path: "@aio-ui/product", export: "ProductBuilder", modules: productModules() }))`.
3. Add asset-map loaders for `@aio-ui/product/ProductGrid.css` and `@aio-ui/product/ProductDetail.css`.
4. List it in the host's route plan: `registerModule(components, [{ route, components: ["product"] }])` — a builder called inside `onCreated` is invisible to `collect(nodes)`.
