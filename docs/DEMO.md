# Demo — routes

The demo exists to measure components, so it is split by the two kinds of thing the
framework actually has. They behave differently, and jamming them into one page hid that.

| Route       | Kind       | What it proves                                                       |
| ----------- | ---------- | -------------------------------------------------------------------- |
| `#kitchen`  | element    | every component that is "one builder, one node", driven by a table    |
| `#product`  | page       | list + filter + detail, composed **at page level**                    |
| `#article`  | page       | the same shape, but composed **inside the builder** (its slots)       |
| `#form`     | page       | a schema with validation, handlers and its own submit cycle           |

## Element components (`#kitchen`)

`manifest.ts` is the single source: one row per component with `path`, `stylesheet`,
`payload`, optional `config` and `note`. `pages/kitchen.ts` turns the table into one
`section` per row and mounts it through the registry, catching failures per section so a
broken builder shows a red status line instead of blanking the page.

Adding a component here is a row, not an edit in three files.

## Page components (`#product`, `#article`, `#form`)

Big components own a route. They take data asynchronously, decide their own layout, and
hold state (selected product, open article, form values). Two composition styles are
demonstrated on purpose:

- **Page-level composition** — `pages/product.ts` builds three modules itself:
  a filter block, `product-grid` (one `product-card` per record) and `product-detail`.
  The page owns "card clicked → open detail → back → list", so each module stays
  ignorant of navigation. Modules that the page builds must be declared on the host node
  (`builder: ["product-grid", "product-detail"]`) — that declaration is what preloads
  them.

- **Builder-level composition** — `#article` mounts one `article` builder and gets the
  whole slot layout (`controls` → `list` → `aside`, with `list` swapping to `detail` on
  selection) from inside `ArticleBuilder`. The page only supplies data and config.
  Which style a component uses is a judgement call: article's slots are always the same,
  product's are configuration.

`#form` is the third case: the page supplies a schema and listens for `formSubmit` /
`formValidation`; everything else — fields, labels, validation, submit — belongs to the
builder.

## Data

Every route goes through `HttpService`, including the static mocks:

```ts
const mockApi = {
  url: "",
  endpoint: (query) => `${import.meta.env.BASE_URL}mock/${query.sheetName}.json`,
};
```

| Sheet       | File                            | Used by      |
| ----------- | ------------------------------- | ------------ |
| `products`  | `public/mock/products.json`     | `#product`   |
| `articles`  | `public/mock/articles.json`     | `#article`   |

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
valid; the difference is whether a component needs a config *and* a payload at once.
