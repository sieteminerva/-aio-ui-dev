# Carousel (`@aio-ui/carousel`)

Carousel turns an array of slides into a track plus controls and navigation dots, with four
transitions (`fade`, `slide-left`, `slide-right`, `slide-up`, `slide-down`) and optional autoplay.

It owns a timer, so `unmount()` matters: it clears the interval and the button/dot handlers, and
`prepare()` calls it first so re-rendering the same instance never doubles a timer.

## Payload

```ts
[
  { image: "a.png", title: "First", desc: "…" },
  { image: "b.png", title: "Second", desc: "…" },
];
```

An array of slides. The same object may carry `attrs` / `config` to override instance options from
data (see `AttrsConfigMap`), which is how spreadsheet-driven content can set a carousel up without a
code change.

## Config

| Option          | Default   | Meaning                                                |
| --------------- | --------- | ------------------------------------------------------ |
| `container`     | `""`      | Selector, element or nothing — where the tree is mounted |
| `showControl`   | `"auto"`  | Prev/next buttons (`true`, `false` or automatic)        |
| `showNavigation`| `true`    | Dot navigation                                          |
| `autoPlay`      | `4000`    | Interval in ms, `true` for the default, `false` off      |
| `loop`          | `true`    | Wrap around at the ends                                 |
| `vertical`      | `false`   | Vertical track (fade becomes `slide-up`)                |
| `slidesPerView` | `1`       | Visible slides; >1 turns fade into `slide-left`         |
| `animation`     | `"fade"`  | `fade` or `slide-*`                                     |
| `pauseOnHover`  | `true`    | Pause autoplay while hovered                            |
| `slideWidth`    | `""`      | Inline width for a slide                                |
| `slideHeight`   | `""`      | Inline height for a slide                               |
| `selectors`     | see defaults | Per-key tag/class override                           |

With `loop: false` a navigation past an edge clamps and **stops autoplay**, so the timer cannot keep
firing at a dead end.

## Nodes

| Key                          | Default tag | Class                      |
| ---------------------------- | ----------- | -------------------------- |
| `@container`                 | `div`       | `carousel-widget-wrapper`  |
| `@carousel`                  | `div`       | `carousel`                 |
| `@carousel>control`          | `div`       | `control-group`            |
| `@carousel>control>prev`     | `button`    | `control prev`             |
| `@carousel>control>next`     | `button`    | `control next`             |
| `@carousel>navigations`      | `div`       | `navigations`              |
| `@carousel>navigations>dot`  | `button`    | `dot`                      |
| `@carousel>track`            | `div`       | `track`                    |
| `@carousel>track>slide`      | `div`       | `slide`                    |
| `@carousel>track>slide>inner`| `div`       | `slide-inner`              |
| `@carousel>track>slide>caption`| `div`     | `caption`                  |
| `@carousel>track>slide>title`| `h3`        | `title`                    |
| `@carousel>track>slide>desc` | `p`         | `desc`                     |
| `@carousel>track>slide>image`| `img`       | `img-fluid`                |

## Tokens

No `--carousel-*` layer: the sheet hardcodes its geometry. It reads one undeclared name,
`--radius-image`, which no package ships — so a real app must bridge it or the slide keeps square
corners. Recorded as a known gap, not restyled here.

## Wiring checklist

1. Add `"carousel"` to `iBuilderRegistry` in `packages/core/src/types/registry.ts`.
2. Add a loader for `@aio-ui/carousel` to the host's asset map.
3. Add a `stylesheet` loader for `@aio-ui/carousel/Carousel.css`.
4. List it in the host's route plan: `registerModule(components, [{ route, components: ["carousel"] }])`.
