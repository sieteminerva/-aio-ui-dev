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
import { Builder } from "@aio-ui/base";
/** The attribute the hold reads its visibility floor from. */
export const SKELETON_DURATION_ATTRIBUTE = "data-skeleton-duration";
/**
 * Shape → class. Kept as a map so the DOM shape and the CSS shape cannot drift apart.
 *
 * @summary Bare words on purpose: the root always carries `.skeleton`, so the sheet can
 *   write `&.bone` (a compound) and the markup never needs a dash-joined name.
 */
const SHAPE_CLASS = {
    stack: "stack",
    row: "row",
    line: "line",
    bone: "bone",
    circle: "circle",
};
export class Skeleton {
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
    static create(spec = {}) {
        const shape = spec.shape ?? "bone";
        const node = document.createElement("div");
        node.className = ["skeleton", SHAPE_CLASS[shape], spec.className?.trim()]
            .filter(Boolean)
            .join(" ");
        node.setAttribute("data-skeleton", shape);
        if (spec.width)
            node.style.width = spec.width;
        if (spec.height)
            node.style.height = spec.height;
        if (spec.aspect)
            node.style.aspectRatio = spec.aspect;
        if (spec.gap)
            node.style.gap = spec.gap;
        // "auto" writes nothing: the hold already releases on the sheet, which *is* the real
        // load time. A number is a floor the hold has to honour, so it travels as an attribute
        // rather than as a timer this factory would have to own.
        if (typeof spec.duration === "number" && Number.isFinite(spec.duration) && spec.duration > 0) {
            node.setAttribute(SKELETON_DURATION_ATTRIBUTE, String(Math.round(spec.duration)));
        }
        for (const child of spec.children ?? []) {
            const count = Math.max(1, child.count ?? 1);
            for (let index = 0; index < count; index += 1) {
                node.appendChild(Skeleton.create({ ...child, count: 1 }));
            }
        }
        return node;
    }
}
export class SkeletonBuilder extends Builder {
    builderId = "skeleton";
    name = "skeleton";
    stylesheet = "./Skeleton.css";
    config;
    constructor(config = {}) {
        super();
        this.config = this.resolveConfig({
            themeId: "default",
            namespace: null,
            emit: () => { },
            selectors: {},
            spec: {},
            // A floor, not a timer: `"auto"` releases on the sheet, and a warm sheet settles in one
            // microtask, so the placeholder would never be seen. 2000 is the shipped floor.
            duration: 2000,
            className: "",
        }, config);
    }
    prepare(content) {
        const fromContent = content && typeof content === "object" ? content : {};
        return Skeleton.create({
            duration: this.config.duration,
            className: this.config.className,
            ...this.config.spec,
            ...fromContent,
        });
    }
    template() { }
    initialize() { }
}
//# sourceMappingURL=Skeleton.js.map