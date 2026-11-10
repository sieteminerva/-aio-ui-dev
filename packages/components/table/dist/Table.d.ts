import type { iElementProperty, iBuilderConfig, iBuilderRegistry } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base";
import { type TableCellData, type TableCellOptions, type TableFooterOptions } from "./Table.helper";
/**
 * Table element type keys for the builder's selector system.
 * These correspond to the structural parts of a table component.
 */
export type TableElementType = "@container" | "@table" | "@table>thead" | "@table>tbody" | "@table>tfoot" | "@table>tfoot>pagination" | "@table>tfoot>pagination>item" | "@table>tfoot>pagination>prev" | "@table>tfoot>pagination>next" | "@table>tfoot>add-row" | "@table>trow" | "@table>trow>th" | "@table>trow>cell" | "@table>trow>total" | "@table>tbody>actions" | "@table>tbody>actions>edit" | "@table>tbody>actions>remove" | "@table>tbody>actions>add" | "@table>icon";
/**
 * Configuration interface for the Table builder.
 * Extends the base builder configuration with table-specific options.
 */
export interface iTableConfig extends iBuilderConfig<TableElementType> {
    container?: string | HTMLElement | null;
    size?: "small" | "large" | "compact" | "very compact" | null;
    type?: "basic" | "collapsing" | "striped" | "inverted" | "fixed" | "padded" | "celled" | null;
    color?: string | null;
    textAlign?: "left" | "center" | "right" | null;
    sortable?: boolean;
    selectable?: boolean;
    editable?: boolean;
    renderAsCard?: boolean;
    autoNumbering?: boolean;
    pageSize?: number;
    disableSubRow?: boolean;
    headerOptions?: TableCellOptions;
    bodyOptions?: TableCellOptions[];
    footerOptions?: TableFooterOptions;
    autoFreezeAt?: number | null;
    className?: string;
    namespace?: string | null;
}
export declare class TableBuilder extends Builder<TableElementType, iTableConfig> {
    readonly builderId: keyof iBuilderRegistry;
    readonly name: keyof iBuilderRegistry;
    readonly stylesheet: string;
    private currentPage;
    private pageRows;
    private _uidCounter;
    private _generateRowUID;
    private _isRowTotalRendered;
    private _totalColumns;
    private table;
    private thead;
    private tbody;
    private tfoot;
    private data;
    private domModel;
    constructor(config?: Partial<iTableConfig>);
    /**
     * Public entry point for materializing the table component from input data.
     * Transforms the incoming payload into a DOM fragment while preserving the shared builder lifecycle.
     */
    prepare(content: any, _config: Required<iTableConfig>): HTMLElement | Record<string, any | HTMLElement>;
    private renderTable;
    /**
     * Runtime event-binding hook.
     * Triggered at the very end of the creation lifecycle to lock persistent browser
     * click/drag/swipe interactive listeners onto the completed DOM structure.
     */
    initialize(el?: HTMLElement, _payload?: any): void;
    toJson(): any[];
    getData({ includeMeta }?: {
        includeMeta?: boolean;
    }): {
        header: any[];
        body: any[];
        footer: any[];
    };
    addRow(inputRowData?: TableCellData[] | null): void;
    toggleEdit(tr: HTMLTableRowElement, editable: boolean): void;
    removeRow(globalIndex: number): void;
    insertSubRow(inputRowData: any[] | null | undefined, parentIndex: number): void;
    switchPage(pageNumber: number): void;
    sort(propertyName: string): void;
    /**
     * Template hook for atomic data injection into specific element types.
     * This is called by the base render() method for each element created.
     */
    protected template(typeKey: TableElementType, el: HTMLElement, payload: any, selector: iElementProperty): void;
    private resolvePayload;
    private _createHeaderDomModel;
    private _createBodyDomModel;
    private _createFooterDomModel;
    private _createGrandTotalColumnPayload;
    /**
     * Determine whether the current data contains any sub-rows.
     * Covers both the modern `subrowOfUid` reference and the legacy `subrowOf` numeric marker.
     */
    private _hasSubRows;
    /**
     * Determine whether a "Row Total" column will be rendered for the current data.
     * A Row Total column is inserted only when a body column has a `formula` AND sub-rows exist.
     * This is the live-data equivalent of `_isRowTotalRendered` (which is only set *after* the
     * column is inserted, so it is useless for pre-computing `_totalColumns`).
     */
    private _hasRowTotalColumn;
    /**
     * Index (within `bodyOptions`) of the column configured with a `formula`, or -1 if none.
     */
    private _getFormulaColumnIndex;
    private _countRenderedColumns;
    private _openRowForEditByGlobalIndex;
    private _insertMetadataRowUids;
    private _applyInsertionAutoNumbering;
    private _applyInsertionActionButtons;
    private _applyInsertionFooterRenderTotal;
    private _applyInsertionPagination;
    private _applyInsertionRowTotalColumns;
    private _applyFreezeColumns;
    _applyKeydownHandler(e?: KeyboardEvent): void;
}
//# sourceMappingURL=Table.d.ts.map