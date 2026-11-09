/**
 * ProductDetail — kit.
 *
 * key list, element-type union, default selectors.
 *
 * Not published: `index.ts` is the only entry and does not mention this file.
 */
import type { iBuilderSelectorsConfig } from "@aio-ui/core/interface";


export const ELEMENT_KEYS = [
  "@detail",
  "@detail>media",
  "@detail>media>image",
  "@detail>body",
  "@detail>body>eyebrow",
  "@detail>body>title",
  "@detail>body>desc",
  "@detail>body>price",
  "@detail>body>colors",
  "@detail>body>colors>item",
  "@detail>body>actions",
  "@detail>body>actions>back",
  "@detail>body>actions>checkout",
] as const;


export type ProductDetailElementType = (typeof ELEMENT_KEYS)[number];


export const DEFAULT_SELECTORS: iBuilderSelectorsConfig<ProductDetailElementType> = {
  "@detail": { tagName: "article", className: "product-detail" },
  "@detail>media": { tagName: "div", className: "product-detail-media" },
  "@detail>media>image": { tagName: "img", className: "product-detail-image" },
  "@detail>body": { tagName: "div", className: "product-detail-body" },
  "@detail>body>eyebrow": { tagName: "div", className: "product-detail-eyebrow" },
  "@detail>body>title": { tagName: "h2", className: "product-detail-title" },
  "@detail>body>desc": { tagName: "p", className: "product-detail-desc" },
  "@detail>body>price": { tagName: "div", className: "product-detail-price" },
  "@detail>body>colors": { tagName: "div", className: "product-detail-colors" },
  "@detail>body>colors>item": { tagName: "button", className: "product-detail-color" },
  "@detail>body>actions": { tagName: "div", className: "product-detail-actions" },
  "@detail>body>actions>back": { tagName: "button", className: "product-detail-back" },
  "@detail>body>actions>checkout": { tagName: "button", className: "button primary product-detail-checkout" },
};
