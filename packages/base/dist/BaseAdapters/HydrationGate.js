/**
 * 🧊 HYDRATION GATE — anti-FOUC freeze/release machinery.
 *
 * Extracted from `Builder` (Base.ts) so the builder class stays focused on
 * the lifecycle core. The gate works with ONE pointer per instance:
 *
 * • `applyHold(root)`   — called by `create()` pre-mount/pre-paint, and only when
 *   {@link isStylesheetPending} says this component's sheet is genuinely
 *   missing. Marks the top element only (`--is-loading: 1` inline +
 *   `data-hydrating` presence attr). Children inherit the custom property, so
 *   the whole subtree freezes from a single marker.
 * • `release(element?)` — the single writer of the release markers
 *   (`--is-loading: 0`, remove `data-hydrating`, set `data-loaded="true"`).
 *   The CSS rule `[data-loaded="true"] *` then permanently forces
 *   `--is-loading: 0` for every descendant — no observers/sweeps.
 * • `forceRelease()`    — escape hatch for exotic flows that bypass the seam.
 *
 * The hold is decided by the **stylesheet state**, never by a "this instance
 * already loaded once" flag: two components built in one pass own two sheets, so
 * a per-instance `isLoaded` cannot answer "is my CSS here". `isLoaded` is kept as
 * the registry-facing compatibility flag (it flips once a release happens).
 *
 * The reference is deliberately a single element (not a Set/Map): there is
 * only one top element per build, it is overwritten on the next build, and
 * it is GC'd together with the instance.
 */
export class HydrationGate {
    /** Gate flag: `false` while waiting for a lazy stylesheet, `true` when free. */
    isLoaded = true;
    /** The single top element currently being held (null when free). */
    #holdRoot = null;
    /**
     * ✍️ TRIPLE-WRITE RELEASE (the only marker-release writer):
     * 1. `--is-loading: 0`      → turn the state off (children inherit);
     * 2. remove `data-hydrating` → every shimmer rule vanishes instantly;
     * 3. set `data-loaded="true"` → PERMANENT pointer for descendants: the CSS
     *    rule `[data-loaded="true"] * { --is-loading: 0 !important }` forces
     *    any inherited/stale "1" markers in the subtree to 0 forever.
     */
    static releaseMarkers(target) {
        target.style.setProperty("--is-loading", "0");
        target.removeAttribute("data-hydrating");
        target.setAttribute("data-loaded", "true");
    }
    /**
     * 🧊 THE HOLD — called by `create()` right before the root is returned
     * (pre-mount, pre-paint ⇒ no FOUC possible). Only the top element is
     * marked. When the instance is re-created before releasing, the previous
     * generation's markers are released first so no stale element is stranded.
     *
     * Unconditional by design: the caller already asked the stylesheet seam
     * whether this component's sheet is missing. Gating here on `isLoaded` would
     * let a sheet that has never arrived look "ready" only because another
     * component's sheet did.
     */
    applyHold(root) {
        if (!(root instanceof HTMLElement))
            return root;
        // Previous generation (instance re-created before it could release):
        // just remove its markers — the isLoaded flag is untouched on this path.
        if (this.#holdRoot && this.#holdRoot !== root) {
            HydrationGate.releaseMarkers(this.#holdRoot);
        }
        root.style.setProperty("--is-loading", "1");
        root.setAttribute("data-hydrating", "");
        root.removeAttribute("data-loaded");
        this.#holdRoot = root;
        return root;
    }
    /**
     * 🔓 PUBLIC RELEASE — called by ComponentRegistry once the lazy stylesheet
     * settles (success or failure). Idempotent; also flips `isLoaded` so the
     * next build does not hold.
     */
    release(element) {
        const target = element ?? this.#holdRoot;
        if (target instanceof HTMLElement)
            HydrationGate.releaseMarkers(target);
        this.#holdRoot = null;
        this.isLoaded = true;
    }
    /** 🧯 Escape hatch — forced release for flows outside the registry. */
    forceRelease() {
        this.release();
    }
}
//# sourceMappingURL=HydrationGate.js.map