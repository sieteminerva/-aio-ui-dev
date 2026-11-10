/**
 * Public surface of `@aio-ui/theme` — the engine only.
 *
 * Themes are separate packages so a project installs exactly the ones it ships:
 *
 *   @aio-ui/theme-default     tokens + no overrides (the reference theme)
 *   @aio-ui/theme-horizontal  horizontal layout (drags the scroll engine with it)
 *   @aio-ui/theme-cyberpunk   token overrides only, so it costs a stylesheet
 *
 * A theme package depends on `core` for `iThemeModule`, never on this package: the engine
 * consumes themes, themes do not consume the engine. That keeps the graph a tree — no
 * module→module edge, and no cycle for anyone shipping their own theme.
 */
export { ThemeRegistry } from "./ThemeRegistry";
export { ThemeRenderer } from "./ThemeRenderer";
export type { iThemeConfig, iThemeContext } from "./ThemeRenderer";
