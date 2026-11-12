# Code Block (`@aio-ui/code-block`)

One or more dark "paper" panels holding source text: an optional caption, then `pre > code`.
The source is written with `textContent`, so a snippet that contains markup is printed and never
parsed.

## Payload

```ts
{ code: "const app = new AioApp({ container: \"#app\" });", label: "ts · mount", language: "ts" }
```

Accepted shapes:

| Shape                         | Result                              |
| ----------------------------- | ----------------------------------- |
| `{ code, label?, language? }` | one block                           |
| `{ blocks: [ … ] }`           | several labelled blocks in one call |
| `[…]`                         | bare array of the records above     |
| `"…"`                         | source only, no caption             |
| `{ content: … }`              | the registry's default unwrapping   |
| `{}` / `null` / `undefined`   | nothing renders                     |

`normalizePayload()` is the only place that decides this, and it is exported so the contract is
testable without a DOM. `language` is written to `data-language` on the `pre`; this sheet does
not highlight anything, it only reserves the hook a highlighter would use.

## Config

| Option      | Default      | Meaning                     |
| ----------- | ------------ | --------------------------- |
| `selectors` | see defaults | Per-key tag/class override  |
| `themeId`   | `"default"`  | Passed through to the theme |
| `namespace` | `null`       | Prefix for generated ids    |

## Nodes

| Key                              | Default tag  | Class / note             |
| -------------------------------- | ------------ | ------------------------ |
| `@container`                     | `section`    | `code-block` — holds all |
| `@container>figure`              | `figure`     | `frame` — one block      |
| `@container>figure>label`        | `figcaption` | `label`, only if set     |
| `@container>figure>block`        | `pre`        | `paper` — the panel      |
| `@container>figure>block>source` | `code`       | `body` — the text        |

## Tokens

Declared once on `:root, [data-theme]` in `CodeBlock.css`. The two base colours are **literal on
purpose**: a code block is dark paper in light and dark mode alike, so deriving them from
`--app-surface-*` would turn it into a second card that inverts with the theme. Only the radius
joins the app contract.

| Token                               | Derives from                      | Used for                |
| ----------------------------------- | --------------------------------- | ----------------------- |
| `--code-block-background`           | literal `#14100c`                 | Panel surface           |
| `--code-block-text-color`           | literal `#e9e2d8`                 | Source text             |
| `--code-block-label-color`          | literal `rgba(233,226,216,.62)`   | Caption text            |
| `--code-block-radius`               | `--app-component-border-radius`   | Panel corner radius     |
| `--code-block-padding`              | literal `0.9rem 1rem`             | Panel inner spacing     |
| `--code-block-font-family`          | literal `ui-monospace, monospace` | Source and caption type |
| `--code-block-font-size`            | literal `0.72rem`                 | Source text size        |
| `--code-block-line-height`          | literal `1.5`                     | Source line spacing     |
| `--code-block-label-font-size`      | literal `0.68rem`                 | Caption size            |
| `--code-block-label-letter-spacing` | literal `0.08em`                  | Caption tracking        |
| `--code-block-gap`                  | literal `0.5rem`                  | Distance between blocks |
| `--code-block-label-gap`            | literal `0.35rem`                 | Caption to panel        |

## Wiring checklist

1. Add `"code-block"` to `iBuilderRegistry` in `packages/core/src/types/registry.ts`.
2. Add a loader for `@aio-ui/code-block` to the host's asset map.
3. Add a `stylesheet` loader for `@aio-ui/code-block/CodeBlock.css`.
4. List it in the host's route plan: `registerModule(components, [{ route, components: ["code-block"] }])`.
