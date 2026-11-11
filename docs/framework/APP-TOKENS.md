# App-layer tokens (`packages/styles/src/variables.css`)

The only place a raw colour, size or asset may be born. Components never declare these — they
derive `--<component>-*` tokens from them (see `docs/framework/COMPONENT-CONVENTIONS.md`).

**This file is the contract for the colour-theme generator** (`.archives/Editor/ColorTheme`,
the WYSIWYG editor's theme surface). A theme preset is complete when it defines **every token
below in both light and dark**, because a missing one silently falls through to the package
default.

## File structure

`variables.css` has three blocks and they must stay in sync:

| Block                                 | When it applies                                 |
| ------------------------------------- | ----------------------------------------------- |
| `:root`                               | light, the default                              |
| `@media (prefers-color-scheme: dark)` | visitor's OS is dark and the app was not forced |
| `:root[data-mode="dark"]`             | the app forced dark                             |

A token added to one dark block but not the other is a bug — the forced-dark path keeps the
light value. That happened on 2026-11-12 with the status palette and is now fixed.

## Status palette

Names follow `--app-status-<state>[-<role>]`. The four states are **semantic**: their hue is
fixed in every theme, and only lightness follows the mode (a dark-mode solid must sit on a dark
surface, so it is lighter).

Two roles exist for all four states:

| Role  | Suffix   | Use it for                              | Never use it for                   |
| ----- | -------- | --------------------------------------- | ---------------------------------- |
| solid | _(none)_ | text, icons, 1px borders, a filled chip | a large background under body text |
| fill  | `-fill`  | background, hover wash under light text | a text colour — it is translucent  |

`error` carries two extra roles because a consumer needs them; add the same pair to another
state only when something reads it (a token nobody reads is a token that rots).

| Token                        | Light                       | Dark                       |
| ---------------------------- | --------------------------- | -------------------------- |
| `--app-status-error`         | `#ff114d`                   | `#ff5a7c`                  |
| `--app-status-error-soft`    | `#ff93ae`                   | `#ffa9bd`                  |
| `--app-status-error-surface` | `#fff6f6`                   | `rgba(255, 17, 77, 0.12)`  |
| `--app-status-error-fill`    | `rgba(220, 20, 60, 0.486)`  | `rgba(255, 90, 124, 0.42)` |
| `--app-status-success`       | `#15a13b`                   | `#4cd964`                  |
| `--app-status-success-fill`  | `rgba(21, 179, 60, 0.658)`  | `rgba(21, 179, 60, 0.55)`  |
| `--app-status-warning`       | `#b07c00`                   | `#f5c53d`                  |
| `--app-status-warning-fill`  | `rgba(236, 186, 20, 0.753)` | `rgba(236, 186, 20, 0.62)` |
| `--app-status-info`          | `#1a6fb5`                   | `#4aa3e8`                  |
| `--app-status-info-fill`     | `rgba(33, 133, 208, 0.854)` | `rgba(33, 133, 208, 0.72)` |

Consumers: `input` (`--input-error-color/-text-color/-background-color`, `--input-file-*`),
`table` (row actions, add-button hover), `form` (spinner asset only).

## Foreground on a brand fill

Text and icons that sit **on** a solid brand colour get their own token. The value is chosen by
WCAG contrast, not by taste — a theme may recolour the fill, and the foreground has to stay
readable.

| Token                   | Sits on               | Light     | Dark      | Why                                  |
| ----------------------- | --------------------- | --------- | --------- | ------------------------------------ |
| `--app-text-on-primary` | `--app-primary-color` | `#ffffff` | `#1a140e` | on `#925408`: white 6.0:1, ink 3.0:1 |
| `--app-text-on-accent`  | `--app-accent-color`  | `#1a140e` | `#1a140e` | on `#b47828`: ink 4.9:1, white 3.7:1 |

Consumers: `section` (`.section-cta`), `input` (`InputControls` buttons and the filesize chip,
via `--input-text-on-primary`), `masonry` (load-more button). Both brand fills are light in dark
mode, so the foreground flips there.

## Rest of the contract

| Group            | Tokens                                                                                                                                                                        |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layout           | `--app-padding-layout`, `--app-margin-layout`, `--app-padding-component`, `--app-margin-component`, `--app-gap`, `--app-component-border-radius`, `--app-image-border-radius` |
| Brand            | `--app-primary-color`, `--app-primary-hover`, `--app-accent-color`, `--app-accent-strong`, `--app-accent-subtle`                                                              |
| Surface          | `--app-page-background`, `--app-surface-background-color`, `--app-surface-strong`, `--app-surface-muted`                                                                      |
| Text             | `--app-text-color`, `--app-text-accent-color`, `--app-text-heading-color`                                                                                                     |
| Line & elevation | `--app-border-color`, `--app-border-focus`, `--app-shadow-soft`, `--app-shadow-elevated`                                                                                      |
| Asset            | `--app-spinner-content` (inline SVG data URI, theme-independent)                                                                                                              |

## Rules for the generator

1. Emit a value for every token in both modes; never rely on the package fallback.
2. Keep the roles: a `-fill` must stay translucent, `-surface` must stay close to the page
   background, otherwise a component that stacks them loses contrast.
3. `--app-page-background` and `--app-shadow-*` are not colours but CSS values — a colour picker
   cannot round-trip them, so let a theme emit them as raw strings.
4. Do not write component tokens (`--input-*`, `--table-*`, …) from the generator. It was done
   before (`ColorTheme.css` sets `--input-primary-color`, …); the components own those now, and
   an override belongs on an ancestor selector, not inside the theme.
5. Status hues stay fixed; derive only lightness. A generated theme and the framework default
   must be interchangeable, so the values in `ColorTheme.engine.ts` `STATUS` mirror this table.
6. `--app-text-on-*` is computed from contrast against the fill it sits on, never exposed as a
   mixer slider. Losing a 4.5:1 pairing is not a style choice.

## Generator extras (not part of the framework contract)

The ramp `--app-primary-50 … --app-primary-900` is emitted by the theme generator and written
into the **generated app**, not into `packages/styles`. Nothing in the framework reads it, so it
has no default here — a user who wants ramps gets them from the generator, a user who does not
never sees them. Same rule for any future non-framework token: it lives in the generator.

## Known gaps (packages lane, not the generator)

- `variables.css` still declares component tokens (`--input-*`, `--table-*`) under the dark
  blocks. They belong in each component's own sheet; until they move, a theme change that
  expects only `--app-*` will look half-applied in dark mode.
- `FileUploader.css` still mixes literal `rgb(245, 244, 244)` into `color-mix()`, so those tints
  do not follow a re-themed surface.
