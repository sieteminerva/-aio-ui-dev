import type { iBasicNode, iBuilderRegistry, iThemeModule } from "@aio-ui/core/interface";

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

export class CyberpunkTheme implements iThemeModule {
  readonly themeId = THEME_ID;
  readonly name = "Cyberpunk";

  /** Structural hook — the page tree is authored as-is. */
  public beforePageRender(
    pages: iBasicNode[],
    menu: iBasicNode | null,
    footer: iBasicNode | null
  ): { pages: iBasicNode[]; menu: iBasicNode | null; footer: iBasicNode | null } {
    return { pages, menu, footer };
  }

  /** Behavioural hook — the CSS does the work; this only marks the scope. */
  public activate(
    shell: HTMLElement,
    _elements: HTMLElement[],
    _context?: { setConfig: (builderName: keyof iBuilderRegistry, newConfig: Record<string, any>) => void }
  ): void {
    shell.dataset.theme = THEME_ID;
  }

  /** Unmount hook — leave the shell as found. */
  public deactivate(shell: HTMLElement): void {
    if (shell.dataset.theme === THEME_ID) delete shell.dataset.theme;
  }
}
