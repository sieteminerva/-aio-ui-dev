# Badge (`@aio-ui/badge`)

<!-- Replace this paragraph with what the component is for, in two sentences. -->

Badge renders a list of records.

## Payload

```ts
{
  content: [{ label: "…", description: "…" }];
}
```

Accepted shapes: `[...]`, `{ items: [...] }`, `{ content: [...] }`, a single record, or
nothing. `normalizePayload()` is the only place that decides this.

## Config

| Option      | Default                 | Meaning                             |
| ----------- | ----------------------- | ----------------------------------- |
| `emphasis`  | `false`                 | Adds `is-emphasis` to the container |
| `selectors` | see `DEFAULT_SELECTORS` | Per-key tag/class override          |

## Nodes

| Key                 | Default tag | Class          |
| ------------------- | ----------- | -------------- |
| `@container`        | `div`       | `badge-widget` |
| `@badge`            | `div`       | `badge`        |
| `@badge>item`       | `div`       | `badge-item`   |
| `@badge>item>label` | `span`      | `badge-label`  |
| `@badge>item>desc`  | `p`         | `badge-desc`   |

## Wiring checklist

1. Add `"badge"` to `iBuilderRegistry` in `packages/core/src/types/registry.ts`.
2. Add a loader for `@aio-ui/badge/Badge` to the host's asset map.
3. Add a `stylesheet` loader for `@aio-ui/badge/Badge.css` if you ship CSS.
4. List it in the host's route plan: `registerModule(components, [{ route, components: ["badge"] }])`.
