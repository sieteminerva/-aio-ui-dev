import { Registry } from "./Registry/index.js";
/**
 * Template store.
 *
 * Keys are `themeId:selectorKey`: a theme overrides one token at a time, and the same
 * token may be overridden by several themes.
 */
export class TemplateRegistry {
    #handlers = new Registry("template", { duplicate: "replace" });
    /** Number of registered overrides. */
    get size() {
        return this.#handlers.size;
    }
    /**
     * Resolves the override for a theme token.
     *
     * @param themeId - Theme that owns the override, e.g. `"cyberpunk"`.
     * @param key - Selector token, e.g. `"@masonry>item"`.
     * @param fallback - Handler to use when the theme has no override.
     */
    resolve(themeId, key, fallback) {
        return this.#handlers.resolve(this.#key(themeId, key)) ?? fallback;
    }
    /** Registers (or replaces) an override. */
    register(themeId, key, handler) {
        this.#handlers.register(this.#key(themeId, key), handler);
    }
    /** Removes an override. Returns whether something was removed. */
    unregister(themeId, key) {
        return this.#handlers.unregister(this.#key(themeId, key));
    }
    /** Removes every override. */
    clear() {
        this.#handlers.clear();
    }
    /** All keys, for the debug channel. */
    keys() {
        return this.#handlers.ids();
    }
    #key(themeId, key) {
        return `${themeId}:${key}`;
    }
}
let installed = new TemplateRegistry();
/**
 * Installs the store `Base` and `DOMRenderer` read from.
 *
 * A theme package calls this with its own instance; passing `null` restores a fresh
 * empty store, which is what a test or an app teardown wants.
 */
export function setTemplates(registry) {
    installed = registry ?? new TemplateRegistry();
}
/** The store currently in use. Never `null`, so callers need no guard. */
export function getTemplates() {
    return installed;
}
//# sourceMappingURL=TemplateRegistry.js.map