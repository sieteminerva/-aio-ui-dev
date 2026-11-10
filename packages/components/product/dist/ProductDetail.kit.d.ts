/**
 * ProductDetail — kit.
 *
 * key list, element-type union, default selectors.
 *
 * Not published: `index.ts` is the only entry and does not mention this file.
 */
import type { iBuilderSelectorsConfig } from "@aio-ui/core/interface";
export declare const ELEMENT_KEYS: readonly ["@detail", "@detail>media", "@detail>media>image", "@detail>body", "@detail>body>eyebrow", "@detail>body>title", "@detail>body>desc", "@detail>body>price", "@detail>body>colors", "@detail>body>colors>item", "@detail>body>actions", "@detail>body>actions>back", "@detail>body>actions>checkout"];
export type ProductDetailElementType = (typeof ELEMENT_KEYS)[number];
export declare const DEFAULT_SELECTORS: iBuilderSelectorsConfig<ProductDetailElementType>;
//# sourceMappingURL=ProductDetail.kit.d.ts.map