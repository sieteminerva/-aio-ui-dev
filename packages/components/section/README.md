# Section (`@aio-ui/section`)

One row of 2–3 content columns. Each column stacks image → eyebrow → title →
description → actions. The column count is decided by CSS, not by the payload: the grid
`auto-fit`s as many 18rem tracks as fit, and collapses to one column under `768px` with
the image spanning the full row.

## Payload

```ts
{
  id?: string,
  className?: string,
  content: [
    {
      className?: string,
      content: [
        { imageUrl? | image?, alt?, eyebrow?, title?, description?, actions? }
      ]
    }
  ]
}
```

A column whose own fields look like a block is treated as one block, so
`content: [{ eyebrow, title, description, imageUrl, actions }]` also works.
`normalizeColumns()` is the only place that decides this.

## Config

| Option      | Default      | Meaning                                           |
| ----------- | ------------ | ------------------------------------------------- |
| `className` | —            | Extra class added to the root, e.g. `"container"` |
| `selectors` | see defaults | Per-key tag/class override                        |
| `themeId`   | `"default"`  | Passed through to the theme                       |
| `namespace` | `null`       | Prefix for generated ids                          |

### Actions

| Field     | Meaning                                                            |
| --------- | ------------------------------------------------------------------ |
| `label`   | Button text                                                        |
| `href`    | Renders the CTA as a link                                          |
| `onClick` | Used only when `href` is absent; the CTA then gets `role="button"` |

The second CTA is styled as secondary (outline) automatically.

## Nodes

| Key                             | Tag       | Class             |
| ------------------------------- | --------- | ----------------- |
| `@section`                      | `section` | `section`         |
| `@section>content`              | `div`     | `section-column`  |
| `@section>content>image`        | `img`     | `section-image`   |
| `@section>content>eyebrow`      | `div`     | `section-eyebrow` |
| `@section>content>header`       | `h2`      | `section-title`   |
| `@section>content>desc`         | `p`       | `section-desc`    |
| `@section>content>actions`      | `div`     | `section-actions` |
| `@section>content>actions>item` | `a`       | `section-cta`     |

## Tokens

Declared once on `:root, [data-theme]` in `Section.css`. Each derives from an app token with a
literal fallback, so a theme retunes the app token and this sheet follows; redeclare a
`--section-*` token on an ancestor to retheme this component alone.

| Token                            | Derives from                | Used for                            |
| -------------------------------- | --------------------------- | ----------------------------------- |
| `--section-gap`                  | `--app-gap`                 | Grid gap                            |
| `--section-image-radius`         | `--app-image-border-radius` | Media corner radius                 |
| `--section-shadow`               | `--app-shadow-soft`         | Media shadow                        |
| `--section-eyebrow-size`         | `--app-font-size-xs`        | Eyebrow size                        |
| `--section-title-size`           | `--app-font-size-2xl`       | Title size                          |
| `--section-title-size-compact`   | `--app-font-size-xl`        | Title size under `768px`            |
| `--section-text-size`            | `--app-font-size-base`      | Description size                    |
| `--section-cta-size`             | `--app-font-size-sm`        | CTA label size                      |
| `--section-accent-color`         | `--app-primary-color`       | Eyebrow text, CTA hairline, 2nd CTA |
| `--section-cta-background`       | `--app-primary-color`       | CTA fill                            |
| `--section-cta-hover-background` | `--app-primary-hover`       | CTA fill on hover / focus           |
| `--section-cta-text-color`       | `--app-text-on-primary`     | CTA label on the fill               |
| `--section-cta-focus-ring`       | `--app-border-focus`        | Focus outline                       |
| `--section-title-color`          | `--app-text-heading-color`  | Title text                          |
| `--section-text-color`           | `--app-text-accent-color`   | Description text                    |

`--section-accent-color` and `--section-cta-background` carry the same value on purpose: one is a
foreground/border token, the other a fill, so a palette can move them independently. The CTA
foreground must stay derived from `--app-text-on-primary` — it is the WCAG pick for text on the
primary fill, not a background colour reused as ink.

## Wiring checklist

1. Add `"section"` to `iBuilderRegistry` in `packages/core/src/types/registry.ts`.
2. Add a loader for `@aio-ui/section/Section` to the host's asset map.
3. Add a `stylesheet` loader for `@aio-ui/section/Section.css`.
4. List it in the host's route plan: `registerModule(components, [{ route, components: ["section"] }])`.

## Appendix

- Legacy payloads carry `className: "column half"` / `"column full"` from the old flex
  layout system. Those classes are still applied (so you can hook them) but `flex` and
  `max-width` are neutralised on `.section-column`, because the grid owns sizing.
- Styling is self-contained: `Section.css` ships with the package, so nothing depends on
  `@aio-ui/styles`.
