import { setTemplates, TemplateRegistry } from "@aio-ui/core";
import { ThemeRegistry } from "./ThemeRegistry.js";
/**
 * Theme renderer — the `theme` slot.
 *
 * It is a plain object with three phases, not an event subscriber: the app calls
 * `prepare` before the DOM is built, `activate` after it is attached, and `deactivate`
 * before the page is replaced. That is why no listener has to guess the right moment,
 * and why two apps on one page cannot steal each other's theme.
 *
 * Templates land in an instance `TemplateRegistry` which installs itself into the core
 * port, replacing the old `globalThis.TemplateRegistry`.
 *
 * Typed structurally (`page: any`) on purpose: this package must not depend on
 * `@aio-ui/app`, so the app's `iThemePort` accepts it by shape.
 */
export class ThemeRenderer {
    static slot = "theme";
    #themes = new ThemeRegistry();
    #templates = new TemplateRegistry();
    #id;
    #active = null;
    constructor(config = {}) {
        for (const theme of config.themes ?? [])
            this.#themes.register(theme);
        // One store per app instance, installed where `core` looks for it.
        setTemplates(this.#templates);
        for (const theme of this.#themes.all())
            this.#registerTemplates(theme);
        this.#id = this.#themes.ids()[0] ?? "default";
        this.#active = this.#themes.resolve(this.#id);
    }
    /** Registered theme ids. */
    get ids() {
        return this.#themes.ids();
    }
    /** Currently applied theme id. */
    get current() {
        return this.#id;
    }
    /**
     * Adds a theme after construction.
     *
     * Registration is not tied to the constructor: a theme is just an id plus hooks, and
     * its templates are per-instance, so adding one later is safe. If no theme was active
     * yet (unknown id), the new one becomes the active theme.
     */
    register(theme) {
        this.#themes.register(theme);
        this.#registerTemplates(theme);
        if (!this.#active) {
            this.#active = theme;
            this.#id = theme.themeId;
        }
    }
    /** Switches the active theme. Unknown ids are reported and ignored. */
    use(themeId) {
        const next = this.#themes.resolve(themeId);
        if (!next) {
            console.warn(`[ThemeRenderer] Unknown theme "${themeId}"; keeping "${this.#id}".`);
            return;
        }
        this.#active = next;
        this.#id = themeId;
    }
    /** Structural hook: lets the active theme rewrite the page before rendering. */
    prepare(page, _route, themeId) {
        this.use(themeId);
        const theme = this.#active;
        if (!theme?.beforePageRender)
            return page;
        const isDocument = Array.isArray(page?.blocks);
        const nodes = (isDocument ? page.blocks : [page]);
        const result = theme.beforePageRender(nodes, null, null);
        if (!result)
            return page;
        return isDocument ? { ...page, blocks: result.pages } : result.pages[0] ?? page;
    }
    /** Behavioural hook: runs once the page is live. */
    activate(shell, blocks) {
        this.#active?.activate(shell, Array.from(blocks.values()), { setConfig: () => undefined });
    }
    /** Cleanup hook: runs before the page is replaced. */
    deactivate(shell) {
        this.#active?.deactivate?.(shell);
    }
    /** Releases the template store so a destroyed app leaves nothing installed. */
    destroy() {
        setTemplates(null);
        this.#templates.clear();
        this.#themes.clear();
    }
    #registerTemplates(theme) {
        const templates = theme.templates?.();
        if (!templates)
            return;
        for (const [key, handler] of Object.entries(templates)) {
            this.#templates.register(theme.themeId, key, handler);
        }
    }
}
//# sourceMappingURL=ThemeRenderer.js.map