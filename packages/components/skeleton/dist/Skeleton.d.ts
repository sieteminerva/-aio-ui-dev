/**
 * Skeleton — the mandatory placeholder primitive.
 *
 * A builder that implements `loading()` has to show *something* while its own stylesheet
 * is still on its way, and that something cannot be styled by the sheet it is standing in
 * for. So the silhouette is a component of its own, loaded with the app shell (like a
 * design system's `<Skeleton>`): its sheet is always present, which is what makes a
 * precise mockup possible at the exact moment the real sheet is missing.
 *
 * Two doors, one DOM builder:
 *
 * - {@link Skeleton.create} — a pure factory. This is what `loading()` uses: no lifecycle,
 *   no node records, no payload loop. A mockup is a picture, and a picture must not cost a
 *   render pass.
 * - {@link SkeletonBuilder} — the registry face, so a page manifest can declare
 *   `"skeleton"` like any other component.
 *
 * Precision comes from the *spec*, not from the skin: shapes, sizes, aspect ratios and
 * counts are declared per real component (`ProductCard` mirrors its display/swatches/
 * caption/button rhythm, `Table` mirrors its header and row height).
 */
import type { iBuilderConfig, iBuilderRegistry } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base";
/** The shapes the sheet knows how to skin. */
export type SkeletonShape = "stack" | "row" | "line" | "bone" | "circle";
/** One node of a mockup. Everything is optional except the shape you care about. */
export interface iSkeletonSpec {
    /** Layout of this node. Defaults to `"bone"`. */
    shape?: SkeletonShape;
    /** Any CSS length — this is the geometry the real component would have had. */
    width?: string;
    /** Any CSS length. A bone without a height keeps the sheet's minimum. */
    height?: string;
    /** CSS `aspect-ratio` (`"1 / 1"`), for media boxes that reserve their own space. */
    aspect?: string;
    /** `gap` between children, for `stack` and `row`. */
    gap?: string;
    /** Repeat this node N times (text lines, placeholder rows). */
    count?: number;
    /** Children, laid out by `stack` (column) or `row`. */
    children?: iSkeletonSpec[];
    /**
     * How long this mockup stays on screen, in milliseconds.
     *
     * - `"auto"` (default) — the lifetime belongs to the hold: the mockup disappears the
     *   moment the component's own sheet settles. This is the real load time, never a guess.
     * - `number` — a **floor**, not a timer: the mockup is guaranteed to be visible at least
     *   this long (a fast sheet otherwise produces a flash of skeleton), and it still waits
     *   for a slow one. The hold reads it from `data-skeleton-duration`; the skeleton itself
     *   never hides anything.
     */
    duration?: number | "auto";
    /**
     * Extra class (or classes) for the mockup root — the host's own skin or animation.
     *
     * @summary Root only, never cloned onto the children: a caller that wants a different
     *   motion writes one rule against its own class. Nothing in this package reads it.
     */
    className?: string;
}
/** The attribute the hold reads its visibility floor from. */
export declare const SKELETON_DURATION_ATTRIBUTE = "data-skeleton-duration";
export declare class Skeleton {
    /**
     * Builds one mockup subtree.
     *
     * @param spec - The silhouette: shapes, sizes and repetition.
     * @returns The mockup root element.
     *
     * @example
     * Skeleton.create({
     *   shape: "stack",
     *   children: [
     *     { shape: "bone", aspect: "1 / 1" },
     *     { shape: "line", width: "62%" },
     *     { shape: "line", width: "88%", count: 2 },
     *   ],
     * });
     *
     * @summary Direct `document.createElement` on purpose: no `render()`, no node records,
     *   no identity namespace. The caller (`Builder.create()`) hides the real tree and drops
     *   this one the moment the sheet lands, so tracking it would be pure waste.
     */
    static create(spec?: iSkeletonSpec): HTMLElement;
}
/** The registry token a manifest writes when it wants a placeholder. */
export type SkeletonElementType = "@skeleton";
export interface iSkeletonConfig extends iBuilderConfig<SkeletonElementType> {
    /** The silhouette this component should draw. */
    spec: iSkeletonSpec;
    /** Default lifetime for every mockup this component draws (`"auto"` = until the sheet). */
    duration: number | "auto";
    /** Extra class(es) the host wants on the mockup root. */
    className: string;
}
export declare class SkeletonBuilder extends Builder<SkeletonElementType, iSkeletonConfig> {
    readonly builderId: keyof iBuilderRegistry;
    readonly name: keyof iBuilderRegistry;
    readonly stylesheet: string;
    config: Required<iSkeletonConfig>;
    constructor(config?: Partial<iSkeletonConfig>);
    prepare(content: any): HTMLElement;
    protected template(): void;
    initialize(): void;
}
//# sourceMappingURL=Skeleton.d.ts.map