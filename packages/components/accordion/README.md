# Accordion (`@aio-ui/accordion`)

A stack of native `<details>` disclosures, one per payload entry. Because the disclosure is the
browser's own element, open/close, keyboard support and find-in-page keep working without script.

## Payload

```ts
[{ title: "…", description: "…" }];
```

A single object is accepted too (it is wrapped into a one-entry list). Each entry becomes one
`@accordion>section`; `title` fills the `summary`, `description` fills the `.content`. A record
missing either field is labelled `Untitled Header` / `Untitled Content`; nullish entries are dropped
so they never render an empty row.

## Config

| Option      | Default      | Meaning                     |
| ----------- | ------------ | --------------------------- |
| `selectors` | see defaults | Per-key tag/class override  |
| `themeId`   | `"default"`  | Passed through to the theme |
| `namespace` | `null`       | Prefix for generated ids    |

## Nodes

| Key                          | Default tag | Class / note          |
| ---------------------------- | ----------- | --------------------- |
| `@accordion`                 | `div`       | `accordion`           |
| `@accordion>section`         | `details`   | one per payload entry |
| `@accordion>section>title`   | `summary`   | the clickable row     |
| `@accordion>section>content` | `div`       | `content`             |

## Tokens

Declared once on `:root, [data-theme]` in `Accordion.css`. Each derives from an app token with a
literal fallback, so a theme retunes the app token and this sheet follows; redeclare a
`--accordion-*` token on an ancestor to retheme this component alone.

| Token                      | Derives from                     | Used for                   |
| -------------------------- | -------------------------------- | -------------------------- |
| `--accordion-background`   | `--app-surface-background-color` | Panel surface              |
| `--accordion-border-color` | `--app-border-color`             | Resting hairline           |
| `--accordion-border-focus` | `--app-border-focus`             | Hairline of an open panel  |
| `--accordion-radius`       | `--app-component-border-radius`  | Panel corner radius        |
| `--accordion-shadow`       | `--app-shadow-soft`              | Resting shadow             |
| `--accordion-shadow-open`  | `--app-shadow-elevated`          | Shadow of an open panel    |
| `--accordion-accent-color` | `--app-primary-color`            | Hover hairline, `+` marker |
| `--accordion-label-color`  | `--app-text-heading-color`       | Summary text               |
| `--accordion-text-color`   | `--app-text-accent-color`        | Panel body text            |
| `--accordion-font-size`    | `--app-font-size-base`           | Summary and body size      |

## Wiring checklist

1. Add `"accordion"` to `iBuilderRegistry` in `packages/core/src/types/registry.ts`.
2. Add a loader for `@aio-ui/accordion/Accordion` to the host's asset map.
3. Add a `stylesheet` loader for `@aio-ui/accordion/Accordion.css`.
4. List it in the host's route plan: `registerModule(components, [{ route, components: ["accordion"] }])`.
