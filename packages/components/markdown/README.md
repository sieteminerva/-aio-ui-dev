# Markdown (`@aio-ui/markdown`)

A Markdown document rendered as DOM. The parser is `./Markdown.engine.ts` — this package's own
subset with no dependency, and not a published subpath; the builder walks its AST and renders
component keys. Source text is written with `textContent` and text nodes, so a document
containing `<script>` prints it instead of running it.

Fenced code is **not** restyled here: it renders the `code-block` markup
(`figure > figcaption + pre > code`) and `Markdown.css` imports `CodeBlock.css`.

## Payload

```ts
{
  source: "# Title\n\nSome **text**.",
  outline: { parts: ["@lead", "#config"] },
  marker: { keyword: "part", forms: ["comment"] },
}
```

| Field     | Meaning                                               |
| --------- | ----------------------------------------------------- |
| `source`  | The document. A bare string is accepted as shorthand. |
| `outline` | Per-instance override of `config.outline`.            |
| `marker`  | Per-instance override of `config.marker`.             |

Anything else renders nothing — guessing at a document shape would print the wrong thing with
confidence.

## Config

| Option      | Default                       | Meaning                                                  |
| ----------- | ----------------------------- | -------------------------------------------------------- |
| `selectors` | see defaults                  | Per-key tag/class override                               |
| `marker`    | `null` → `part`, comment form | How the document spells its part markers                 |
| `outline`   | `null`                        | Which parts to render; absent renders the whole document |
| `themeId`   | `"default"`                   | Passed through to the theme                              |
| `namespace` | `null`                        | Prefix for generated ids                                 |

### Outline

An outline renders named parts instead of the whole document, in the order you list them.
The parts are answered from the same parse, so nothing is rebuilt as text and parsed twice.

| Path        | Resolves to                                          |
| ----------- | ---------------------------------------------------- |
| `@title`    | The first H1                                         |
| `@lead`     | Blocks between the H1 and the first section opener   |
| `#anchor`   | The section that declared (or slugged to) that id    |
| `role:name` | Every section declaring that role, in document order |
| `Config`    | An H2 by heading text                                |
| `A > B`     | An H3 under an H2, joined with `>`                   |

```ts
const doc = build("markdown", {
  source: readme,
  outline: { parts: ["@lead", "Supported syntax > Cascade"], section: true },
});
```

| Option    | Default  | Meaning                                                    |
| --------- | -------- | ---------------------------------------------------------- |
| `parts`   | —        | Selections in render order. An unresolved path is skipped. |
| `section` | `false`  | Wrap each part in `@markdown>section`                      |
| `heading` | `"keep"` | `"drop"` renders the body without its heading              |

Trails match on text **and** length: `Config` never resolves to `Config > Notes`.

### Markers

A marker is a line no Markdown renderer shows, read as a pointer and attached to the heading
under it. That keeps a page from hard-coding heading text: rename the heading, keep the anchor.

```md
<!-- part: id=validation role=usage -->

### Validation
```

| Option    | Default       | Meaning                                                  |
| --------- | ------------- | -------------------------------------------------------- |
| `keyword` | `"part"`      | Word that opens a marker                                 |
| `forms`   | `["comment"]` | `comment` (`<!-- part: … -->`) or `link` (`[part:…]: #`) |

`id` overrides the slug the heading text would produce; `role` is a word the parser hands back
and never interprets; any other `key=value` pair is kept. A comment that does not match the
keyword is dropped rather than printed, because it is invisible in every other renderer too.
Only a comment alone on its line counts — a trailing comment stays part of the paragraph, and
anything inside a fence stays source.

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

## Nodes

| Key                             | Default tag  | Class / note                          |
| ------------------------------- | ------------ | ------------------------------------- |
| `@markdown`                     | `article`    | `markdown` — the document root        |
| `@markdown>section`             | `section`    | `markdown-section` — one outline part |
| `@markdown>heading-1` … `-4`    | `h1` … `h4`  | `markdown-h1` … `markdown-h4`         |
| `@markdown>paragraph`           | `p`          | `markdown-p`                          |
| `@markdown>fence`               | `figure`     | `code-block frame`                    |
| `@markdown>fence>label`         | `figcaption` | `label` (language)                    |
| `@markdown>fence>code`          | `pre`        | `paper`                               |
| `@markdown>fence>code>source`   | `code`       | `body`                                |
| `@markdown>unordered` / `>item` | `ul` / `li`  | `markdown-list` / `markdown-item`     |
| `@markdown>ordered` / `>item`   | `ol` / `li`  | `markdown-list` / `markdown-item`     |
| `@markdown>table`               | `table`      | `markdown-table`                      |
| `@markdown>table>row`           | `tr`         | `markdown-row`                        |
| `@markdown>table>row>head`      | `th`         | `markdown-head`                       |
| `@markdown>table>row>cell`      | `td`         | `markdown-cell`                       |
| `@markdown>quote`               | `blockquote` | `markdown-quote`                      |
| `@markdown>quote>paragraph`     | `p`          | `markdown-p`                          |
| `@markdown>rule`                | `hr`         | `markdown-rule`                       |
| `@markdown>strong`              | `strong`     | `markdown-strong`                     |
| `@markdown>emphasis`            | `em`         | `markdown-em`                         |
| `@markdown>inline-code`         | `code`       | `markdown-code`                       |
| `@markdown>link`                | `a`          | `markdown-link`                       |

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
