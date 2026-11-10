/**
 * 🧊 HYDRATION GATE — anti-FOUC freeze/release machinery.
 *
 * Extracted from `Builder` (Base.ts) so the builder class stays focused on
 * the lifecycle core. The gate works with ONE pointer per instance:
 *
 * • `applyHold(root)`   — called by `create()` pre-mount/pre-paint; marks the
 *   top element only (`--is-loading: 1` inline + `data-hydrating` presence
 *   attr). Children inherit the custom property, so the whole subtree freezes
 *   from a single marker.
 * • `release(element?)` — the single writer of the release markers
 *   (`--is-loading: 0`, remove `data-hydrating`, set `data-loaded="true"`).
 *   The CSS rule `[data-loaded="true"] *` then permanently forces
 *   `--is-loading: 0` for every descendant — no observers/sweeps.
 * • `forceRelease()`    — escape hatch for exotic flows that bypass the
 *   ComponentRegistry.
 *
 * The reference is deliberately a single element (not a Set/Map): there is
 * only one top element per build, it is overwritten on the next build, and
 * it is GC'd together with the instance.
 */
export declare class HydrationGate {
    #private;
    /** Gate flag: `false` while waiting for a lazy stylesheet, `true` when free. */
    isLoaded: boolean;
    /**
     * ✍️ TRIPLE-WRITE RELEASE (the only marker-release writer):
     * 1. `--is-loading: 0`      → turn the state off (children inherit);
     * 2. remove `data-hydrating` → every shimmer rule vanishes instantly;
     * 3. set `data-loaded="true"` → PERMANENT pointer for descendants: the CSS
     *    rule `[data-loaded="true"] * { --is-loading: 0 !important }` forces
     *    any inherited/stale "1" markers in the subtree to 0 forever.
     */
    static releaseMarkers(target: HTMLElement): void;
    /**
     * 🧊 THE HOLD — called by `create()` right before the root is returned
     * (pre-mount, pre-paint ⇒ no FOUC possible). Only the top element is
     * marked. When the instance is re-created before releasing, the previous
     * generation's markers are released first so no stale element is stranded.
     */
    applyHold(root: HTMLElement): HTMLElement;
    /**
     * 🔓 PUBLIC RELEASE — called by ComponentRegistry once the lazy stylesheet
     * settles (success or failure). Idempotent; also flips `isLoaded` so the
     * next build does not hold.
     */
    release(element?: HTMLElement | null): void;
    /** 🧯 Escape hatch — forced release for flows outside the registry. */
    forceRelease(): void;
}
//# sourceMappingURL=HydrationGate.d.ts.map