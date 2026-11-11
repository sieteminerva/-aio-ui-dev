/**
 * Product — kit.
 *
 * The composed page has one node of its own: the wrapper the grid and the detail view
 * take turns inside. Everything else belongs to the two builders it composes, so there is
 * no key list to duplicate here.
 *
 * Not published: `index.ts` is the only entry and does not mention this file.
 */
import type { iBuilderSelectorsConfig } from "@aio-ui/core/interface";

export const ELEMENT_KEYS = ["@product"] as const;

export type ProductElementType = (typeof ELEMENT_KEYS)[number];

export const DEFAULT_SELECTORS: iBuilderSelectorsConfig<ProductElementType> = {
  "@product": { tagName: "div", className: "product" },
};
