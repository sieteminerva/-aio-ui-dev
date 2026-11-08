import type { iBasicNode, iThemeModule } from "@aio-ui/core/interface";
import { setTemplatePort } from "@aio-ui/core/TemplatePort";

import { TemplateRegistry } from "./TemplateRegistry";
import { ThemeRegistry } from "./ThemeRegistry";

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
export class ThemeRenderer {
  static readonly slot = "theme" as const;

  readonly #themes = new ThemeRegistry();
  readonly #templates = new TemplateRegistry();
  #id: string;
  #active: iThemeModule | null = null;

  constructor(config: iThemeConfig = {}) {
    for (const theme of config.themes ?? []) this.#themes.register(theme);

    // One store per app instance, installed where `core` looks for it.
    setTemplatePort(this.#templates);
    for (const theme of this.#themes.all()) this.#registerTemplates(theme);

    this.#id = this.#themes.ids()[0] ?? "default";
    this.#active = this.#themes.resolve(this.#id);
  }

  /** Registered theme ids. */
  public get ids(): string[] {
    return this.#themes.ids();
  }

  /** Currently applied theme id. */
  public get current(): string {
    return this.#id;
  }

  /** Switches the active theme. Unknown ids are reported and ignored. */
  public use(themeId: string): void {
    const next = this.#themes.resolve(themeId);
    if (!next) {
      console.warn(`[ThemeRenderer] Unknown theme "${themeId}"; keeping "${this.#id}".`);
      return;
    }

    this.#active = next;
    this.#id = themeId;
  }

  /** Structural hook: lets the active theme rewrite the page before rendering. */
  public prepare(page: any, _route: string, themeId: string): any {
    this.use(themeId);

    const theme = this.#active;
    if (!theme?.beforePageRender) return page;

    const isDocument = Array.isArray(page?.blocks);
    const nodes = (isDocument ? page.blocks : [page]) as iBasicNode[];
    const result = theme.beforePageRender(nodes, null, null);
    if (!result) return page;

    return isDocument ? { ...page, blocks: result.pages } : result.pages[0] ?? page;
  }

  /** Behavioural hook: runs once the page is live. */
  public activate(shell: HTMLElement, blocks: Map<string, HTMLElement>): void {
    this.#active?.activate(shell, Array.from(blocks.values()), { setConfig: () => undefined });
  }

  /** Cleanup hook: runs before the page is replaced. */
  public deactivate(shell: HTMLElement): void {
    this.#active?.deactivate?.(shell);
  }

  /** Releases the template store so a destroyed app leaves nothing installed. */
  public destroy(): void {
    setTemplatePort(null);
    this.#templates.clear();
    this.#themes.clear();
  }

  #registerTemplates(theme: iThemeModule): void {
    const templates = theme.templates?.();
    if (!templates) return;

    for (const [key, handler] of Object.entries(templates)) {
      this.#templates.register(theme.themeId, key, handler);
    }
  }
}
