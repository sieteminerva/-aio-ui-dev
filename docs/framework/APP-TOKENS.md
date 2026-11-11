# App-layer tokens (`packages/styles/src/variables.css`)

The only place a raw colour, size or asset may be born. Components never declare these — they
derive `--<component>-*` tokens from them (see `docs/framework/COMPONENT-CONVENTIONS.md`).

**This file is the contract for the colour-theme generator** (`.archives/Editor/ColorTheme`,
the WYSIWYG editor's theme surface). A theme preset is complete when it defines **every token
below in both light and dark**, because a missing one silently falls through to the package
default.

## File structure

`variables.css` has three blocks and they must stay in sync:

| Block | When it applies |
| --- | --- |
| `:root` | light, the default |
| `@media (prefers-color-scheme: dark)` | visitor's OS is dark and the app was not forced |
| `:root[data-mode="dark"]` | the app forced dark |

A token added to one dark block but not the other is a bug — the forced-dark path keeps the
light value. That happened on 2026-11-12 with the status palette and is now fixed.

## Status palette — NEW 2026-11-12 (commit `adf06fe`)

Introduced when the file-uploader's private `--allowed/-unallowed/-warning/-editing-color` were
pulled up, because `Table.css` read them from another package. Names follow the rule
`--app-status-<state>[-<role>]`.

| Token | Role | Light | Dark |
| --- | --- | --- | --- |
| `--app-status-error` | solid error line / text | `#ff114d` | `#ff5a7c` |
| `--app-status-error-soft` | muted error text (labels) | `#ff93ae` | `#ffa9bd` |
| `--app-status-error-surface` | error field background | `#fff6f6` | `rgba(255, 17, 77, 0.12)` |
| `--app-status-error-fill` | translucent red fill (chips, hover) | `rgba(220, 20, 60, 0.486)` | `rgba(255, 90, 124, 0.42)` |
| `--app-status-success` | translucent green fill | `rgba(21, 179, 60, 0.658)` | `rgba(21, 179, 60, 0.55)` |
| `--app-status-warning` | translucent amber fill | `rgba(236, 186, 20, 0.753)` | `rgba(236, 186, 20, 0.62)` |
| `--app-status-info` | translucent blue fill ("editing" state) | `rgba(33, 133, 208, 0.854)` | `rgba(33, 133, 208, 0.72)` |

Roles are not decoration:

- **no suffix** → a solid colour you can write text or a 1px border with.
- **`-soft`** → a desaturated variant for small text on a surface.
- **`-surface`** → a near-background wash for an input that failed validation.
- **`-fill`** / **`-success` / `-warning` / `-info`** → translucent, meant as
  `background`/`border-color` under light text. Do not use them for text.

Consumers: `input` (`--input-error-color/-text-color/-background-color`, `--input-file-*`),
`table` (row action buttons, add-button hover), `form` (spinner asset only).

## Rest of the contract

| Group | Tokens |
| --- | --- |
| Layout | `--app-padding-layout`, `--app-margin-layout`, `--app-padding-component`, `--app-margin-component`, `--app-gap`, `--app-component-border-radius`, `--app-image-border-radius` |
| Brand | `--app-primary-color`, `--app-primary-hover`, `--app-accent-color`, `--app-accent-strong`, `--app-accent-subtle` |
| Surface | `--app-page-background`, `--app-surface-background-color`, `--app-surface-strong`, `--app-surface-muted` |
| Text | `--app-text-color`, `--app-text-accent-color`, `--app-text-heading-color` |
| Line & elevation | `--app-border-color`, `--app-border-focus`, `--app-shadow-soft`, `--app-shadow-elevated` |
| Asset | `--app-spinner-content` (inline SVG data URI, theme-independent) |

## Rules for the generator

1. Emit a value for every token in both modes; never rely on the package fallback.
2. Keep the roles: a `-fill` must stay translucent, `-surface` must stay close to the page
   background, otherwise a component that stacks them loses contrast.
3. `--app-page-background` and `--app-shadow-*` are not colours but CSS values — a colour picker
   cannot round-trip them, so let a theme emit them as raw strings.
4. Do not write component tokens (`--input-*`, `--table-*`, …) from the generator. It was done
   before (`ColorTheme.css` sets `--input-primary-color`, …); the components own those now, and
   an override belongs on an ancestor selector, not inside the theme.

## Known gaps (packages lane, not the generator)

- `ColorTheme.css` reads `--app-text-on-primary`, which **no package defines**. Either add it to
  `variables.css` or drop the read — a theme cannot supply a token the app never declares.
- `variables.css` still declares component tokens (`--input-*`, `--table-*`) under the dark
  blocks. They belong in each component's own sheet; until they move, a theme change that
  expects only `--app-*` will look half-applied in dark mode.
- `FileUploader.css` still mixes literal `rgb(245, 244, 244)` into `color-mix()`, so those tints
  do not follow a re-themed surface.
