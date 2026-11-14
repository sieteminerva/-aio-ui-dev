/**
 * Builder instances pinned to the element they produced.
 *
 * The app replaces the whole tree on every render pass, so the previous page's
 * builders are detached without anyone telling them. Nothing was calling
 * `destroy()` — and a builder's timers, observers and global listeners outlive
 * its nodes (see `docs/framework/APP-LIFECYCLE.md`).
 *
 * `Builder.create()` pins itself on its own root; `releaseBuilders()` walks a
 * subtree, finds every pinned instance and destroys it once. That is the whole
 * mechanism: no registry side table, no per-route bookkeeping, and a nested
 * builder (a card inside a grid) is found because its root is a descendant.
 *
 * The key is a `Symbol.for`, not a local symbol: a dev graph and a built bundle
 * can both be loaded on one page, and the pin has to mean the same thing to both.
 */
export declare const BUILDER_INSTANCE: unique symbol;
/**
 * Pins a builder instance on the root element it returned.
 *
 * @param root - The root of the tree the builder created.
 * @param instance - The builder itself.
 * @returns Nothing.
 *
 * @summary Called by `Builder.create()` as it returns. The pin lives on the node, so it
 *   leaves with the node: an element collected by the GC cannot keep a builder alive.
 */
export declare function attachBuilder(root: HTMLElement | null | undefined, instance: unknown): void;
/**
 * Destroys every builder pinned inside a subtree that is about to be discarded.
 *
 * @param root - The subtree root (`AioApp`'s outgoing shell, a page's remembered shell).
 * @returns How many instances were destroyed.
 *
 * @example
 * releaseBuilders(app.root);   // before the next render replaces it
 *
 * @summary Each instance is unpinned *before* its `destroy()` runs, so a second sweep over
 *   the same tree — the page's `onDestroy` followed by the app's paint step — is a no-op
 *   instead of a double teardown. A builder that throws cannot stop the others: the error
 *   is reported and the sweep continues, because the alternative is leaking everything
 *   behind the first broken component.
 */
export declare function releaseBuilders(root: ParentNode | null | undefined): number;
//# sourceMappingURL=BuilderInstances.d.ts.map