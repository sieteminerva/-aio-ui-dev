# Markdown (`@aio-ui/markdown`)

A Markdown document rendered as DOM. The parser is `@aio-ui/utilities/Markdown` (own subset,
no dependency); this package walks its AST and renders component keys. Source text is written
with `textContent` and text nodes, so a document containing `<script>` prints it instead of
running it.

Fenced code is **not** restyled here: it renders the `code-block` markup
(`figure > figcaption + pre > code`) and `Markdown.css` imports `CodeBlock.css`.

## Payload

```ts
{
  source: "# Title\n\nSome **text**.";
}
```

A bare string is accepted as the source. Anything else renders nothing — guessing at a
document shape would print the wrong thing with confidence.

## Supported syntax

| Block       | Written as                                              | Rendered as                          |
| ----------- | ------------------------------------------------------- | ------------------------------------ |
| heading     | `#` … `######`                                          | `h1`–`h4` (levels > 4 clamp to `h4`) |
| paragraph   | consecutive lines                                       | one `p`, lines joined with a space   |
| fenced code | ` ```lang `                                             | `figure > figcaption + pre > code`   |
| list        | `-`/`*`/`+` or `1.`                                     | `ul`/`ol` + `li`                     |
| table       | GFM pipe table                                          | `table > tr > th/td`                 |
| blockquote  | `> `                                                    | `blockquote` + paragraphs            |
| rule        | `---` / `***` / `___`                                   | `hr`                                 |
| inline      | `` `code` ``, `**bold**`, `*em*`/`_em_`, `[text](href)` | `code`, `strong`, `em`, `a`          |

A ` ```mermaid ` fence is an ordinary fenced block; highlighting is a renderer's job.

## Config

| Option      | Default      | Meaning                     |
| ----------- | ------------ | --------------------------- |
| `selectors` | see defaults | Per-key tag/class override  |
| `themeId`   | `"default"`  | Passed through to the theme |
| `namespace` | `null`       | Prefix for generated ids    |

## Nodes

| Key                             | Default tag  | Class / note                      |
| ------------------------------- | ------------ | --------------------------------- |
| `@markdown`                     | `article`    | `markdown` — the document root    |
| `@markdown>heading-1` … `-4`    | `h1` … `h4`  | `markdown-h1` … `markdown-h4`     |
| `@markdown>paragraph`           | `p`          | `markdown-p`                      |
| `@markdown>fence`               | `figure`     | `code-block-figure`               |
| `@markdown>fence>label`         | `figcaption` | `code-block-label` (language)     |
| `@markdown>fence>code`          | `pre`        | `code-block`                      |
| `@markdown>fence>code>source`   | `code`       | `code-block-source`               |
| `@markdown>unordered` / `>item` | `ul` / `li`  | `markdown-list` / `markdown-item` |
| `@markdown>ordered` / `>item`   | `ol` / `li`  | `markdown-list` / `markdown-item` |
| `@markdown>table`               | `table`      | `markdown-table`                  |
| `@markdown>table>row`           | `tr`         | `markdown-row`                    |
| `@markdown>table>row>head`      | `th`         | `markdown-head-cell`              |
| `@markdown>table>row>cell`      | `td`         | `markdown-cell`                   |
| `@markdown>quote`               | `blockquote` | `markdown-quote`                  |
| `@markdown>quote>paragraph`     | `p`          | `markdown-p`                      |
| `@markdown>rule`                | `hr`         | `markdown-rule`                   |
| `@markdown>strong`              | `strong`     | `markdown-strong`                 |
| `@markdown>emphasis`            | `em`         | `markdown-em`                     |
| `@markdown>inline-code`         | `code`       | `markdown-code`                   |
| `@markdown>link`                | `a`          | `markdown-link`                   |

An `href` outside `https?:`, `mailto:`, `#`, `/` or `.` becomes `#` — a document may not turn a
link into a script URL.

## Tokens

Declared once on `:root, [data-theme]` in `Markdown.css`. The sheet also imports
`CodeBlock.css`, whose `--code-block-*` tokens own every code panel in the document.

| Token                         | Derives from               | Used for                |
| ----------------------------- | -------------------------- | ----------------------- |
| `--markdown-gap`              | literal `0.85rem`          | Distance between blocks |
| `--markdown-text-color`       | `--app-text-color`         | Body text               |
| `--markdown-heading-color`    | `--app-text-heading-color` | Headings, table headers |
| `--markdown-muted-color`      | `--app-text-accent-color`  | Quote text              |
| `--markdown-border-color`     | `--app-border-color`       | Table hairlines         |
| `--markdown-rule-color`       | `--app-border-color`       | `hr`                    |
| `--markdown-accent-color`     | `--app-primary-color`      | Links, quote bar        |
| `--markdown-inline-surface`   | `--app-surface-muted`      | Inline code background  |
| `--markdown-font-size`        | literal `0.9rem`           | Body size               |
| `--markdown-line-height`      | literal `1.65`             | Body line spacing       |
| `--markdown-inline-font-size` | literal `0.85em`           | Inline code size        |
| `--markdown-inline-radius`    | literal `4px`              | Inline code radius      |

## Wiring checklist

1. Add `"markdown"` to `iBuilderRegistry` in `packages/core/src/types/registry.ts`.
2. Add a loader for `@aio-ui/markdown` to the host's asset map.
3. Add a `stylesheet` loader for `@aio-ui/markdown/Markdown.css`.
4. List it in the host's route plan: `registerModule(components, [{ route, components: ["markdown"] }])`.
