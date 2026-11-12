# ThemeRenderer (`@aio-ui/theme`)

The `theme` slot — the **engine**, not a theme. Themes are separate packages
(`@aio-ui/theme-default`, `-horizontal`, `-cyberpunk`) so a project installs exactly the ones
it ships.

## Payload

None. Themes are supplied through config, and the active id comes from the router.

## Config

| Option   | Default | Meaning                                                 |
| -------- | ------- | ------------------------------------------------------- |
| `themes` | `[]`    | Themes this app ships; the first one is the fallback id |

### Lifecycle

It is a plain object with three phases, called by the app — not an event subscriber:

| Phase        | When                        | Purpose                         |
| ------------ | --------------------------- | ------------------------------- |
| `prepare`    | before the DOM is built     | set what templates will read    |
| `activate`   | after the page is attached  | the theme applies itself        |
| `deactivate` | before the page is replaced | give the theme a chance to undo |

## Nodes

None — a theme decides what to restyle, the renderer only routes the calls.

## Tokens

None of its own. A theme overrides `--app-*` (see `docs/framework/APP-TOKENS.md`); every
component sheet derives its own `--<component>-*` layer from those tokens.

## Methods

| Method             | Returns    | Meaning                                       |
| ------------------ | ---------- | --------------------------------------------- |
| `ids` (getter)     | `string[]` | Registered theme ids                          |
| `current` (getter) | `string`   | Active theme id                               |
| `register(theme)`  | `void`     | Add a theme after construction                |
| `use(themeId)`     | `void`     | Switch; an unknown id is reported and ignored |

`ThemeRegistry` (also exported) is the plain store behind it: `register`, `resolve`, `has`,
`ids`, `all`, `clear`, `size`.

## Wiring checklist

1. `.registerModule(ThemeRenderer, { themes: [new DefaultTheme(), new CyberpunkTheme()] })`.
2. Ship each theme's stylesheet from the host (`@aio-ui/theme-cyberpunk/CyberpunkTheme.css`).
3. Let the router own the id: `#route?theme=cyberpunk` — the app forwards it to `use()`.
4. A theme package depends on `core` for `iThemeModule`, never on this engine; that keeps the
   package graph a tree.
