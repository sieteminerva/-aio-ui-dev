import type { iBasicNode, iBuilderRegistry, iThemeModule } from "@aio-ui/core/interface";
/**
 * Default theme.
 *
 * The reference implementation of `iThemeModule`, kept deliberately small: it adds no
 * classes, no overrides, no listeners. Every other theme is a diff against this one.
 */
export declare class DefaultTheme implements iThemeModule {
    readonly themeId = "default";
    readonly name = "Default";
    /** Structural hook — runs before the DOM is built. */
    beforePageRender(pages: iBasicNode[], menu: iBasicNode | null, footer: iBasicNode | null): {
        pages: iBasicNode[];
        menu: iBasicNode | null;
        footer: iBasicNode | null;
    };
    /** Behavioural hook — runs once the page is live. */
    activate(shell: HTMLElement, _elements: HTMLElement[], _context?: {
        setConfig: (builderName: keyof iBuilderRegistry, newConfig: Record<string, any>) => void;
    }): void;
    /** Unmount hook. */
    deactivate(shell: HTMLElement): void;
}
//# sourceMappingURL=DefaultTheme.d.ts.map