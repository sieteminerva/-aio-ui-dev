import type { iBasicNode, iBuilderRegistry, iThemeModule } from "@aio-ui/core/interface";
import type { HorizontalScrollingConfig } from "./HorizontalScrolling";
/**
 * Horizontal theme.
 *
 * The scrolling behaviour already existed as `HorizontalScrollingPage`, a standalone
 * module with `activate(shell, elements)` and `deactivate(shell)` — the same two hooks a
 * theme needs. This class is the adapter that makes it a first-class theme without
 * duplicating a line of the scroll logic.
 *
 * Note: a theme applies to **every** route, which is the point of a layout theme. A page
 * that ships its own `new HorizontalScrollingPage().activate(...)` inside `onCreated`
 * would double-apply it, so that call belongs to the theme from now on.
 */
export declare class HorizontalTheme implements iThemeModule {
    #private;
    readonly themeId = "horizontal";
    readonly name = "Horizontal";
    constructor(config?: Partial<HorizontalScrollingConfig>);
    /** Structural hook — a horizontal layout keeps the page tree as authored. */
    beforePageRender(pages: iBasicNode[], menu: iBasicNode | null, footer: iBasicNode | null): {
        pages: iBasicNode[];
        menu: iBasicNode | null;
        footer: iBasicNode | null;
    };
    /** Behavioural hook — wires the scroll engine to the live page. */
    activate(shell: HTMLElement, elements: HTMLElement[], _context?: {
        setConfig: (builderName: keyof iBuilderRegistry, newConfig: Record<string, any>) => void;
    }): void;
    /** Unmount hook — releases listeners and injected styles. */
    deactivate(shell: HTMLElement): void;
}
//# sourceMappingURL=HorizontalTheme.d.ts.map