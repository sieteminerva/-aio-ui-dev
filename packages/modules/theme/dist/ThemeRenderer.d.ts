import type { iThemeModule } from "@aio-ui/core/interface";
/** Config of `ThemeRenderer`, passed as the second argument of `registerModule`. */
export interface iThemeConfig {
    /** Themes this app ships. The first one is used when no theme id is known. */
    themes?: iThemeModule[];
}
/** What the themes' `activate()` receives. */
export interface iThemeContext {
    /** Kept for themes that tune a builder's config (for example a scroll layout). */
    setConfig: (builderName: any, newConfig: Record<string, any>) => void;
}
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
export declare class ThemeRenderer {
    #private;
    static readonly slot: "theme";
    constructor(config?: iThemeConfig);
    /** Registered theme ids. */
    get ids(): string[];
    /** Currently applied theme id. */
    get current(): string;
    /**
     * Adds a theme after construction.
     *
     * Registration is not tied to the constructor: a theme is just an id plus hooks, and
     * its templates are per-instance, so adding one later is safe. If no theme was active
     * yet (unknown id), the new one becomes the active theme.
     */
    register(theme: iThemeModule): void;
    /** Switches the active theme. Unknown ids are reported and ignored. */
    use(themeId: string): void;
    /** Structural hook: lets the active theme rewrite the page before rendering. */
    prepare(page: any, _route: string, themeId: string): any;
    /** Behavioural hook: runs once the page is live. */
    activate(shell: HTMLElement, blocks: Map<string, HTMLElement>): void;
    /** Cleanup hook: runs before the page is replaced. */
    deactivate(shell: HTMLElement): void;
    /** Releases the template store so a destroyed app leaves nothing installed. */
    destroy(): void;
}
//# sourceMappingURL=ThemeRenderer.d.ts.map