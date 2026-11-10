import { Registry } from "@aio-ui/core";
/**
 * Theme store.
 *
 * Same shape as every other registry in the framework: an instance over the `Registry`
 * kernel, keyed by `themeId`. It stores modules only — applying a theme to the DOM is
 * `ThemeRenderer`'s job.
 */
export class ThemeRegistry {
    #themes = new Registry("theme", { duplicate: "warn" });
    /** Number of registered themes. */
    get size() {
        return this.#themes.size;
    }
    /** Registers (or replaces) a theme module. */
    register(theme) {
        this.#themes.register(theme.themeId, theme);
        return this;
    }
    /** The theme for `themeId`, or `null`. */
    resolve(themeId) {
        return this.#themes.resolve(themeId);
    }
    /** Whether a theme id is registered. */
    has(themeId) {
        return this.#themes.has(themeId);
    }
    /** Registered theme ids, in registration order. */
    ids() {
        return this.#themes.ids();
    }
    /** All registered themes. */
    all() {
        return this.#themes.entries().map((entry) => entry.value);
    }
    /** Removes every theme. */
    clear() {
        this.#themes.clear();
    }
}
//# sourceMappingURL=ThemeRegistry.js.map