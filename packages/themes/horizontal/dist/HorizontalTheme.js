import { HorizontalScrollingPage } from "./HorizontalScrolling.js";
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
export class HorizontalTheme {
    themeId = "horizontal";
    name = "Horizontal";
    #scroller;
    constructor(config = {}) {
        this.#scroller = new HorizontalScrollingPage(config);
    }
    /** Structural hook — a horizontal layout keeps the page tree as authored. */
    beforePageRender(pages, menu, footer) {
        return { pages, menu, footer };
    }
    /** Behavioural hook — wires the scroll engine to the live page. */
    activate(shell, elements, _context) {
        this.#scroller.activate(shell, elements);
    }
    /** Unmount hook — releases listeners and injected styles. */
    deactivate(shell) {
        this.#scroller.deactivate(shell);
    }
}
//# sourceMappingURL=HorizontalTheme.js.map