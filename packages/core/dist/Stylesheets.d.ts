/**
 * Lazy stylesheet seam — one place that knows where a component's CSS lives.
 *
 * A component never imports its own stylesheet. A static `import "./Table.css"` is
 * resolved by the bundler, so the sheet rides inside the JS chunk: it is downloaded
 * with the component *and* injected again by the lazy loader, and it defeats the point
 * of loading the component on demand. Instead a builder declares
 * `stylesheet = "./X.css"`, the host declares where that file can be fetched, and this
 * module resolves the two.
 *
 * Two callers use it:
 *
 * - the `ComponentRegistry`, which injects through the `<style>` id scheme declared here;
 * - {@link ensureStylesheet} — any builder, including the ones created *outside* the
 *   registry (a table built inside a form field, a dropdown inside an input), asks for
 *   its own sheet by specifier.
 *
 * The anti-FOUC *hold* is deliberately absent: hiding an unstyled root is a lifecycle
 * detail of `Builder.create()` (which knows its own `loading()` mockup), so it lives next
 * to the builder in `@aio-ui/base/BaseAdapters/Hydration`. This module only answers "is
 * the sheet there" and "give me the sheet".
 */
/** Lazy loader for one stylesheet, returning its text (`?inline` import). */
export type iStyleLoader = () => Promise<unknown>;
/**
 * Registers the host's stylesheet loaders.
 *
 * @param styles - The same map the host hands the `ComponentRegistry`.
 * @returns Nothing.
 *
 * @summary Called by the registry constructor: the host already declares its asset
 * maps once, and this makes the same declaration usable by builders that never pass
 * through the registry.
 */
export declare function useStylesheetAssets(styles: Record<string, iStyleLoader> | null | undefined): void;
/**
 * Normalizes a specifier to `/<specifier>` so two spellings of one sheet share a key.
 *
 * @param specifier - Specifier as declared by a component or the host.
 * @returns The normalized key (`""` for an empty specifier).
 */
export declare function normalizeStylesheetPath(specifier: string): string;
/** `<style>` id for one sheet: stable across the registry path and this one. */
export declare function styleTagId(specifier: string): string;
/** Whether this sheet is already part of the document (either injection path). */
export declare function isStyleInjected(specifier: string): boolean;
/**
 * Whether a component's own stylesheet is still on its way.
 *
 * @param specifier - The component's declared `stylesheet` (`"./Table.css"`).
 * @returns `true` only when the host declares a loader for this sheet and the document
 *   does not have it yet — the single state in which a builder must hold its root.
 *
 * @example
 * if (isStylesheetPending("./Table.css")) return "still coming";
 *
 * @summary A component without a loader is never "pending": waiting for a sheet nobody
 *   can serve would strand the anti-FOUC hold forever. A non-DOM host (SSR, tests) has no
 *   document to be styled, so it never holds either. This is the question the hold asks
 *   *before* a root is returned — hence synchronous, unlike {@link ensureStylesheet}.
 */
export declare function isStylesheetPending(specifier: string): boolean;
/**
 * Writes a stylesheet into the document as a real `<style>` element.
 *
 * @param rawCss - Stylesheet text as returned by the loader.
 * @param specifier - Specifier the text belongs to; drives the element id and dedupe.
 * @returns Nothing.
 *
 * @summary A `<style>` node (not `adoptedStyleSheets`) so the sheet is visible in
 * DevTools, and idempotent by id so the registry and {@link ensureStylesheet} can both
 * ask for the same sheet without duplicating rules.
 */
export declare function injectLazyCss(rawCss: string, specifier: string): void;
/**
 * Replaces the text of an already injected sheet — the dev-only hot path.
 *
 * @param rawCss - New stylesheet text.
 * @param specifier - Specifier the text belongs to; the same one the sheet was injected under.
 * @returns Nothing.
 *
 * @summary Injection stays lazy by default: {@link injectLazyCss} never touches an
 * existing sheet, so editing a file changes nothing on screen until something asks again.
 * A stylesheet watcher (Vite's HMR, a file watcher) needs the opposite: keep the element,
 * swap its text, and skip the reload. That is why this is a **separate, opt-in function**
 * instead of a flag on the injector — no production path can reach it by accident, and a
 * sheet that has not arrived yet simply falls back to the normal lazy injection.
 *
 * ```ts
 * import.meta.hot?.on("vite:afterUpdate", async ({ updates }) => {
 *   for (const file of updates) replaceLazyCss(await textOf(file), specifierOf(file));
 * });
 * ```
 */
export declare function replaceLazyCss(rawCss: string, specifier: string): void;
/**
 * Makes sure one component's stylesheet is present.
 *
 * @param specifier - The component's declared `stylesheet` (`"./Table.css"`).
 * @returns A promise resolved once the sheet is in the document, or immediately when
 *   the host declares no loader for it (never a rejection: style is not fatal).
 *
 * @example
 * void ensureStylesheet("./Table.css"); // a table built outside the registry
 *
 * @summary The one call the hydration hold makes: `Builder.create()` asks for its own
 *   sheet, so a component a builder constructs directly (never through the registry) is
 *   styled by the same loader. It is a no-op when the sheet already arrived, so the two
 *   paths cannot double-inject.
 */
export declare function ensureStylesheet(specifier: string): Promise<void>;
//# sourceMappingURL=Stylesheets.d.ts.map