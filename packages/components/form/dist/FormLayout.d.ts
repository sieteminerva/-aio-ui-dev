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
export declare const DEFAULT_ROW_COLUMNS = 2;
/** Upper bound, so a value from a spreadsheet cannot produce a 200-column grid. */
export declare const MAX_ROW_COLUMNS = 16;
/** A child of a row: a field, a nested row, or a fieldset group. */
export type iFormRowChild = Record<string, any> | HTMLElement | string;
/**
 * A row container.
 *
 * `column` is the **count of columns**; a child's width comes from `wide` (`50` → half,
 * `"auto"` → full row) or from an explicit `span`.
 */
export interface iFormRowNode {
    /** Column count. Defaults to {@link DEFAULT_ROW_COLUMNS}. */
    column?: number;
    /** Children, in order. They wrap automatically when they do not fit. */
    row: iFormRowChild[];
    /** Heading, rendered as `.title` spanning every column. */
    label?: string;
    /** Optional note, rendered as `.desc` spanning every column. */
    description?: string;
    id?: string;
    className?: string;
    /** Width of this row inside a parent row: percentage, fraction, or `"auto"`. */
    wide?: number | string | null;
    /** Explicit column span, wins over `wide`. */
    span?: number;
    /** Cascade condition, same shape as a group's. */
    condition?: unknown;
}
/**
 * Clamps the column count into a usable range.
 *
 * @param value - `column` from the schema; anything non-numeric falls back to the default.
 * @returns Integer between 1 and {@link MAX_ROW_COLUMNS}.
 */
export declare function columnsOf(value: unknown): number;
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
export declare function spanOf(wide: unknown, columns: number): number;
/**
 * Applies a span to a child element.
 *
 * `data-span` is the human/debug marker; `--span` carries the number, because CSS cannot
 * read an attribute inside `grid-column: span …`.
 *
 * @param element - Child element of a row container.
 * @param span - Column span, already clamped by {@link spanOf}.
 */
export declare function applyRowSpan(element: HTMLElement, span: number): void;
/**
 * Declares the grid of a row container.
 *
 * @param element - Row container.
 * @param columns - Column count, already clamped by {@link columnsOf}.
 */
export declare function applyRowColumns(element: HTMLElement, columns: number): void;
/**
 * Resolves the span a row child asked for, explicit `span` first, then `wide`.
 *
 * @param child - Row child node.
 * @param columns - Column count of the parent row.
 * @returns Span between 1 and `columns`.
 */
export declare function childSpanOf(child: unknown, columns: number): number;
//# sourceMappingURL=FormLayout.d.ts.map