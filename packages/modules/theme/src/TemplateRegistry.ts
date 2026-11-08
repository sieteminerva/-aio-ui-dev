import { Registry } from "@aio-ui/core/Registry";
import type { iTemplatePort, TemplateHandler } from "@aio-ui/core/TemplatePort";

/**
 * Template store — the instance that replaces the old `globalThis.TemplateRegistry`.
 *
 * Two things changed from the legacy static class:
 *
 * 1. it is an **instance** implementing `iTemplatePort`, so `core` asks for it through
 *    the port instead of reaching into a global. Two apps on one page, or a test, can
 *    each have their own store;
 * 2. storage goes through the `Registry` kernel, so duplicate handling, scoping and
 *    clearing behave the same as every other registry in the framework.
 *
 * Keys are `themeId:selectorKey`, because a theme overrides one token at a time and the
 * same token may be overridden by several themes.
 */
export class TemplateRegistry implements iTemplatePort {
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
