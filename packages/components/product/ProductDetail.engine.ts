/**
 * ProductDetail — engine.
 *
 * `normalizeProduct`, `imageOf`, `formatPrice` — record shape and fallbacks.
 *
 * Not published: `index.ts` is the only entry and does not mention this file.
 */
import type { iProductColor, iProductRecord } from "./ProductDetail";

/** One record, accepting the `artwork.src` shape from the Sheets data as well as `imageUrl`. */
export function normalizeProduct(data: any): iProductRecord {
  const record = data?.content ?? data;
  return record && typeof record === "object" ? record : {};
}


/** The image of a record: per-colour artwork wins, then the product artwork. */
export function imageOf(record: iProductRecord, color?: iProductColor): string {
  return (
    color?.imageUrl ??
    color?.src ??
    record.artwork?.src ??
    record.imageUrl ??
    record.image ??
    record.src ??
    ""
  );
}


/** `85000` → `Rp 85.000`; a string is passed through untouched. */
export function formatPrice(value: number | string | undefined, currency = "Rp"): string {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "string") return value;
  return `${currency} ${value.toLocaleString("id-ID")}`;
}
