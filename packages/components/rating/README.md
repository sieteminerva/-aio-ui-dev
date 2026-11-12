# Rating (`@aio-ui/rating`)

Rating renders one score in one of four visual shapes, chosen by `config.type` at build time:
`star`, `round-bar`, `line-bar` or `count-up`. The payload is only the value; everything else is
config.

The component ships **no stylesheet** (`stylesheet: ""`), so the shapes need host CSS. It also does
not declare a token layer, because it has no sheet to declare one in.

## Payload

```ts
4.5;                          // a bare number
{ value: 4.5 }                // or a record
```

Anything else is treated as `0`. A `star` rating prints `score / max`; `count-up`, `round-bar` and
`line-bar` print the percentage.

## Config

| Option    | Default     | Meaning                                                     |
| --------- | ----------- | ----------------------------------------------------------- |
| `type`    | `"count-up"`| `star`, `round-bar`, `line-bar` or `count-up`                |
| `max`     | `5`         | Upper bound (stars count, or the denominator of the score)   |
| `animate` | `true`      | Animate the bar fill (a `requestAnimationFrame` pass)         |
| `selectors` | see defaults | Per-key tag/class override                                |

The star branch emits exactly `max` items and marks each `star-full`, `star-half` or neither; the
glyph comes from CSS `content`, not from the component.

## Nodes

| Key                   | Default tag | Class                   |
| --------------------- | ----------- | ----------------------- |
| `@container`          | `div`       | `rating-widget-wrapper` |
| `@rating`             | `div`       | `rating-core-display`   |
| `@rating>track`       | `div`       | `bar-track`             |
| `@rating>fill`        | `div`       | `bar-fill`              |
| `@rating>label`       | `span`      | `rating-numerical-label`|
| `@rating>stars-group` | `div`       | `stars-row`             |
| `@rating>stars-item`  | `span`      | `star-icon`             |

`track` + `fill` are emitted for `line-bar` and `round-bar`; `stars-group` + `stars-item` for
`star`; the label is always present.

## Tokens

None, and no `--app-*` read: the sheet is empty because there is no sheet. Treat Rating as a
headless component and bring the CSS with the host.

## Wiring checklist

1. Add `"rating"` to `iBuilderRegistry` in `packages/core/src/types/registry.ts`.
2. Add a loader for `@aio-ui/rating` to the host's asset map.
3. There is no stylesheet to load — register the CSS with the host app.
4. List it in the host's route plan, or build it from a controller: `build("rating", 4.5)`.
