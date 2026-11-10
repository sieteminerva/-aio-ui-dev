/**
 * Default theme.
 *
 * The reference implementation of `iThemeModule`, kept deliberately small: it adds no
 * classes, no overrides, no listeners. Every other theme is a diff against this one.
 */
export class DefaultTheme {
    themeId = "default";
    name = "Default";
    /** Structural hook — runs before the DOM is built. */
    beforePageRender(pages, menu, footer) {
        return { pages, menu, footer };
    }
    /** Behavioural hook — runs once the page is live. */
    activate(shell, _elements, _context) {
        shell.style.display = "block";
        shell.style.overflow = "initial";
    }
    /** Unmount hook. */
    deactivate(shell) {
        shell.removeAttribute("style");
    }
}
//# sourceMappingURL=DefaultTheme.js.map