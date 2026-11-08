# Component Data Shapes

Measured, not guessed: every shape below was taken from the production content file
(`.archives/travel-trip/content.ts`) and then **verified by rendering it** in
`examples/demo` (`#kitchen`). Each row of `examples/demo/src/manifest.ts` carries the
same note, so the demo doubles as the evidence.

Status is what the demo reports, not what the docs wish.

## Verified

| Component | Input shape (what `build(name, payload)` receives) | Evidence |
| --- | --- | --- |
| `accordion` | `{ content: [{ title, description }] }` | `content.ts:308` |
| `carousel` | `{ content: [{ title, description, image }] }` | `content.ts:37` |
| `tab` | `{ content: { menu: string[], body: any[] } }` | gallery `content/blog` usage |
| `section` | `{ id, className, content: [ { className, content: [ { imageUrl, eyebrow, title, description, actions? } ] } ] }` | `content.ts:296` |
| `footer` | `{ content: { columns: [] } }` (columns optional in practice) | rendered empty skeleton |
| `menu` | `{ content: { navigations: [{ href, label, title }], actions: [] } }` | rendered nav |
| `fab-menu` | `{ title, actions: [{ label }] }` — **no** `content` wrapper | `prepare()` reads `content.actions` |
| `mode-switcher` | `{}` | self-contained |
| `pricing-card` | **array** of `{ header, body: [{ title, className? }], price, action: { label } }` | `content.ts:531` |
| `product-card` | `{ uid, name, category, title, description, price, colors: [{ name, value }], artwork: { src } }` | `content.ts:692` |
| `product-grid` | `{ content: { data: [<product-card payload>] } }` | `ProductGrid.prepare` reads `data.content.data` |
| `modal` | **not registry-buildable** — `prepare()` returns `{ open, close, unmount, element }` | see "Known gaps" |

## Rules that came out of measuring

1. **`builder` is a declaration, and it owns the node.** A node carrying `builder` has its
   `content` consumed by the builder — its children are *not* rendered. Put the
   declaration on an empty host node, never on a node that must keep children.
2. **Only declared names are preloaded.** `build()` throws "module was not preloaded" if
   the name never appeared in a `builder` key. The demo caught this on the first run.
3. **`schema: data` vs `content` unwrapping is a manifest choice.** The gallery manifests
   pick `data.content`; the demo hands the payload straight over as `schema`. Both are
   valid — the payload contract is per component, the registry is neutral.
4. **Some builders want a node, some want the raw record.** `fab-menu` reads
   `content.actions`; `product-card` reads `content.content ?? content`. That difference is
   the main obstacle to one universal input shape (see analysis below).

## Known gaps

| Gap | Detail |
| --- | --- |
| `modal` | `prepare()` returns control handles, not an element, so `ComponentRegistry.build()` cannot mount it. Needs either a manifest flag (`returns: "controls"`) or `build()` gaining a second return path. Nothing else in the catalogue behaves this way. |
| `section` | No stylesheet of its own; relies on `@aio-ui/styles`. Payload is a *column of columns*, which is more nesting than the visual result suggests. |
| `footer` | No stylesheet; `columns` shape still unverified (renders an empty footer). |
| `carousel` | Three slides mount, but slide count/`auto-controls` behaviour depends on `config.showControl`/`showNavigation` which the demo does not set. |
| `product-detail` | `packages/components/product/ProductDetail.ts` exports no Builder class — it cannot be registered until it is rewritten. |

## Analysis — can this be universal?

Short answer: **no single shape, but one schema with three declared facets.**

What the data actually shows: every payload is one of three things —

| Facet | Who uses it | What it means |
| --- | --- | --- |
| `items` | accordion, carousel, pricing-card, masonry, table, product-grid, article | an ordered list of records |
| `fields` | section, footer, menu, fab-menu, product-card, modal | one record, rendered by key |
| `structure` | content nodes, `tab.body` | nested nodes/blocks |

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
