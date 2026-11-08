/**
 * Public surface of `@aio-ui/theme`.
 *
 * Staging area: each theme file is written so it can move to
 * `@aio-ui/theme-<id>` without edits (no import of the others, no shared mutable
 * state). A project should eventually install only the themes it uses — the
 * horizontal theme drags a scroll engine with it, which the default theme does not.
 */
export { ThemeRegistry } from "./ThemeRegistry";
export { ThemeRenderer } from "./ThemeRenderer";
export type { iThemeConfig, iThemeContext } from "./ThemeRenderer";
export { DefaultTheme } from "./themes/DefaultTheme";
export { HorizontalTheme } from "./themes/HorizontalTheme";
export { HorizontalScrollingPage } from "./themes/HorizontalScrolling";
export type { HorizontalScrollingConfig } from "./themes/HorizontalScrolling";
