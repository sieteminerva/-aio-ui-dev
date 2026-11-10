/**
 * Convert Number to text 1-16 only refers to semantic-ui el wide
 * @param {number} number
 * @returns {string}
 */
export declare function numberToText(number: number): string | undefined;
/**
 * Configuration options for a table cell
 */
export interface TableCellOptions {
    rowSpan?: number;
    colSpan?: number;
    color?: string;
    wide?: number | string;
    textAlign?: "left" | "center" | "right";
    verticalAlign?: "top" | "center" | "bottom";
    format?: "number" | "text" | "currency" | "status" | "image" | "date";
    currency?: string;
    locale?: string;
    prefix?: string;
    suffix?: string;
    formula?: string | ((cells: TableCellModel[], ci: number) => any);
    contentEditable?: boolean;
    spellcheck?: boolean;
    class?: string;
    header?: string;
}
/**
 * Raw cell data structure
 */
export interface TableCellData {
    text?: string | number | HTMLElement | null;
    options?: TableCellOptions;
    group?: string;
    subrowOfUid?: string;
    _uid?: string;
    subrowOf?: string;
}
/**
 * Cell value type
 */
export type TableCellValue = string | number | TableCellData | HTMLElement | null;
/**
 * Table cell model (internal representation)
 */
export interface TableCellModel {
    key: string;
    value: any;
    options: TableCellOptions;
    header?: string;
    text?: string;
    isGroup?: boolean;
    groupItems?: TableCellModel[];
}
/**
 * Row options
 */
export interface TableRowOptions {
    rowSpan?: number;
    disableEditing?: boolean;
    id?: string;
    class?: string;
}
/**
 * Row model (internal representation)
 */
export interface TableRowModel {
    rowIndex?: number;
    autoNumber?: number;
    cells: TableCellModel[];
    parentUid?: string;
    uid?: string;
    options?: TableRowOptions;
    _uid?: string;
    subrowOfUid?: string;
    data?: TableCellModel[];
}
/**
 * Footer options
 */
export interface TableFooterOptions {
    renderTotal?: any[] | null;
    formula?: string | ((cells: TableCellModel[], ci: number) => any);
    rowspan?: number;
    colspan?: number;
    color?: string;
    wide?: number | string;
    textAlign?: "left" | "center" | "right";
    verticalAlign?: "top" | "center" | "bottom";
    format?: "number" | "text" | "currency" | "status" | "image" | "date";
    currency?: string;
    locale?: string;
    prefix?: string;
    suffix?: string;
}
/**
 * Table configuration
 */
export interface TableConfig {
    size?: "small" | "large" | "compact" | "very compact" | null;
    type?: "basic" | "collapsing" | "striped" | "inverted" | "fixed" | "padded" | "celled" | null;
    color?: string | null;
    textAlign?: "center" | "left" | "right" | null;
    sortable?: boolean;
    selectable?: boolean;
    scrolling?: boolean;
    editable?: boolean | string;
    autoNumbering?: boolean | string;
    pageSize?: number | null;
    disableSubRow?: boolean;
    headerOptions?: TableCellOptions;
    bodyOptions?: TableCellOptions[];
    footerOptions?: TableFooterOptions;
    footer?: string | HTMLElement | TableCellData[] | null;
    className?: string;
    verticalAlign?: "top" | "center" | "bottom";
}
/**
 * Table data structure
 */
export interface TableData {
    header?: (string | number | TableCellData)[];
    body?: (string | number | TableCellData)[];
    footer?: string | HTMLElement | TableCellData[] | null;
}
/**
 * DOM Model structure
 */
export interface DOMModel {
    header: TableRowModel[];
    body: TableRowModel[];
    footer: TableRowModel[];
}
/**
 * Change event detail
 */
export interface ChangeEventDetail {
    type: "add" | "remove" | "edit" | "insert" | "page" | "sort" | "subrow";
    rowIndex?: number;
    globalIndex?: number;
    parentIndex?: number;
    page?: number;
}
/**
 * Normalized cell structure
 */
interface NormalizedCell {
    text: TableCellValue;
    options: TableCellOptions;
}
/**
 * Applies custom CSS classes to a given HTML table element based on the provided configuration.
 */
export declare function __applyTableClasses(table: HTMLTableElement, config: TableConfig): void;
/**
 * Normalizes a cell value into a standard structure.
 */
export declare function __normalizeCell(cell: TableCellValue): NormalizedCell;
/**
 * Apply options (styling + formatting) to a table cell.
 */
export declare function __applyCellOptions(el: HTMLTableCellElement, options?: TableCellOptions, rawValue?: any): HTMLTableCellElement;
/**
 * Apply formula on load time.
 */
export declare function __applyFormula(data: {
    header: any[];
    body: any[][];
}, config: TableConfig): {
    header: any[];
    body: any[][];
};
/**
 * Calculate a single cell value based on formula.
 */
export declare function __calculateRow(headers: any[], rowData: any[], colIndex: number, formula: string): any;
/**
 * Applies a mathematical formula to a cell, calculating its value based on other cell values.
 */
export declare function __applyRowFormula(cells: TableCellModel[], ci: number, formula: string | ((cells: TableCellModel[], ci: number) => any)): any;
/**
 * Find header column index by given title
 */
export declare function __findColIndexByHeader(headers: any[], title: string): number;
/**
 * Convert edited text back into the correct typed value based on format/type.
 */
export declare function __parseValue(text: any, type?: string): any;
/**
 * Convert raw value into a display string (or element) based on options.format.
 */
export declare function __formatValue(rawValue: any, options?: TableCellOptions): string | HTMLElement;
export declare function __getRowData(row: TableRowModel | any[]): any[];
/**
 * Count visible subrows for a parent UID inside the current page slice.
 */
export declare function __countVisibleSubRowsByUid(body: TableRowModel[], parentUid: string, { pageSize, currentPage, start, end }: {
    pageSize?: number;
    currentPage?: number;
    start?: number | null;
    end?: number | null;
}): number;
/**
 * Count all subrows for a parent UID (whole dataset)
 */
export declare function __countAllSubRowsByParentUid(body: TableRowModel[], parentUid: string): number;
export declare function __computeRowTotalValue(body: TableRowModel[], parentIndex: number, formulaIndex: number): number | null;
export declare function __getHeaderGroupNames(arr: any[], propertyName: string): string[];
/**
 * Fluent builder for creating table cell model objects.
 */
export declare function tcell(key: string): {
    header: (v: string) => any;
    value: (v: any) => any;
    rowspan: (n: number) => any;
    colspan: (n: number) => any;
    wide: (n: number | string) => any;
    align: (pos: "left" | "center" | "right") => any;
    valign: (pos: "top" | "center" | "bottom") => any;
    format: (f: TableCellOptions["format"]) => any;
    prefix: (p: string) => any;
    suffix: (s: string) => any;
    locale: (l: string) => any;
    currency: (c: string) => any;
    editable: (flag?: boolean) => any;
    spellcheck: (flag?: boolean) => any;
    class: (c: string) => any;
    color: (c: string) => any;
    option: (key: string, value: any) => any;
    options: (opts: TableCellOptions) => any;
    create: () => TableCellModel;
};
/**
 * Bind sort listener to header cells
 */
export declare function __bindSortListener(th: HTMLTableCellElement, colIndex: number, onSort: (colIndex: number, isAscending: boolean) => void): void;
export {};
//# sourceMappingURL=Table.helper.d.ts.map