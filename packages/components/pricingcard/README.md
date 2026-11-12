# PricingCard (`@aio-ui/pricing-card`)

PricingCard renders one card per record: a header with a divider, a feature list, a price line and an
action button. Because it is a card **group**, its root is a `div.row` and each card is wrapped in a
`div.column` — the grid comes from the host layout.

## Payload

```ts
[
  {
    header: "Basic",
    price: 250000,
    body: [{ title: "1 project" }, { title: "Email support" }],
    className: "is-featured",
  },
];
```

A single record or an array of records. Accepted aliases: `title` for `header`, `content` for
`body`. `config` takes no options — the card is entirely payload-driven.

`price` is formatted with `Intl.NumberFormat("id-ID", { currency: "IDR" })` and printed inside a
`strong`; the surrounding sentence is fixed copy (`Mulai dari … / pax`).

## Config

| Option      | Default      | Meaning                     |
| ----------- | ------------ | --------------------------- |
| `selectors` | see defaults | Per-key tag/class override  |
| `themeId`   | `"default"`  | Passed through to the theme |
| `namespace` | `null`       | Prefix for generated ids    |

`iPricingCardConfig` adds nothing else: the card is entirely payload-driven, so anything that
looks like a setting (`featured`, `label`, `onClick`, `className`) belongs on the record.

## Nodes

| Key               | Default tag | Class / note                         |
| ----------------- | ----------- | ------------------------------------ |
| `@container`      | `div`       | `row`                                |
| `@card`           | `div`       | `card pricing`, wrapped in `.column` |
| `@card>header`    | `div`       | `header` (contains a `span`)         |
| `@card>price`     | `div`       | `item price-tag`                     |
| `@card>divider`   | `hr`        | `divider`                            |
| `@card>body`      | `div`       | `body` (contains `ul.features`)      |
| `@card>body>item` | `li`        | `item`                               |
| `@card>actions`   | `div`       | `actions` (contains `button.button`) |

`className` on a record is added to the card element, and an `is-featured` class token (or an
explicit `featured: true`) makes the action button `primary`. `action.label` (or `label`) sets the
button copy — the default is `Pilih`. A record may also carry `onClick`, which is bound to that
card's own button. A card without a `price` renders no price line, divider-bottom or action;
`price: 0` counts as a price (a free tier).

## Tokens

Declared once on `:root, [data-theme]` in `PricingCard.css`. The sheet used to read four names that no
package declares (`--border-soft`, `--accent`, `--surface-strong`, `--shadow-soft`), so the card border
and the featured accent/wash never applied.

| Token                           | Derives from           | Used for                 |
| ------------------------------- | ---------------------- | ------------------------ |
| `--pricing-card-border-color`   | `--app-border-color`   | Resting card hairline    |
| `--pricing-card-accent-color`   | `--app-accent-color`   | Eyebrow, featured border |
| `--pricing-card-surface-strong` | `--app-surface-strong` | Featured wash (top)      |
| `--pricing-card-surface-muted`  | `--app-surface-muted`  | Featured wash (bottom)   |

## Wiring checklist

1. Add `"pricing-card"` to `iBuilderRegistry` in `packages/core/src/types/registry.ts`.
2. Add a loader for `@aio-ui/pricingcard` to the host's asset map.
3. Add a `stylesheet` loader for `@aio-ui/pricingcard/PricingCard.css`.
4. List it in the host's route plan: `registerModule(components, [{ route, components: ["pricing-card"] }])`.
