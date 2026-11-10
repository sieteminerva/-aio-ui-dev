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
export type TemplateHandler = (typeKey: string, element: HTMLElement, payload: any, selector: any) => void | Promise<void>;
/**
 * Template store.
 *
 * Keys are `themeId:selectorKey`: a theme overrides one token at a time, and the same
 * token may be overridden by several themes.
 */
export declare class TemplateRegistry {
    #private;
    /** Number of registered overrides. */
    get size(): number;
    /**
     * Resolves the override for a theme token.
     *
     * @param themeId - Theme that owns the override, e.g. `"cyberpunk"`.
     * @param key - Selector token, e.g. `"@masonry>item"`.
     * @param fallback - Handler to use when the theme has no override.
     */
    resolve(themeId: string, key: string, fallback: TemplateHandler | null): TemplateHandler | null;
    /** Registers (or replaces) an override. */
    register(themeId: string, key: string, handler: TemplateHandler): void;
    /** Removes an override. Returns whether something was removed. */
    unregister(themeId: string, key: string): boolean;
    /** Removes every override. */
    clear(): void;
    /** All keys, for the debug channel. */
    keys(): string[];
}
/**
 * Installs the store `Base` and `DOMRenderer` read from.
 *
 * A theme package calls this with its own instance; passing `null` restores a fresh
 * empty store, which is what a test or an app teardown wants.
 */
export declare function setTemplates(registry: TemplateRegistry | null): void;
/** The store currently in use. Never `null`, so callers need no guard. */
export declare function getTemplates(): TemplateRegistry;
//# sourceMappingURL=TemplateRegistry.d.ts.map