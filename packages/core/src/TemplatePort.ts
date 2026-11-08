/**
 * Template port.
 *
 * A theme may replace the DOM template of any selector token (`@masonry>item`,
 * `@container`, …). The renderer and `Base` need to *ask* for the active handler, but
 * they must not own the store: a static global (`globalThis.TemplateRegistry`) made the
 * dependency invisible, untestable, and impossible to have two apps on one page.
 *
 * Same shape as `BuilderPort`: `core` declares the seam, the feature package installs
 * an implementation, and `core` never imports it.
 */

/** Overrides the DOM produced for one selector token. */
export type TemplateHandler = (
  typeKey: string,
  element: HTMLElement,
  payload: any,
  selector: any
) => void | Promise<void>;

/** What a theme-aware store must be able to do. */
export interface iTemplatePort {
  /** Resolves the handler for `themeId` + selector key, or `fallback` when none exists. */
  resolve(themeId: string, key: string, fallback: TemplateHandler | null): TemplateHandler | null;
  /** Registers (or replaces) a handler. */
  register(themeId: string, key: string, handler: TemplateHandler): void;
  /** Removes a handler, if present. */
  unregister(themeId: string, key: string): void;
}

let installed: iTemplatePort | null = null;

/**
 * Installs the template store.
 *
 * Called once by the host (or by `@aio-ui/theme`) before the first render. Passing
 * `null` removes it, which is what a test or a second app teardown wants.
 */
export function setTemplatePort(port: iTemplatePort | null): void {
  installed = port;
}

/** The installed store, or `null` when no theme system is in use. */
export function getTemplatePort(): iTemplatePort | null {
  return installed;
}
