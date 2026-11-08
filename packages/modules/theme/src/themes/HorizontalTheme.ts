import type { iBasicNode, iBuilderRegistry, iThemeModule } from "@aio-ui/core/interface";

import { HorizontalScrollingPage } from "./HorizontalScrolling";
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
export class HorizontalTheme implements iThemeModule {
  readonly themeId = "horizontal";
  readonly name = "Horizontal";

  readonly #scroller: HorizontalScrollingPage;

  constructor(config: Partial<HorizontalScrollingConfig> = {}) {
    this.#scroller = new HorizontalScrollingPage(config);
  }

  /** Structural hook — a horizontal layout keeps the page tree as authored. */
  public beforePageRender(
    pages: iBasicNode[],
    menu: iBasicNode | null,
    footer: iBasicNode | null
  ): { pages: iBasicNode[]; menu: iBasicNode | null; footer: iBasicNode | null } {
    return { pages, menu, footer };
  }

  /** Behavioural hook — wires the scroll engine to the live page. */
  public activate(
    shell: HTMLElement,
    elements: HTMLElement[],
    _context?: { setConfig: (builderName: keyof iBuilderRegistry, newConfig: Record<string, any>) => void }
  ): void {
    this.#scroller.activate(shell, elements);
  }

  /** Unmount hook — releases listeners and injected styles. */
  public deactivate(shell: HTMLElement): void {
    this.#scroller.deactivate(shell);
  }
}
