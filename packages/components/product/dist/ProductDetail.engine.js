/** One record, accepting the `artwork.src` shape from the Sheets data as well as `imageUrl`. */
export function normalizeProduct(data) {
    const record = data?.content ?? data;
    return record && typeof record === "object" ? record : {};
}
/** The image of a record: per-colour artwork wins, then the product artwork. */
export function imageOf(record, color) {
    return (color?.imageUrl ??
        color?.src ??
        record.artwork?.src ??
        record.imageUrl ??
        record.image ??
        record.src ??
        "");
}
/** `85000` → `Rp 85.000`; a string is passed through untouched. */
export function formatPrice(value, currency = "Rp") {
    if (value === undefined || value === null || value === "")
        return "";
    if (typeof value === "string")
        return value;
    return `${currency} ${value.toLocaleString("id-ID")}`;
}
//# sourceMappingURL=ProductDetail.engine.js.map