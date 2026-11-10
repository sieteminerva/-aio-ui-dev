/**
 * ProductDetail — engine.
 *
 * `normalizeProduct`, `imageOf`, `formatPrice` — record shape and fallbacks.
 *
 * Not published: `index.ts` is the only entry and does not mention this file.
 */
import type { iProductColor, iProductRecord } from "./ProductDetail";
/** One record, accepting the `artwork.src` shape from the Sheets data as well as `imageUrl`. */
export declare function normalizeProduct(data: any): iProductRecord;
/** The image of a record: per-colour artwork wins, then the product artwork. */
export declare function imageOf(record: iProductRecord, color?: iProductColor): string;
/** `85000` → `Rp 85.000`; a string is passed through untouched. */
export declare function formatPrice(value: number | string | undefined, currency?: string): string;
//# sourceMappingURL=ProductDetail.engine.d.ts.map