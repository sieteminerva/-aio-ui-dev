import { Registry } from "./Registry";

/**
 * Template overrides — the store a theme writes to and the renderer reads from.
 *
 * Lives in `core` because its only consumers are `DOMRenderer` (core) and `Base`
 * (`base`, which already depends on core). A separate package plus a port was more
 * machinery than the thing it guarded: one small class, two callers.
 *
 * The class is exported for tests and for an app that wants its own store; the module
 * also keeps one default instance, which is what `Base` and `DOMRenderer` use when a
 * host installs nothing.
 */

/** Overrides the DOM produced for one selector token. */
export type TemplateHandler = (
  typeKey: string,
  element: HTMLElement,
  payload: any,
  selector: any
) => void | Promise<void>;

/**
 * Template store.
 *
 * Keys are `themeId:selectorKey`: a theme overrides one token at a time, and the same
 * token may be overridden by several themes.
 */
export class TemplateRegistry {
  readonly #handlers = new Registry<TemplateHandler>("template", { duplicate: "replace" });

  /** Number of registered overrides. */
  public get size(): number {
    return this.#handlers.size;
  }

  /**
   * Resolves the override for a theme token.
   *
   * @param themeId - Theme that owns the override, e.g. `"cyberpunk"`.
   * @param key - Selector token, e.g. `"@masonry>item"`.
   * @param fallback - Handler to use when the theme has no override.
   */
  public resolve(themeId: string, key: string, fallback: TemplateHandler | null): TemplateHandler | null {
    return this.#handlers.resolve(this.#key(themeId, key)) ?? fallback;
  }

  /** Registers (or replaces) an override. */
  public register(themeId: string, key: string, handler: TemplateHandler): void {
    this.#handlers.register(this.#key(themeId, key), handler);
  }

  /** Removes an override. Returns whether something was removed. */
  public unregister(themeId: string, key: string): boolean {
    return this.#handlers.unregister(this.#key(themeId, key));
  }

  /** Removes every override. */
  public clear(): void {
    this.#handlers.clear();
  }

  /** All keys, for the debug channel. */
  public keys(): string[] {
    return this.#handlers.ids();
  }

  #key(themeId: string, key: string): string {
    return `${themeId}:${key}`;
  }
}

let installed: TemplateRegistry = new TemplateRegistry();

/**
 * Installs the store `Base` and `DOMRenderer` read from.
 *
 * A theme package calls this with its own instance; passing `null` restores a fresh
 * empty store, which is what a test or an app teardown wants.
 */
export function setTemplates(registry: TemplateRegistry | null): void {
  installed = registry ?? new TemplateRegistry();
}

/** The store currently in use. Never `null`, so callers need no guard. */
export function getTemplates(): TemplateRegistry {
  return installed;
}
