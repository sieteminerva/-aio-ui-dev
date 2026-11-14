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

import { ensureStylesheet, isStylesheetPending } from "@aio-ui/core";

/**
 * Builds the mockup a builder wants shown while its sheet is missing.
 *
 * @returns The mockup root, or `null`/`undefined` to fall back to the shimmer skin.
 *
 * @summary Called at most once per held `create()`, and only when the sheet is genuinely
 *   pending, so a component with a warm sheet never pays for its skeleton.
 */
export type iMockupFactory = () => HTMLElement | null | undefined;

/** Whether the current runtime can be styled at all (SSR and some test hosts cannot). */
function hasDom(): boolean {
  return typeof document !== "undefined" && typeof HTMLElement !== "undefined";
}

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
export function releaseMarkers(root: HTMLElement): void {
  root.style.setProperty("--is-loading", "0");
  root.removeAttribute("data-hydrating");
  root.setAttribute("data-loaded", "true");
}

/**
 * Marks the root for the generic shimmer skin: no mockup, no DOM surgery.
 *
 * @param root - The element the builder is about to return.
 * @returns A no-op restore function, so both hold shapes share one release path.
 */
function markShimmerHold(root: HTMLElement): () => void {
  root.style.setProperty("--is-loading", "1");
  root.setAttribute("data-hydrating", "");
  root.removeAttribute("data-loaded");
  return () => undefined;
}

/**
 * Prepends a mockup and hides the real children it replaces.
 *
 * @param root - The element the builder is about to return.
 * @param mockup - What `loading()` produced.
 * @returns The restore function: drop the mockup, unhide the children, forget the markers.
 *
 * @summary The real children stay in the tree (a `DocumentFragment` parking lot would
 *   detach the builders nested inside them, and a teardown sweep walks the tree), so the
 *   hide is `display: none` on each *direct* child — a handful of writes, restored from
 *   the value each child had. `data-hydrating` is deliberately not set: the shimmer must
 *   not paint over a component that is already showing its own silhouette.
 */
function mountMockup(root: HTMLElement, mockup: HTMLElement): () => void {
  const hidden: Array<{ element: HTMLElement; display: string }> = [];
  for (const child of Array.from(root.children)) {
    if (child === mockup) continue;
    const element = child as HTMLElement;
    hidden.push({ element, display: element.style.display });
    element.style.display = "none";
  }

  mockup.setAttribute("aria-hidden", "true");
  root.prepend(mockup);
  root.setAttribute("data-mockup", "");
  root.setAttribute("aria-busy", "true");
  root.style.setProperty("--is-loading", "1");
  root.removeAttribute("data-loaded");

  return () => {
    mockup.remove();
    root.removeAttribute("data-mockup");
    root.removeAttribute("aria-busy");
    for (const { element, display } of hidden) element.style.display = display;
  };
}

/**
 * Runs a builder's `loading()` without letting it break `create()`.
 *
 * @param factory - The builder's mockup factory, or `null` when it has none.
 * @returns A usable element, or `null` to fall back to the shimmer skin.
 *
 * @summary A mockup is decoration: a throw, or a subclass that forgot to return an
 *   element, must degrade to the generic skin rather than leave `create()` without a root.
 */
function buildMockup(factory: iMockupFactory | null | undefined): HTMLElement | null {
  if (typeof factory !== "function") return null;
  try {
    const mockup = factory();
    return mockup instanceof HTMLElement ? mockup : null;
  } catch (error) {
    console.warn("[hydration] loading() threw — falling back to the shimmer hold:", error);
    return null;
  }
}

/**
 * Reads the visibility floor a mockup asked for.
 *
 * @param mockup - The element `loading()` returned.
 * @returns Milliseconds the mockup must stay mounted, or `0` for "release when the sheet does".
 *
 * @summary The skeleton owns the config (`duration: number | "auto"`) and writes a number
 *   as `data-skeleton-duration`; `"auto"` writes nothing. Reading it off the element keeps
 *   `iMockupFactory` a plain thunk — a builder never has to know the hold exists.
 */
function mockupFloor(mockup: HTMLElement): number {
  const value = Number(mockup.getAttribute("data-skeleton-duration"));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

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
export function holdUntilStyled(
  root: HTMLElement,
  specifier: string,
  mockup?: iMockupFactory | null,
): void {
  if (!hasDom() || !(root instanceof HTMLElement)) return;

  if (!isStylesheetPending(specifier)) {
    // Already styled, or the host serves no sheet for it: nothing to wait for.
    releaseMarkers(root);
    return;
  }

  const skeleton = buildMockup(mockup);
  const restore = skeleton ? mountMockup(root, skeleton) : markShimmerHold(root);
  const floor = skeleton ? mockupFloor(skeleton) : 0;
  const minimum = floor > 0
    ? new Promise<void>((resolve) => {
      setTimeout(resolve, floor);
    })
    : Promise.resolve();
  void Promise.all([ensureStylesheet(specifier), minimum]).then(() => {
    restore();
    releaseMarkers(root);
  });
}
