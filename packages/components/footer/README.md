# Footer (`@aio-ui/footer`)

A two-row page footer: an auto-fitted grid of link columns, then a copyright line separated by a
hairline. The column count is not configured — `auto-fit` fits as many ~14rem columns as the width
allows and wraps the rest.

## Payload

```ts
{
  columns: [
    {
      header: "…",
      description: "…",
      list: [{ value: "…", href: "#…" }],
    },
  ];
  copyright: "…";
}
```

An entry may also be a plain string, which becomes a single-column block. `header` falls back to
`title`, and a list entry uses `href` or `value` as its link target.

## Config

| Option         | Default      | Meaning                     |
| -------------- | ------------ | --------------------------- |
| `useInfo`      | `true`       | Render the column rows      |
| `useCopyright` | `true`       | Render the bottom row       |
| `selectors`    | see defaults | Per-key tag/class override  |
| `themeId`      | `"default"`  | Passed through to the theme |

## Nodes

| Key                            | Default tag | Class / note    |
| ------------------------------ | ----------- | --------------- |
| `@footer`                      | `footer`    | `footer`        |
| `@footer>row`                  | `div`       | `row`           |
| `@footer>row>column`           | `div`       | `column`        |
| `@footer>row>column>header`    | `h2`        | `header`        |
| `@footer>row>column>desc`      | `p`         | `desc`          |
| `@footer>row>column>list`      | `ul`        | `unstyled-list` |
| `@footer>row>column>list>item` | `li`        | `item`          |
| `@footer>copyright`            | `div`       | `row bottom`    |

## Tokens

Declared once on `:root, [data-theme]` in `Footer.css`, each deriving from an app token with a
literal fallback. Redeclare a `--footer-*` token on an ancestor to retheme this component alone.

| Token                    | Derives from                     | Used for                       |
| ------------------------ | -------------------------------- | ------------------------------ |
| `--footer-gap`           | `--app-gap`                      | Row and column gaps            |
| `--footer-margin-top`    | `--app-margin-layout`            | Space above the footer         |
| `--footer-background`    | `--app-surface-background-color` | Footer surface                 |
| `--footer-text-color`    | `--app-text-color`               | Base text colour               |
| `--footer-border-color`  | `--app-border-color`             | Frame and copyright hairline   |
| `--footer-radius`        | `--app-component-border-radius`  | Frame corner radius            |
| `--footer-heading-color` | `--app-text-heading-color`       | Column headers                 |
| `--footer-muted-color`   | `--app-text-accent-color`        | Descriptions, links, copyright |
| `--footer-accent-color`  | `--app-primary-color`            | Link hover / focus             |

## Wiring checklist

1. Add `"footer"` to `iBuilderRegistry` in `packages/core/src/types/registry.ts`.
2. Add a loader for `@aio-ui/footer/Footer` to the host's asset map.
3. Add a `stylesheet` loader for `@aio-ui/footer/Footer.css`.
4. List it in the host's route plan: `registerModule(components, [{ route, components: ["footer"] }])`.
