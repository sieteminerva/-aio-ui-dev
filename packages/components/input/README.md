# Input (`@aio-ui/input`)

Input renders **one form field** — label, control, info line — and the shell around it
(switch, file chip, action buttons, popover). A field is a field with or without a form
around it, so nothing in this package is scoped under `.form`; rows, fieldsets and
multistep layout belong to `@aio-ui/form`.

Sub-modules extend the field without changing the builder: `dropdown` (select/search),
`file-uploader`, `controls` (action buttons) and `popover`. Each one is an `iInputAdapter`
that the builder resolves once per `prepare()` and disposes on teardown.

## Payload

```ts
{
  type: "text",            // text | number | email | password | textarea | select | …
  id: "email",
  title: "Email address",  // `label` wins over `title` when both are present
  placeholder: "you@example.com",
  required: true,
}
```

The payload is a **single record** (`iBasicInputNode`), not a list. Useful fields:
`value`, `rows`/`cols` (textarea), `step` (numeric increment, defaults to `"any"`),
`multiple`, `disabled`, `readonly`, `editable` (skips the automatic read-only lock when
action buttons are present), `info`, `position` (`top | left | right | bottom`),
`dropdown` (forwarded to the dropdown module), `popover`, `onFileSelected`,
`onValueChange` and `calculator` (calculation strategy for a readonly total).

`useLabel`, `view`, `thumbnail`, `maxUpload`, `maxFileSize`, `groupUnallowed` and
`createEventListener` are consumed by the file module.

## Config

| Option      | Default                  | Meaning                                                            |
| ----------- | ------------------------ | ------------------------------------------------------------------ |
| `modules`   | core preset              | `ModuleLoader`, preset array, or already-resolved `iInputAdapter[]` |
| `selectors` | see `defaultSelectors`   | Per-key tag/class override                                          |
| `namespace` | `null`                   | Prefix for generated ids                                            |
| `themeId`   | `"default"`              | Passed through to the theme provider                                |
| `emit`      | `() => {}`               | Publish channel for the owning form                                 |

`modules: null` keeps every core adapter available. Pass an already-resolved adapter array
when a parent already loaded the set — the field then never loads or unloads modules the
host owns (that is what `Form` does).

## Nodes

| Key                 | Default tag | Class / note                                     |
| ------------------- | ----------- | ------------------------------------------------ |
| `@field`            | `div`       | `field`                                          |
| `@field>label`      | `label`     | linked with `for` to the control id               |
| `@field>input`      | `input`     | text-like types                                   |
| `@field>textarea`   | `textarea`  | `type: "textarea"`                                |
| `@field>select`     | `select`    | plus `@field>select>option`                       |
| `@field>checkbox`   | `input`     | `type=checkbox`, wrapped in `.switch.control`     |
| `@field>radio`      | `input`     | `type=radio`                                      |
| `@field>toggle`     | `input`     | same switch shell, opt in with `config.style`     |
| `@field>file`       | `input`     | `type=file`                                       |
| `@field>info`       | `small`     | `info`                                            |

## Tokens

Every token is declared **once**, on `:root, [data-theme]`, in `input.css`. `[data-theme]`
is required: a theme puts `--app-*` on the shell element, and a custom property is
substituted where it is *declared*. Never redeclare these per `.field` — the whole subtree
would inherit the copy and any ancestor override would be shadowed.

Overriding is the third layer: redeclare `--input-*` on any ancestor, leave the package
alone.

**Colour** (derived from `--app-*`)

| Token                              | Derives from                                  |
| ---------------------------------- | --------------------------------------------- |
| `--input-primary-color`            | `--app-primary-color`                         |
| `--input-accent-color`             | `--app-accent-color`                          |
| `--input-border-color`             | `--input-primary-color` (dark: `--app-border-color`) |
| `--input-text-color`               | mix of accent + primary (dark: `--app-text-color`)   |
| `--input-label-color`              | `--input-accent-color` (dark: `--app-text-accent-color`) |
| `--input-text-color-light`         | mix of primary + white                        |
| `--input-text-color-hover`         | mix of primary + black                        |
| `--input-placeholder-color`        | mix of grey + `--input-text-color`            |
| `--input-background-color`         | mix of accent + white (dark: `transparent`)   |
| `--input-background-color-hover`   | mix of accent + white                         |
| `--input-picker-background`        | `--input-background-color` (dark: `--app-surface-strong`) |
| `--input-popover-background-color` | dark: `--app-surface-strong` — see "Known issues" |
| `--input-error-color`              | `--app-status-error`                          |
| `--input-error-text-color`         | `--app-status-error-soft`                     |
| `--input-error-background-color`   | `--app-status-error-surface`                  |
| `--input-text-on-primary`          | `--app-text-on-primary`                       |

Dark mode re-derives seven of them in the same file, because the palette inverts the field
(solid border becomes translucent, tinted surface becomes flat) and no single formula
covers both modes.

**File module** (`FileUploader/FileUploader.css`)

| Token                            | Derives from                |
| -------------------------------- | --------------------------- |
| `--input-file-allowed-color`     | `--app-status-success`      |
| `--input-file-unallowed-color`   | `--app-status-error-fill`   |
| `--input-file-warning-color`     | `--app-status-warning`      |

**Metrics and motion** (`input.css`)

`--input-font-size`, `--input-label-size` (`0.75 × font-size`), `--input-border-radius`,
`--input-line-height`, `--input-icon-size`, `--input-min-height`, `--input-picker-height`
(`3 × line-height`), `--input-dropdown-arrow-content` (SVG data URI),
`--input-dropdown-transition-delay`, `--input-popup-duration`, `--input-popup-easing`,
`--input-popup-distance`.

The loading spinner is **not** an input token: it is shared with the form package and lives
in the app layer as `--app-spinner-content`.

## Known issues

- `--input-popover-background-color` reads `--input-picker-color`, which no sheet declares.
  Light mode therefore resolves the token to nothing and the `Form` popover paints a
  transparent background; dark mode supplies a value through a mode block. Left as found —
  fixing it is a visible change and needs a decision.

## Wiring checklist

1. `"input"` is already in `iBuilderRegistry` (`packages/core/src/types/registry.ts`).
2. Map `@aio-ui/input`, `@aio-ui/input/input.css` and every sub-module subpath you use
   (`./dropdown`, `./dropdown.css`, `./controls`, `./controls.css`, `./file-uploader`,
   `./file-uploader.css`, `./popover/module`) in the host asset map — every exact `exports`
   key, since a prefix cannot add `.js`.
3. List it in the host's route plan: `registerModule(components, [{ route, components: ["input"] }])`.
