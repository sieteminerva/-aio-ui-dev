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

| Option      | Default | Meaning                                  |
| ----------- | ------- | ---------------------------------------- |
| `emphasis`  | `false` | Adds `is-emphasis` to the container      |
| `selectors` | see `DEFAULT_SELECTORS` | Per-key tag/class override |

## Nodes

| Key                       | Default tag | Class               |
| ------------------------- | ----------- | ------------------- |
| `@container`              | `div`       | `__KEBAB__-widget`  |
| `@__CAMEL__`              | `div`       | `__KEBAB__`         |
| `@__CAMEL__>item`         | `div`       | `__KEBAB__-item`    |
| `@__CAMEL__>item>label`   | `span`      | `__KEBAB__-label`   |
| `@__CAMEL__>item>desc`    | `p`         | `__KEBAB__-desc`    |

## Wiring checklist

1. Add `"__KEBAB__"` to `iBuilderRegistry` in `packages/core/src/types/registry.ts`.
2. Add a loader for `@aio-ui/__KEBAB__/__PASCAL__` to the host's asset map.
3. Add a `stylesheet` loader for `@aio-ui/__KEBAB__/__PASCAL__.css` if you ship CSS.
4. Declare it on a node: `builder: ["__KEBAB__"]`.
