/**
 * Row layout — the schema side of an inline field group.
 *
 * A row is a **layout container**, not a fieldset: it holds fields (and nested rows) in a
 * CSS grid. `group` stays reserved for `<fieldset>` + `<legend>` semantics, so neither
 * word is overloaded.
 *
 * ```ts
 * { label: "Identitas", column: 2, row: [
 *     { type: "text", id: "first", title: "Nama depan", config: { wide: 50 } },
 *     { type: "text", id: "last",  title: "Nama belakang", config: { wide: 50 } },
 *     { type: "textarea", id: "street", title: "Alamat", config: { wide: "auto" } },
 * ] }
 * ```
 *
 * The numbers here are pure: `columnsOf` and `spanOf` decide the grid, the caller writes
 * the attributes. That keeps the arithmetic testable without a DOM.
 */
/** Column count used when a row does not say. */
export const DEFAULT_ROW_COLUMNS = 2;
/** Upper bound, so a value from a spreadsheet cannot produce a 200-column grid. */
export const MAX_ROW_COLUMNS = 16;
/**
 * Clamps the column count into a usable range.
 *
 * @param value - `column` from the schema; anything non-numeric falls back to the default.
 * @returns Integer between 1 and {@link MAX_ROW_COLUMNS}.
 */
export function columnsOf(value) {
    if (value === undefined || value === null || value === "")
        return DEFAULT_ROW_COLUMNS;
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numeric))
        return DEFAULT_ROW_COLUMNS;
    return Math.min(MAX_ROW_COLUMNS, Math.max(1, Math.round(numeric)));
}
/**
 * Turns a `wide` hint into a column span.
 *
 * Three spellings are accepted, because a schema read from a sheet writes whatever the
 * author typed:
 *
 * - `"auto"` → the whole row (a textarea or an address line wants the full width);
 * - `0 < n ≤ 1` → fraction of the row (`0.5` = half);
 * - anything else numeric → percentage (`50` = half, `33` = a third).
 *
 * @param wide - Width hint from `config.wide` (or the node's own `wide`).
 * @param columns - Column count of the row this child lives in.
 * @returns Span between 1 and `columns`.
 */
export function spanOf(wide, columns) {
    const total = Math.max(1, Math.round(columns));
    if (wide === "auto" || wide === "full")
        return total;
    const numeric = typeof wide === "number" ? wide : Number(wide);
    if (!Number.isFinite(numeric) || numeric <= 0)
        return 1;
    const ratio = numeric <= 1 ? numeric : numeric / 100;
    return Math.min(total, Math.max(1, Math.round(ratio * total)));
}
/**
 * Applies a span to a child element.
 *
 * `data-span` is the human/debug marker; `--span` carries the number, because CSS cannot
 * read an attribute inside `grid-column: span …`.
 *
 * @param element - Child element of a row container.
 * @param span - Column span, already clamped by {@link spanOf}.
 */
export function applyRowSpan(element, span) {
    element.dataset.span = String(span);
    element.style.setProperty("--span", String(span));
}
/**
 * Declares the grid of a row container.
 *
 * @param element - Row container.
 * @param columns - Column count, already clamped by {@link columnsOf}.
 */
export function applyRowColumns(element, columns) {
    element.dataset.column = String(columns);
    element.style.setProperty("--items", String(columns));
}
/**
 * Resolves the span a row child asked for, explicit `span` first, then `wide`.
 *
 * @param child - Row child node.
 * @param columns - Column count of the parent row.
 * @returns Span between 1 and `columns`.
 */
export function childSpanOf(child, columns) {
    if (!child || typeof child !== "object")
        return 1;
    const node = child;
    if (node.span !== undefined)
        return Math.min(columns, Math.max(1, Math.round(Number(node.span) || 1)));
    return spanOf(node.config?.wide ?? node.wide, columns);
}
//# sourceMappingURL=FormLayout.js.map