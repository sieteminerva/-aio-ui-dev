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

## Nodes

| Key             | Default tag | Class / note                     |
| --------------- | ----------- | -------------------------------- |
| `@container`    | `div`       | `row`                            |
| `@card`         | `div`       | `card pricing`, wrapped in `.column` |
| `@card>header`  | `div`       | `header` (contains a `span`)     |
| `@card>price`   | `div`       | `item price-tag`                 |
| `@card>divider` | `hr`        | `divider`                        |
| `@card>body`    | `div`       | `body` (contains `ul.features`)  |
| `@card>body>item` | `li`      | `item`                           |
| `@card>actions` | `div`       | `actions` (contains `button.button`) |

`className` on a record is added to the card element, and an `is-featured` token makes the action
button `primary`. A card without a `price` renders no price line, divider-bottom or action.

## Tokens

No `--pricing-card-*` layer. The sheet reads one undeclared name, `--border-soft`, which no package
ships — an app must bridge it or the card border disappears. Recorded as a known gap.

## Wiring checklist

1. Add `"pricing-card"` to `iBuilderRegistry` in `packages/core/src/types/registry.ts`.
2. Add a loader for `@aio-ui/pricingcard` to the host's asset map.
3. Add a `stylesheet` loader for `@aio-ui/pricingcard/PricingCard.css`.
4. List it in the host's route plan: `registerModule(components, [{ route, components: ["pricing-card"] }])`.
