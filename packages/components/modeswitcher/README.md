# ModeSwitcher (`@aio-ui/modeswitcher`)

A pill toggle that flips the document between light and dark mode. It reads the browser mode on
construction, writes it onto the document, and keeps the thumb position in sync — it does not own a
theme, it only switches the mode the theme layer reacts to.

## Payload

None. The component is self-contained; anything passed is ignored.

## Config

| Option      | Default      | Meaning                     |
| ----------- | ------------ | --------------------------- |
| `selectors` | see defaults | Per-key tag/class override  |
| `themeId`   | `"default"`  | Passed through to the theme |
| `namespace` | `null`       | Prefix for generated ids    |

## Nodes

| Key                     | Default tag | Class / note                              |
| ----------------------- | ----------- | ----------------------------------------- |
| `@mode-switcher`        | `div`       | `mode-switcher`                           |
| `@mode-switcher>toggle` | `toggle`    | `toggle`, `data-theme-toggle`, aria-label |
| `@mode-switcher>track`  | `span`      | `track`                                   |
| `@mode-switcher>thumb`  | `span`      | `thumb`                                   |
| `@mode-switcher>label`  | `span`      | `label`                                   |

## Tokens

Declared once on `:root, [data-theme]` in `ModeSwitcher.css`, each deriving from an app token with a
literal fallback. Redeclare a `--mode-switcher-*` token on an ancestor to retheme it alone.

| Token                              | Derives from              | Used for             |
| ---------------------------------- | ------------------------- | -------------------- |
| `--mode-switcher-border-color`     | `--app-border-color`      | Pill and track frame |
| `--mode-switcher-background`       | `--app-surface-strong`    | Pill surface         |
| `--mode-switcher-text-color`       | `--app-text-accent-color` | Pill label           |
| `--mode-switcher-track-background` | `--app-surface-muted`     | Track surface        |
| `--mode-switcher-accent-color`     | `--app-accent-color`      | Thumb                |

## Wiring checklist

1. Add `"mode-switcher"` to `iBuilderRegistry` in `packages/core/src/types/registry.ts`.
2. Add a loader for `@aio-ui/modeswitcher/ModeSwitcher` to the host's asset map.
3. Add a `stylesheet` loader for `@aio-ui/modeswitcher/ModeSwitcher.css`.
4. List it in the host's route plan: `registerModule(components, [{ route, components: ["mode-switcher"] }])`.
