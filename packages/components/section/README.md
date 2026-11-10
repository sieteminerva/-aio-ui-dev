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

## Actions

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

## Notes

- Legacy payloads carry `className: "column half"` / `"column full"` from the old flex
  layout system. Those classes are still applied (so you can hook them) but `flex` and
  `max-width` are neutralised on `.section-column`, because the grid owns sizing.
- Styling is self-contained: `Section.css` ships with the package, so nothing depends on
  `@aio-ui/styles`.
