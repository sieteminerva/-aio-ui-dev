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
export declare const ELEMENT_KEYS: readonly ["@product"];
export type ProductElementType = (typeof ELEMENT_KEYS)[number];
export declare const DEFAULT_SELECTORS: iBuilderSelectorsConfig<ProductElementType>;
//# sourceMappingURL=Product.kit.d.ts.map