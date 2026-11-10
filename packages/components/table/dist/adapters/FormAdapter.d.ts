import type { iModuleDefinition } from "@aio-ui/module-loader";
import type { iFormModuleContext, iFormTableTarget } from "@aio-ui/form/FormModuleTypes";
/**
 * Table adapter.
 *
 * @summary Owns every `TableBuilder` the form uses: schema tables declared by a
 * group, and the preview table built from a selected CSV/JSON file.
 */
declare class TableFormAdapter {
    #private;
    /**
     * @param context - Host context.
     */
    constructor(context: iFormModuleContext);
    /**
     * Binds the form-level file delegation once, so files mounted later by cascade
     * or multistep also produce a preview table.
     *
     * @param root - Form element or freshly mounted fieldset.
     * @returns Nothing.
     */
    mount(root: HTMLElement): void;
    /**
     * Builds a table for a group schema and wires its submit button.
     *
     * @param spec - The `table` descriptor: `{ content, id? }`.
     * @param target - Fieldset and submit button the table belongs to.
     * @returns The table container, or `null` when the spec has no content.
     */
    renderTable(spec: any, target: iFormTableTarget): HTMLElement[] | null;
    /**
     * Contributes the CSV preview table to the submit payload.
     *
     * @param payload - Mutable submit payload.
     * @returns Nothing.
     *
     * @summary The key is the field that carried the file (`name`, else `id`), not a fixed
     * `product`: two CSV fields in one form must not overwrite each other.
     */
    beforeSubmit(payload: Record<string, any>): void;
    /** Releases the preview table held by this adapter. */
    destroy(): void;
}
/**
 * Table module definition.
 *
 * @summary Loaded with the core preset; `renderTable` only fires for groups that
 * declare `table`, and the file delegation only reacts to CSV/JSON inputs.
 *
 * @example
 * // registered by FORM_ADAPTER_DEFINITIONS; no manual wiring needed
 */
export declare const tableFormAdapter: iModuleDefinition<iFormModuleContext, TableFormAdapter>;
export {};
//# sourceMappingURL=FormAdapter.d.ts.map