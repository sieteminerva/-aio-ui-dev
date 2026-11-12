# __TITLE__ (`@aio-ui/__KEBAB__`)

<!-- Replace this paragraph with what the component is for, in two sentences. -->
__TITLE__ renders a list of records.

## Payload

```ts
{
  content: [
    { label: "…", description: "…" },
  ];
}
```

Accepted shapes: `[...]`, `{ items: [...] }`, `{ content: [...] }`, a single record, or
nothing. `normalizePayload()` is the only place that decides this.

## Config

| Option      | Default                 | Meaning                     |
| ----------- | ----------------------- | --------------------------- |
| `selectors` | see `DEFAULT_SELECTORS` | Per-key tag/class override  |
| `themeId`   | `"default"`             | Passed through to the theme |
| `namespace` | `null`                  | Prefix for generated ids    |

## Nodes

| Key                       | Default tag | Class               |
| ------------------------- | ----------- | ------------------- |
| `@container`              | `div`       | `__KEBAB__-widget`  |
| `@__CAMEL__`              | `div`       | `__KEBAB__`         |
| `@__CAMEL__>item`         | `div`       | `__KEBAB__-item`    |
| `@__CAMEL__>item>label`   | `span`      | `__KEBAB__-label`   |
| `@__CAMEL__>item>desc`    | `p`         | `__KEBAB__-desc`    |

## Tokens

Declared once on `:root, [data-theme]` in `__PASCAL__.css`. Each derives from an app token with a
literal fallback, so a theme retunes the app token and this sheet follows; redeclare a
`--__KEBAB__-*` token on an ancestor to retheme this component alone.

| Token                    | Derives from                    | Used for     |
| ------------------------ | ------------------------------- | ------------ |
| `--__KEBAB__-gap`        | `--app-gap`                     | Item spacing |
| `--__KEBAB__-radius`     | `--app-component-border-radius` | Item corner  |
| `--__KEBAB__-text-color` | `--app-text-accent-color`       | Body text    |

## Wiring checklist

1. Add `"__KEBAB__"` to `iBuilderRegistry` in `packages/core/src/types/registry.ts`.
2. Add a loader for `@aio-ui/__KEBAB__/__PASCAL__` to the host's asset map.
3. Add a `stylesheet` loader for `@aio-ui/__KEBAB__/__PASCAL__.css` if you ship CSS.
4. List it in the host's route plan: `registerModule(components, [{ route, components: ["__KEBAB__"] }])`.
