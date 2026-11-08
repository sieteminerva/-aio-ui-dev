import { Registry } from "@aio-ui/core/Registry";
import type { iThemeModule } from "@aio-ui/core/page";

/**
 * Theme store.
 *
 * Same shape as every other registry in the framework: an instance over the `Registry`
 * kernel, keyed by `themeId`. It stores modules only — applying a theme to the DOM is
 * `ThemeRenderer`'s job.
 */
export class ThemeRegistry {
  readonly #themes = new Registry<iThemeModule>("theme", { duplicate: "warn" });

  /** Number of registered themes. */
  public get size(): number {
    return this.#themes.size;
  }

  /** Registers (or replaces) a theme module. */
  public register(theme: iThemeModule): this {
    this.#themes.register(theme.themeId, theme);
    return this;
  }

  /** The theme for `themeId`, or `null`. */
  public resolve(themeId: string): iThemeModule | null {
    return this.#themes.resolve(themeId);
  }

  /** Whether a theme id is registered. */
  public has(themeId: string): boolean {
    return this.#themes.has(themeId);
  }

  /** Registered theme ids, in registration order. */
  public ids(): string[] {
    return this.#themes.ids();
  }

  /** All registered themes. */
  public all(): iThemeModule[] {
    return this.#themes.entries().map((entry) => entry.value);
  }

  /** Removes every theme. */
  public clear(): void {
    this.#themes.clear();
  }
}
