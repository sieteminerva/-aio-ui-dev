# Component Data Shapes

Measured, not guessed: every shape below was taken from the production content file
(`.archives/travel-trip/content.ts`) and then **verified by rendering it** in
`examples/demo` (`#kitchen`). Each row of `examples/demo/src/manifest.ts` carries the
same note, so the demo doubles as the evidence.

Status is what the demo reports, not what the docs wish.

## Verified

| Component       | Input shape (what `build(name, payload)` receives)                                                                   | Evidence                                        |
| --------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `accordion`     | `{ content: [{ title, description }] }`                                                                              | `content.ts:308`                                |
| `carousel`      | `{ content: [{ title, description, image }] }`                                                                       | `content.ts:37`                                 |
| `tab`           | `{ content: { menu: string[], body: any[] } }`                                                                       | gallery `content/blog` usage                    |
| `section`       | `{ id, className, content: [ { className, content: [ { imageUrl, eyebrow, title, description, actions? } ] } ] }`    | `content.ts:296`                                |
| `footer`        | `{ content: { id?, company, copyright?, columns: [{ title?, description?, actions?: [{ label, href\|value }] }] } }` | `.archives/travel-trip/main.ts:61`              |
| `menu`          | `{ content: { navigations: [{ href, label, title }], actions: [] } }`                                                | rendered nav                                    |
| `fab-menu`      | `{ title, actions: [{ label }] }` — **no** `content` wrapper                                                         | `prepare()` reads `content.actions`             |
| `mode-switcher` | `{}`                                                                                                                 | self-contained                                  |
| `pricing-card`  | **array** of `{ header, body: [{ title, className? }], price, action: { label } }`                                   | `content.ts:531`                                |
| `product-card`  | `{ uid, name, category, title, description, price, colors: [{ name, value }], artwork: { src } }`                    | `content.ts:692`                                |
| `product-grid`  | `{ content: { data: [<product-card payload>] } }`                                                                    | `ProductGrid.prepare` reads `data.content.data` || `product-detail`| `{ uid, category, title, description, price, currency, colors: [{ name, value }], artwork: { src } }`               | `pages/product.ts` — one record, `onBack`/`onAddToCart` || `modal`         | `{ content }` (string or nodes) + `config: { id, title, destroyOnClose?, onReady? }`                                 | `Modal.ts` — `prepare()` returns the element    |

## Rules that came out of measuring

1. **`builder` is a declaration, and it owns the node.** A node carrying `builder` has its
   `content` consumed by the builder — its children are _not_ rendered. Put the
   declaration on an empty host node, never on a node that must keep children.
2. **Only declared names are preloaded.** `build()` throws "module was not preloaded" if
   the name never appeared in a `builder` key. The demo caught this on the first run.
3. **`schema: data` vs `content` unwrapping is a manifest choice.** The gallery manifests
   pick `data.content`; the demo hands the payload straight over as `schema`. Both are
   valid — the payload contract is per component, the registry is neutral.
4. **Some builders want a node, some want the raw record.** `fab-menu` reads
   `content.actions`; `product-card` reads `content.content ?? content`. That difference is
   the main obstacle to one universal input shape (see analysis below).
5. **`modal` is element-returning like everything else, but its lifecycle is opt-in.**
   `prepare()` returns the overlay element (no auto-append to `document.body`), so the
   registry can mount it. `destroyOnClose: true` makes the instance **single-use** — closing
   destroys it, and calling `open()` afterwards only warns. To keep a modal reusable across
   renders, use `destroyOnClose: false` and grab the handle from `config.onReady(controls)`.
6. **`footer` is two rows, not a list of records.** Row 1 is `content.columns[]` (any count,
   auto-fitted by CSS); row 2 is the copyright line generated from `company` plus the live
   year, overridable with `copyright: "… {year} … {company} …"`. Each column is free-form —
   title only, actions only, or both — and absent parts are not rendered at all. A payload
   without `columns` is read as a single column (`title`/`description`/`actions` flat).
   Action `href` values are scheme-inferred: an email becomes `mailto:`, a phone `tel:`,
   and a non-addressable value (a street address) stays visible text with an inert `#`.
7. **`carousel` view state lives in config, not payload.** `slidesPerView` rewrites both the
   track width (`slides / perView × 100%`) and the navigation count (`maxDots = slides −
perView + 1`), so with 4 slides and `slidesPerView: 2` there are 2 stops and 3 dots.
   `animation: "fade"` is forced to `slide-left` when `slidesPerView > 1`, and to
   `slide-up` when `vertical`. `loop: false` clamps at the ends instead of wrapping.
   `showControl`/`showNavigation` accept `"auto"`, which adds `.auto-controls` (hover to
   reveal); `true` keeps them visible.
8. **`section` is one row of 2–3 columns, and the grid decides the count.** Each column is
   a block (or a list of blocks) rendered in the order image → eyebrow → title →
   description → actions. The column count is pure CSS (`auto-fit` + an 18rem floor): 3
   tracks on a page-width container, 2 in the middle, 1 below `768px`, where the image also
   takes the full row. Old payloads carry flex utilities in `column.className`
   (`column half`, `column full`) — the component neutralises `flex`/`max-width` on the
   column so those cannot halve a grid cell. `imageUrl` and `image` are both accepted, and
   `alt` is separate from `title` so an image block needs no heading.

New components start from the scaffold, not from an existing file:
`node scripts/new-component.mjs <name>` → [`COMPONENT-TEMPLATE.md`](./COMPONENT-TEMPLATE.md),
conventions in [`COMPONENT-CONVENTIONS.md`](./COMPONENT-CONVENTIONS.md). The demo's route
split (element vs page components) is described in [`DEMO.md`](./DEMO.md).

## Known gaps

| Gap              | Detail                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `product-card`   | `ProductCard` reads `variants[].imageUrl` on first paint and `variants[].src` when switching colours, so a caller must supply both — `ProductGrid` now does, a hand-built payload must too. |

## Analysis — can this be universal?

Short answer: **no single shape, but one schema with three declared facets.**

What the data actually shows: every payload is one of three things —

| Facet       | Who uses it                                                              | What it means               |
| ----------- | ------------------------------------------------------------------------ | --------------------------- |
| `items`     | accordion, carousel, pricing-card, masonry, table, product-grid, article | an ordered list of records  |
| `fields`    | section, footer, menu, fab-menu, product-card, modal                     | one record, rendered by key |
| `structure` | content nodes, `tab.body`                                                | nested nodes/blocks         |

Trying to unify them produces the `content.content`, `content.data`, `contents` mess we
just measured — each builder invented its own unwrapping. A cleaner target is a payload
envelope that a **transformer** fills, not that builders guess:

```ts
interface iComponentInput {
  kind: "items" | "fields" | "structure";
  /** Raw records, always an array for `items`. */
  data: unknown;
  /** Optional per-build config (already supported via `node.config`). */
  config?: Record<string, unknown>;
}
```

Builders would read `input.data` and stop guessing whether it is wrapped in `content`.
That is a breaking change for all 17 builders, so it belongs to a phase where components
are being touched anyway — not to the demo. The value of measuring first: we now know the
exact list of places that would change (`accordion`, `carousel`, `pricing-card`,
`product-card`, `product-grid`, `section`, `fab-menu`, `menu`, `footer`, `modal`) and that
`items` covers 7 of them, which is where the payoff is.
