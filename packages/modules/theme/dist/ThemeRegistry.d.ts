import type { iThemeModule } from "@aio-ui/core/page";
/**
 * Theme store.
 *
 * Same shape as every other registry in the framework: an instance over the `Registry`
 * kernel, keyed by `themeId`. It stores modules only — applying a theme to the DOM is
 * `ThemeRenderer`'s job.
 */
export declare class ThemeRegistry {
    #private;
    /** Number of registered themes. */
    get size(): number;
    /** Registers (or replaces) a theme module. */
    register(theme: iThemeModule): this;
    /** The theme for `themeId`, or `null`. */
    resolve(themeId: string): iThemeModule | null;
    /** Whether a theme id is registered. */
    has(themeId: string): boolean;
    /** Registered theme ids, in registration order. */
    ids(): string[];
    /** All registered themes. */
    all(): iThemeModule[];
    /** Removes every theme. */
    clear(): void;
}
//# sourceMappingURL=ThemeRegistry.d.ts.map