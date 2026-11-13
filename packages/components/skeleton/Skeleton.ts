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
}

/** Shape → class. Kept as a map so the DOM shape and the CSS shape cannot drift apart. */
const SHAPE_CLASS: Record<SkeletonShape, string> = {
  stack: "skeleton-stack",
  row: "skeleton-row",
  line: "skeleton-line",
  bone: "skeleton-bone",
  circle: "skeleton-circle",
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
    node.className = `skeleton ${SHAPE_CLASS[shape]}`;
    node.setAttribute("data-skeleton", shape);

    if (spec.width) node.style.width = spec.width;
    if (spec.height) node.style.height = spec.height;
    if (spec.aspect) node.style.aspectRatio = spec.aspect;
    if (spec.gap) node.style.gap = spec.gap;

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
    }, config);
  }

  public prepare(content: any): HTMLElement {
    const fromContent = content && typeof content === "object" ? content : {};
    return Skeleton.create({ ...this.config.spec, ...fromContent });
  }

  protected template(): void { }

  public initialize(): void { }
}
