# Masonry (`@aio-ui/masonry`)

A cascading gallery: one grid whose column count comes from CSS, a category filter with a sliding
highlight, lazy images, batched paging and a keyboard-driven lightbox. `Masonry.css` ships with the
package and the registry injects it, so the markup below is the whole contract.

## Payload

```ts
{
  id: "marketing-gallery",
  className: "section masonry gallery",
  content: [
    { image: "https://…", category: "Branding", title: "Project A", description: "Design work" },
    { image: "https://…", category: "Web", title: "Project B" },
  ],
}
```

A bare array is wrapped into `{ content: […] }` automatically. The array itself is read from
`content`, **not** from `items` — older drafts of this document showed `{ items: […] }`, which renders
an empty grid. Each entry becomes one card; `category` feeds the filter bar, and the filter list is
derived from the data, never declared. Items may also be pre-built `HTMLElement`s.

## Config

| Option            | Default      | Meaning                                                                     |
| ----------------- | ------------ | --------------------------------------------------------------------------- |
| `column`          | `3`          | Column count written to `--masonry-columns`; the media queries clamp it     |
| `lazyload`        | `true`       | Sets `loading="lazy"` on the card images                                    |
| `maxDisplayed`    | `5`          | Items per batch; the first batch renders immediately                        |
| `useLoadButton`   | `true`       | `true` renders the "more" button, `false` uses a scroll sentinel            |
| `category`        | `null`       | Initial filter value                                                        |
| `defaultCategory` | `null`       | Category highlighted on the first render; an unknown name falls back to all |
| `container`       | `null`       | Element (or selector) used as the root instead of the generated `<section>` |
| `loadFn`          | `null`       | `(page, category) => Promise<items>` for server-side paging                 |
| `onScrollEnd`     | `null`       | Fired when the document is scrolled to the bottom                           |
| `onLoadTriggered` | `null`       | Fired with the page number when a batch starts loading                      |
| `selectors`       | see defaults | Per-key tag/class override                                                  |
| `themeId`         | `"default"`  | Passed through to the theme                                                 |
| `namespace`       | `null`       | Prefix for generated ids                                                    |

### Data pipeline

Items are kept in a private field (`#items`) and the public `items` setter is the only way in: it
validates that the value is an array, trims the entries and freezes them, so a host script cannot
mutate rendered state behind the builder's back.

```ts
const builder = new MasonryBuilder(config);
builder.prepare(contentData);
// Anti-pattern: this mutates the array you were given, not the builder's copy
builder.items.push({ image: "corrupted-payload.png" });
// The supported way: assign a fresh payload, it is cleaned and frozen on the way in
builder.items = freshlyFetchedPayloadFromAPI;
```

## Nodes

| Key                       | Default tag | Class / note                           |
| ------------------------- | ----------- | -------------------------------------- |
| `@container`              | `section`   | `masonry gallery` — the root           |
| `@masonry`                | `div`       | `grid` — the column container          |
| `@masonry>filter`         | `div`       | `filter menu`                          |
| `@masonry>filter>item`    | `button`    | `item` — one per derived category      |
| `@masonry>filter>slider`  | `span`      | `slider` — the sliding highlight       |
| `@masonry>item`           | `div`       | `item fade-in` — one card              |
| `@masonry>item>image`     | `img`       | no class; fills the card               |
| `@masonry>item>title`     | `h3`        | `title`                                |
| `@masonry>item>desc`      | `p`         | `desc`                                 |
| `@masonry>item>actions`   | `div`       | `actions`                              |
| `@masonry>spinner`        | `div`       | `spinner hidden`                       |
| `@masonry>trigger`        | `button`    | `more` — the load button               |
| `@masonry>sentinel`       | `div`       | `sentinel` — the observer target       |
| `@masonry>modal`          | `div`       | `modal hidden` — the lightbox          |
| `@masonry>modal>close`    | `i`         | `.close` wrapper, `icon close`         |
| `@masonry>modal>next`     | `i`         | `.next` wrapper, `icon right arrow`    |
| `@masonry>modal>previous` | `i`         | `.previous` wrapper, `icon left arrow` |

## Tokens

Declared once on `:root, [data-theme]` in `Masonry.css`. Each derives from an app token with a
literal fallback, so a theme retunes the app token and this sheet follows; redeclare a
`--masonry-*` token on an ancestor to retheme the grid alone.

### Stylesheet reference

The builder only emits layout nodes and toggles state flags (`active`, `hidden`, `fade-in`), so the
box model, the column rules and the lightbox positioning all come from the sheet. The block below is
the class structure it targets; `--init-columns` in it is an older draft — the builder writes
`--masonry-columns`.

```css
/* /_ Core Structural Layout Rules _/ */
.masonry {
  & .grid {
    column-count: var(--init-columns, 3);
    column-gap: 1.5rem;
    padding: 1rem 0;
  }

  & .item {
    break-inside: avoid;
    margin-bottom: 1.5rem;
    display: flex;
    flex-direction: column;
    background: rgba(255, 255, 255, 0.03);
    padding: 1rem;
    box-sizing: border-box;
    transform: translate3d(0, 0, 0); /* /_ Hardware GPU Acceleration _/ */
    backface-visibility: hidden;
    transition: transform 0.3s ease;

    &:hover {
      transform: scale(1.02);
    }

    & img {
      width: 100%;
      display: block;
      cursor: pointer;
    }

    &.fade-in {
      opacity: 0;
      transform: translateY(20px);
      animation: masonryFadeIn 0.4s ease forwards;
    }
  }

  /* /_ Dynamic Sliding Category Menu Layout Rules _/ */
  & .filter.menu {
    position: relative;
    display: flex;
    gap: 0.75rem;
    margin: 1.5rem auto;
    flex-wrap: wrap;
    width: max-content;
    padding: 5px;
    border: 2px solid #5b3f86;
    border-radius: 12px;
    z-index: 1;
    & .slider {
      position: absolute;
      top: 0;
      left: 0;
      background: #5b3f86;
      border-radius: 6px;
      z-index: -1;
      pointer-events: none;
      transition: transform 0.35s cubic-bezier(0.25, 1, 0.5, 1),
                  width 0.35s cubic-bezier(0.25, 1, 0.5, 1),
                  height 0.35s cubic-bezier(0.25, 1, 0.5, 1);
    }

    & .item {
      padding: 0.5rem 1.25rem;
      background: none;
      border: none;
      color: #fff;
      cursor: pointer;
      z-index: 2;
      transition: color 0.3s ease;

      &.active {
        color: #fff;
        font-weight: 600;
        background: none; /* Handled dynamically by .slider container shifts */
      }
    }

  }

  /* /_ Utility Loaders & Scroll Indicators _/ */
  & .spinner {
    display: block;
    margin: 1.5rem auto;
    width: 40px;
    height: 40px;
    background-image: var(--app-spinner-content); /_ Injected from global application root variables _/
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
    transition: opacity 0.2s ease, visibility 0.2s ease;

    &.hidden {
      opacity: 0;
      visibility: hidden;
      height: 0;
      margin: 0 auto;
    }

  }

  & .sentinel {
    width: 100%;
    pointer-events: none;
  }
}
  /* /_ Lightbox Modal Structure Rules _/ */
.gallery .modal {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(10, 10, 20, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  opacity: 1;
  visibility: visible;
  transition: opacity 200ms ease, visibility 200ms ease;

  &.hidden {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
  }

  & .img {
    max-width: 90vw;
    max-height: 90vh;
    object-fit: contain;
  }

  & .close,
  & .next,
  & .prev {
    position: absolute;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: none;
    border-radius: 50%;
    width: 3rem; height: 3rem;
    font-size: 1.5rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.3s ease;

    &:hover { background: rgba(255, 255, 255, 0.3); }

  }
  & .close { top: 1.5rem; right: 1.5rem; }
  & .prev { left: 1.5rem; }
  & .next { right: 1.5rem; }
}
@keyframes masonryFadeIn {
  to { opacity: 1; transform: translateY(0); }
}
@media (max-width: 900px) {
  .masonry .grid { column-count: 2; }
}
@media (max-width: 640px) {
  .masonry .grid { column-count: 1; }
}
```

| Token                                         | Derives from                    | Used for                                 |
| --------------------------------------------- | ------------------------------- | ---------------------------------------- |
| `--masonry-card-radius`                       | `--app-image-border-radius`     | Card corner radius                       |
| `--masonry-radius`                            | `--app-component-border-radius` | Filter bar, slider, lightbox image       |
| `--masonry-shadow`                            | `--app-shadow-soft`             | Filter slider shadow                     |
| `--masonry-card-hover-shadow`                 | _(private)_                     | Card lift on hover                       |
| `--masonry-accent`                            | `--app-accent-strong`           | Filter bar hairline, slider, “more” fill |
| `--masonry-accent-text`                       | `--app-text-on-accent`          | “more” label on the accent fill          |
| `--masonry-border-color`                      | `--app-border-color`            | “more” hairline                          |
| `--masonry-text-color`                        | `--app-text-color`              | Filter button label                      |
| `--masonry-text-accent`                       | `--app-text-accent-color`       | Filter button label on hover             |
| `--masonry-filter-active-color`               | `--app-surface-muted`           | Active filter label                      |
| `--masonry-more-hover-color`                  | `--app-accent-color`            | “more” label on hover                    |
| `--masonry-spinner`                           | `--app-spinner-content`         | Loading spinner                          |
| `--masonry-lightbox-backdrop`                 | _(private)_                     | Lightbox backdrop                        |
| `--masonry-lightbox-control-background`       | _(private)_                     | Lightbox prev/next/close fill            |
| `--masonry-lightbox-control-hover-background` | _(private)_                     | Same control, hover                      |
| `--masonry-lightbox-control-color`            | _(private)_                     | Lightbox control glyph                   |

`--masonry-columns` is **not** part of the layer: the builder writes it from `config.column`
(`Masonry.ts`), and the two media queries clamp it. Setting it from CSS works but is overwritten
whenever the builder re-renders. Older drafts of this document called it `--init-columns`.

`--masonry-more-hover-color` used to be `var(--app-accent-accent)`, a token no sheet declares; the
declaration was invalid at computed-value time, so the label simply inherited the body colour.

## Wiring checklist

1. Add `"masonry"` to `iBuilderRegistry` in `packages/core/src/types/registry.ts`.
2. Add a loader for `@aio-ui/masonry/Masonry` to the host's asset map.
3. Add a `stylesheet` loader for `@aio-ui/masonry/Masonry.css`.
4. List it in the host's route plan: `registerModule(components, [{ route, components: ["masonry"] }])`.

### Cleanup

`destroy()` disconnects the `IntersectionObserver`, removes the global keydown listener and drops
the lightbox, so a page that removes the gallery from the DOM has to call it to avoid a leak.
