/**
 * Cyberpunk theme — tokens only.
 *
 * A theme can do three things: reshape the page tree (`beforePageRender`), decorate the
 * live shell (`activate`), and undo that (`deactivate`). This one only flips a marker
 * attribute; everything visual comes from `CyberpunkTheme.css`, which overrides the
 * `--app-*` tokens. That is the cheapest possible theme: no listeners, no DOM surgery,
 * no per-component code — every component that reads the tokens restyles itself.
 *
 * Host responsibility: import `@aio-ui/theme-cyberpunk/CyberpunkTheme.css` once.
 */
const THEME_ID = "cyberpunk";
export class CyberpunkTheme {
    themeId = THEME_ID;
    name = "Cyberpunk";
    /** Structural hook — the page tree is authored as-is. */
    beforePageRender(pages, menu, footer) {
        return { pages, menu, footer };
    }
    /** Behavioural hook — the CSS does the work; this only marks the scope. */
    activate(shell, _elements, _context) {
        shell.dataset.theme = THEME_ID;
    }
    /** Unmount hook — leave the shell as found. */
    deactivate(shell) {
        if (shell.dataset.theme === THEME_ID)
            delete shell.dataset.theme;
    }
}
//# sourceMappingURL=CyberpunkTheme.js.map