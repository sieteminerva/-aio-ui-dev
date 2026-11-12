# Article (`@aio-ui/article`)

Article is a composition, not a widget: list, detail, aside, controls and pagination are all
rendered from one record array, and the order they appear in is the order they render.

Choosing a record is an **intent**, never a URL write — `navigate(slug)` is called and the host
decides what a slug means. That is what lets a deep link, a modal preview and an iframe share one
component.

## Payload

```ts
{
  data: [
    { slug: "article-1", title: "…", thumbnail: "img.png", date: "2026-11-12", body: "…" },
  ];
}
```

The server envelope (`{ data: [...] }`) is the accepted shape. Records stay in memory; the DOM only
carries `data-article-id` (a cloned node would otherwise lose a `_payload` field), so a click is
resolved against the stored array.

## Config

| Option          | Default                 | Meaning                                              |
| --------------- | ----------------------- | ---------------------------------------------------- |
| `views`         | list + controls + aside | Which parts render, and in what order                |
| `navigate`      | none                    | Called with a slug when a record is chosen           |
| `initialSlug`   | none                    | Record to open on first paint (a deep link, not state) |
| `initialView`   | `"list"`                | Force the first paint to `list` or `detail`           |
| `view`          | `"list"`                | List presentation (`list` or `card`)                 |
| `position`      | `"right"`               | Which side the aside sits on                         |
| `recommendation`| `false`                 | Number of recommended records (or `false`)           |
| `items`         | payload length          | Records per list page                                |
| `selectors`     | see defaults            | Per-key tag/class override                           |

A deep link whose slug is missing from the payload falls back to the list instead of rendering an
empty detail view, and opening it **does not** call `navigate` again (the host already rendered that
URL).

## Nodes

| Key                                | Default tag | Class                    |
| ---------------------------------- | ----------- | ------------------------ |
| `@container`                       | `section`   | `article`                |
| `@article>list`                    | `div`       | `row`                    |
| `@article>pagination`              | `div`       | `pagination`             |
| `@article>figure`                  | `figure`    | `media`                  |
| `@article>header>title`            | `h3`        | `title`                  |
| `@article>header>meta`             | `div`       | `meta`                   |
| `@article>item`                    | `article`   | `item`                   |
| `@article>item>caption`            | `p`         | `caption`                |
| `@article>aside`                   | `aside`     | `aside`                  |
| `@article>aside>title`             | `button`    | `title`                  |
| `@article>aside>item`              | `a`         | `item`                   |
| `@article>controls>back`           | `button`    | `back`                   |
| `@article>controls>next`           | `button`    | `next`                   |
| `@article>controls>pagination>item`| `button`    | `item`                   |
| `@article>controls>filter`         | `h2`        | `filter`                 |
| `@article>controls>view`           | `button`    | `view`                   |
| `@article>detail`                  | `article`   | `detail`                 |
| `@article>detail>header`           | `header`    | `header`                 |
| `@article>detail>body`             | `div`       | `body`                   |

## Tokens

`--article-*` (25 tokens) are declared once on `section:is(.article)`: a self-contained palette
built with `color-mix()` from `--article-primary-color` / `--article-accent-color`. The sheet reads
**no** `--app-*` token, so it does not follow the theme — that is pre-existing and deliberate here,
but it also means it is the exception to the `:root, [data-theme]` layer convention. Override any
`--article-*` on an ancestor to theme it.

## Wiring checklist

1. Add `"article"` to `iBuilderRegistry` in `packages/core/src/types/registry.ts`.
2. Add a loader for `@aio-ui/article` to the host's asset map.
3. Add a `stylesheet` loader for `@aio-ui/article/Article.css`.
4. List it in the host's route plan: `registerModule(components, [{ route, components: ["article"] }])`.
