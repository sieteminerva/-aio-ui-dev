/**
 * Builder instances pinned to the element they produced.
 *
 * The app replaces the whole tree on every render pass, so the previous page's
 * builders are detached without anyone telling them. Nothing was calling
 * `destroy()` — and a builder's timers, observers and global listeners outlive
 * its nodes (see `docs/framework/APP-LIFECYCLE.md`).
 *
 * `ComponentRegistry.build()` pins the instance it just created on the element it
 * returns; `releaseBuilders()` walks a subtree, finds every pinned instance and
 * destroys it once. That is the whole mechanism: no per-route bookkeeping, and a
 * nested builder (a card inside a grid) is found because its root is a descendant.
 *
 * Registry-only on purpose. A builder created directly (a table inside a form field,
 * a component in a test) has no owner that would ever sweep it, so pinning there
 * would only write a symbol nobody reads — the mechanism exists because *the app*
 * replaces whole trees.
 *
 * The key is a `Symbol.for`, not a local symbol: a dev graph and a built bundle
 * can both be loaded on one page, and the pin has to mean the same thing to both.
 */
export const BUILDER_INSTANCE = Symbol.for("aio-ui.builder-instance");
/**
 * Pins a builder instance on the root element it returned.
 *
 * @param root - The root of the tree the builder created.
 * @param instance - The builder itself.
 * @returns Nothing.
 *
 * @summary Called by `ComponentRegistry.build()`, the only owner that ever sweeps a
 *   subtree. The pin lives on the node, so it leaves with the node: an element collected
 *   by the GC cannot keep a builder alive.
 */
export function attachBuilder(root, instance) {
    if (!root || !instance || typeof root !== "object")
        return;
    root[BUILDER_INSTANCE] = instance;
}
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
export function releaseBuilders(root) {
    if (!root || typeof root.querySelectorAll !== "function")
        return 0;
    const elements = [root, ...root.querySelectorAll("*")];
    const released = new Set();
    for (const element of elements) {
        const record = element;
        const instance = record[BUILDER_INSTANCE];
        if (!instance || released.has(instance))
            continue;
        delete record[BUILDER_INSTANCE];
        released.add(instance);
        try {
            instance.destroy?.();
        }
        catch (error) {
            console.error("[builders] destroy failed:", error);
        }
    }
    return released.size;
}
//# sourceMappingURL=BuilderInstances.js.map