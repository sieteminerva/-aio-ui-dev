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
export const SKELETON_DURATION_ATTRIBUTE = "data-skeleton-duration";

/**
 * Shape → class. Kept as a map so the DOM shape and the CSS shape cannot drift apart.
 *
 * @summary Bare words on purpose: the root always carries `.skeleton`, so the sheet can
 *   write `&.bone` (a compound) and the markup never needs a dash-joined name.
 */
const SHAPE_CLASS: Record<SkeletonShape, string> = {
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
  public static create(spec: iSkeletonSpec = {}): HTMLElement {
    const shape: SkeletonShape = spec.shape ?? "bone";
    const node = document.createElement("div");
    node.className = ["skeleton", SHAPE_CLASS[shape], spec.className?.trim()]
      .filter(Boolean)
      .join(" ");
    node.setAttribute("data-skeleton", shape);

    if (spec.width) node.style.width = spec.width;
    if (spec.height) node.style.height = spec.height;
    if (spec.aspect) node.style.aspectRatio = spec.aspect;
    if (spec.gap) node.style.gap = spec.gap;

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

export class SkeletonBuilder extends Builder<SkeletonElementType, iSkeletonConfig> {
  readonly builderId: keyof iBuilderRegistry = "skeleton";
  readonly name: keyof iBuilderRegistry = "skeleton";
  readonly stylesheet: string = "./Skeleton.css";
  public config: Required<iSkeletonConfig>;

  constructor(config: Partial<iSkeletonConfig> = {}) {
    super();

    this.config = this.resolveConfig({
      themeId: "default",
      namespace: null,
      emit: () => { },
      selectors: {},
      spec: {},
      duration: "2000ms",
      className: "",
    }, config);
  }

  public prepare(content: any): HTMLElement {
    const fromContent = content && typeof content === "object" ? content : {};
    return Skeleton.create({
      duration: this.config.duration,
      className: this.config.className,
      ...this.config.spec,
      ...fromContent,
    });
  }

  protected template(): void { }

  public initialize(): void { }
}
