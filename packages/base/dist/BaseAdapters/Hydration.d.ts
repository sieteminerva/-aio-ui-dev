/**
 * Hydration hold — what a component shows while its own stylesheet is on its way.
 *
 * A component never imports its own CSS: the host declares the lazy loaders and
 * `Stylesheets` in `@aio-ui/core` resolves them (that module owns the file, the loader and
 * the `<style>` injection). This module owns the other half — the DOM writes that keep an
 * unstyled tree off the screen — and it lives in `base`, next to the builder it serves,
 * because it is a lifecycle detail of `create()`, not a framework kernel.
 *
 * Two shapes, one decision:
 *
 * - **mockup** — the builder implements `loading()` and returns a throwaway silhouette.
 *   It is prepended to the root and the real children are hidden one by one (direct
 *   children only, never a walk), so showing it costs one small build and no bookkeeping.
 *   That is the point: a per-element placeholder pass knows the exact shape of a
 *   component, but it also tracks every node and dominates the render budget.
 * - **shimmer** — no `loading()` implementation: the root is marked (`data-hydrating` +
 *   `--is-loading: 1`) and the animation module paints a generic skin over it.
 *
 * Both paths release from the same `ensureStylesheet()` promise, which never rejects, so a
 * builder no registry ever sees still heals itself — and the same root is revealed even
 * when the sheet never arrives.
 */
/**
 * Builds the mockup a builder wants shown while its sheet is missing.
 *
 * @returns The mockup root, or `null`/`undefined` to fall back to the shimmer skin.
 *
 * @summary Called at most once per held `create()`, and only when the sheet is genuinely
 *   pending, so a component with a warm sheet never pays for its skeleton.
 */
export type iMockupFactory = () => HTMLElement | null | undefined;
/**
 * Writes the "styled" markers on a root — the only release writer.
 *
 * @param root - The top element of a component tree.
 * @returns Nothing.
 *
 * @summary Three writes, no observers: `--is-loading: 0` (children inherit it),
 *   `data-hydrating` removed (every shimmer rule stops matching), `data-loaded="true"` —
 *   a permanent pointer, because `[data-loaded="true"] * { --is-loading: 0 !important }`
 *   forces any stale marker below it back to `0`.
 */
export declare function releaseMarkers(root: HTMLElement): void;
/**
 * The anti-FOUC gate: keep a component root off the screen until its stylesheet is there.
 *
 * @param root - The root the builder is about to return (pre-mount, pre-paint).
 * @param specifier - The builder's declared `stylesheet` (`"./Table.css"`).
 * @param mockup - Optional factory returning this component's own silhouette.
 * @returns Nothing. The reveal happens later, from the loader promise.
 *
 * @example
 * holdUntilStyled(root, "./Table.css");                    // shimmer skin
 * holdUntilStyled(root, "./Table.css", () => this.loading()); // component mockup
 *
 * @summary One function, one question, one release trigger — no gate object and no
 *   per-instance "already loaded" flag. The question is asked per *sheet*
 *   ({@link isStylesheetPending}) because two components built in one pass own two
 *   sheets, so a flag cannot answer "is *my* CSS here". Release rides
 *   {@link ensureStylesheet}, which never rejects: a builder no registry ever sees still
 *   heals itself.
 *
 *   A mockup may also ask for a minimum on-screen time (`duration` on its spec, surfaced as
 *   `data-skeleton-duration`). That is a **floor**, joined with the sheet promise via
 *   `Promise.all`: a fast sheet no longer flashes a skeleton for one frame, and a slow one
 *   is still waited for — the marker never lifts before the CSS is in.
 */
export declare function holdUntilStyled(root: HTMLElement, specifier: string, mockup?: iMockupFactory | null): void;
//# sourceMappingURL=Hydration.d.ts.map