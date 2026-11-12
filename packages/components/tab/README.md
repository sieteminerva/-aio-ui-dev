# Tab (`@aio-ui/tab`)

A tab strip plus panels, with the strip placeable on any side of the body and panels built lazily.
Each payload entry becomes one button and one panel; the panel body reads `eyebrow`, `title` and
`description` from that same entry.

## Payload

```ts
[
  {
    label: "…", // button caption (also the button title)
    eyebrow: "…", // optional kicker inside the panel
    title: "…",
    description: "…",
    id: "…", // optional panel id
    className: "…", // optional extra panel class
  },
];
```

## Config

| Option            | Default  | Meaning                                                         |
| ----------------- | -------- | --------------------------------------------------------------- |
| `menuPosition`    | `"top"`  | `top \| bottom \| left \| right` — which side the strip sits on |
| `lazyload`        | `false`  | Build a panel only when it is first activated                   |
| `destroyPrevious` | `false`  | Empty the previous panel on switch, forcing a fresh build       |
| `container`       | `null`   | External element to host the tab instead of a built root        |
| `name`            | `""`     | Namespace for the generated button/panel ids                    |
| `minHeight`       | —        | Minimum body height, in any CSS length                          |
| `selectors`       | defaults | Per-key tag/class override                                      |

## Nodes

| Key                          | Default tag | Class / note         |
| ---------------------------- | ----------- | -------------------- |
| `@container`                 | `div`       | `tab-widget-wrapper` |
| `@tab`                       | `div`       | `tab`                |
| `@tab>menu`                  | `div`       | `menu`               |
| `@tab>menu>item`             | `button`    | `button`             |
| `@tab>menu>item>label`       | `span`      | `btn-label`          |
| `@tab>menu>item>title`       | `span`      | `btn-title`          |
| `@tab>body`                  | `div`       | `body`               |
| `@tab>panel`                 | `div`       | `panel hidden`       |
| `@tab>panel>content`         | `div`       | `content`            |
| `@tab>panel>content>eyebrow` | `span`      | `eyebrow`            |
| `@tab>panel>content>title`   | `h3`        | `title`              |
| `@tab>panel>content>desc`    | `p`         | `desc`               |
| `@tab>footer`                | `div`       | `footer`             |
| `@tab>spinner`               | `div`       | `spinner hidden`     |

## Tokens

Declared once on `:root, [data-theme]` in `Tab.css`, each deriving from an app token with a literal
fallback, so a theme retunes the app token and the sheet follows. Redeclare any token below on an
ancestor to retheme the tab alone.

| Token                     | Derives from                | Used for                                                   |
| ------------------------- | --------------------------- | ---------------------------------------------------------- |
| `--tab-accent-strong`     | `--app-accent-strong`       | Strip hairline, resting button text, gradient end, eyebrow |
| `--tab-accent-color`      | `--app-accent-color`        | Active gradient start                                      |
| `--tab-label-color`       | `--app-text-accent-color`   | `.btn-label`, footer text                                  |
| `--tab-text-color`        | `--app-text-color`          | Panel description                                          |
| `--tab-title-color`       | `--app-text-heading-color`  | Panel title                                                |
| `--tab-active-foreground` | `--app-text-on-accent`      | Text on the active button                                  |
| `--tab-spinner`           | `--app-spinner-content`     | Loading spinner artwork                                    |
| `--tab-hover-wash`        | literal (component-private) | Button hover wash                                          |
| `--tab-active-shadow`     | literal (component-private) | Active button shadow                                       |
| `--tab-divider-color`     | literal (component-private) | Footer hairline                                            |

`--tab-active-foreground` is the WCAG-picked foreground for a brand fill; do not point it at a
background token, or the active label loses its contrast.

## Wiring checklist

1. Add `"tab"` to `iBuilderRegistry` in `packages/core/src/types/registry.ts`.
2. Add a loader for `@aio-ui/tab/Tab` to the host's asset map.
3. Add a `stylesheet` loader for `@aio-ui/tab/Tab.css`.
4. List it in the host's route plan: `registerModule(components, [{ route, components: ["tab"] }])`.
