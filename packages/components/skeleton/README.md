# Skeleton (`@aio-ui/skeleton`)

The placeholder primitive. Every builder may implement the optional `loading()` hook, which
returns the silhouette of its own component while that component's stylesheet is still on its way;
this package is what that hook draws with.

**Load it with the app shell, never lazily.** It is the only sheet that can style a component at the
exact moment that component's own sheet is missing — that is the whole reason it is a component of
its own instead of a rule in `@aio-ui/styles`.

```ts
import { Skeleton } from "@aio-ui/skeleton";

protected loading(): HTMLElement {
  return Skeleton.create({
    shape: "stack",
    children: [
      { shape: "bone", aspect: "1 / 1" },
      { shape: "line", width: "62%" },
      { shape: "line", width: "88%", count: 2 },
    ],
  });
}
```

## Payload

The registry face (`SkeletonBuilder`) takes one spec, merged over `config.spec`:

```ts
{ shape: "line", width: "60%" } // anything an iSkeletonSpec allows
```

## Config

| Option      | Default     | Meaning                                                              |
| ----------- | ----------- | -------------------------------------------------------------------- |
| `spec`      | `{}`        | The silhouette to draw                                               |
| `duration`  | `2000`      | Default lifetime — milliseconds, or `"auto"` (until the sheet lands) |
| `className` | `""`        | Extra class(es) for the mockup root (the host's own skin)            |
| `selectors` | `{}`        | Unused — this builder has no selector keys                           |
| `themeId`   | `"default"` | Standard builder config                                              |

`iSkeletonSpec`:

| Field       | Type                                               | Meaning                                              |
| ----------- | -------------------------------------------------- | ---------------------------------------------------- |
| `shape`     | `"stack" \| "row" \| "line" \| "bone" \| "circle"` | Layout (`stack`/`row`) or leaf skin. Default `bone`. |
| `width`     | CSS length                                         | Geometry the real node would have had.               |
| `height`    | CSS length                                         | A bone without it keeps the sheet's `min-height`.    |
| `aspect`    | CSS `aspect-ratio`                                 | For media boxes that reserve their own space.        |
| `gap`       | CSS length                                         | Only for `stack` / `row`.                            |
| `count`     | number                                             | Repeats the node (text lines, placeholder rows).     |
| `children`  | `iSkeletonSpec[]`                                  | Laid out by the parent's `stack` / `row`.            |
| `duration`  | `number \| "auto"`                                 | How long the mockup stays on screen. Default `2000`. |
| `className` | string                                             | Host class(es) on the mockup root only.              |

### `duration` — lifetime, not pulse

| Value    | Effect                                                                                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"auto"` | Released the moment the component's own sheet settles — the honest, measured load time.                                                                             |
| `number` | A **floor**: the mockup stays visible at least this many milliseconds, so a fast sheet cannot flash it. It never releases early — a slow sheet is still waited for. |

The builder's default is `2000`, not `"auto"`: on a warm cache the sheet settles in a single
microtask, so an `"auto"` placeholder is never painted and the component appears to have no
loading state at all. `"auto"` stays available for a host that measures the sheet itself.

`Skeleton.create` writes the number as `data-skeleton-duration`; the hold in
`@aio-ui/base/BaseAdapters/Hydration` is the only reader, and it joins that floor with the
stylesheet promise (`Promise.all`). A skeleton never hides anything itself, and a warm sheet never
builds one. The pulse _speed_ is a different knob: `--skeleton-pulse` in this package's layer.

## Nodes

`Skeleton.create()` builds plain `div`s — it never calls `render()`, because a mockup is a picture
and tracking its nodes would be waste:

| `shape`  | Class             | Marker                   |
| -------- | ----------------- | ------------------------ |
| `stack`  | `skeleton stack`  | `data-skeleton="stack"`  |
| `row`    | `skeleton row`    | `data-skeleton="row"`    |
| `bone`   | `skeleton bone`   | `data-skeleton="bone"`   |
| `line`   | `skeleton line`   | `data-skeleton="line"`   |
| `circle` | `skeleton circle` | `data-skeleton="circle"` |

Every node carries the root class plus one bare shape word, so the sheet writes a
compound (`&.bone`) and needs no dash-joined class name.

## Tokens

| Token               | Reads                           | Use                                        |
| ------------------- | ------------------------------- | ------------------------------------------ |
| `--skeleton-fill`   | `--app-skeleton-bg`             | Bone colour (layer, `:root, [data-theme]`) |
| `--skeleton-gap`    | `--app-margin-component`        | Default gap for `stack` / `row`            |
| `--skeleton-radius` | `--app-component-border-radius` | Bone corner                                |
| `--skeleton-pulse`  | literal `1.4s`                  | Pulse cycle (speed, not lifetime)          |

A component that needs a different bone tone overrides `--skeleton-fill` in its own layer; it never
writes a rule for `[data-skeleton]`.

## Wiring checklist

1. Add `"skeleton"` to `iBuilderRegistry` in `packages/core/src/types/registry.ts` — done.
2. Import `@aio-ui/skeleton/Skeleton.css` with the app shell, next to `@aio-ui/styles`.
3. Add a loader for `@aio-ui/skeleton` to the host's asset map when a manifest declares it.
4. Implement `loading()` in the components that want a precise mockup.
