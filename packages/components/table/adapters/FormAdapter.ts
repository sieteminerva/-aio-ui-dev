import type { iModuleDefinition } from "@aio-ui/module-loader";
import type { iFormModuleContext, iFormTableTarget } from "@aio-ui/form/FormModuleTypes";
import { FORM_MODULE_IDS } from "@aio-ui/form/FormModuleTypes";
import { parseTableFile } from "@aio-ui/utilities/parseTableFile";
import { TableBuilder } from "../Table";

/**
 * Table adapter.
 *
 * @summary Owns every `TableBuilder` the form uses: schema tables declared by a
 * group, and the preview table built from a selected CSV/JSON file.
 */
class TableFormAdapter {
  /** Host context captured at load time. */
  readonly #context: iFormModuleContext;

  /** Preview table built from the last selected CSV/JSON file. */
  #preview: TableBuilder | null = null;

  /** Payload key the preview belongs to — the name of the field that produced it. */
  #previewKey: string | null = null;

  /** Whether the form-level file delegation listener is already attached. */
  #fileBound = false;

  /**
   * @param context - Host context.
   */
  constructor(context: iFormModuleContext) {
    this.#context = context;
  }

  /**
   * Binds the form-level file delegation once, so files mounted later by cascade
   * or multistep also produce a preview table.
   *
   * @param root - Form element or freshly mounted fieldset.
   * @returns Nothing.
   */
  public mount(root: HTMLElement): void {
    if (root !== this.#context.form || this.#fileBound) return;
    this.#fileBound = true;

    root.addEventListener("change", (event) => { void this.#rebuildPreview(event); });
  }

  /**
   * Builds a table for a group schema and wires its submit button.
   *
   * @param spec - The `table` descriptor: `{ content, id? }`.
   * @param target - Fieldset and submit button the table belongs to.
   * @returns The table container, or `null` when the spec has no content.
   */
  public renderTable(spec: any, target: iFormTableTarget): HTMLElement[] | null {
    if (!spec || spec.content === undefined) return null;

    // Step 1: Build the table through its own builder.
    const table = new TableBuilder();
    const tableEl = table.create(spec.content);
    if (spec.id) tableEl.id = spec.id;

    // Step 2: The group button appends the group's current values as a row.
    target.submitButton.onclick = (event) => {
      event.preventDefault();
      table.addRow(this.#collectValues(target.fieldset));
    };

    return [tableEl];
  }

  /**
   * Contributes the CSV preview table to the submit payload.
   *
   * @param payload - Mutable submit payload.
   * @returns Nothing.
   *
   * @summary The key is the field that carried the file (`name`, else `id`), not a fixed
   * `product`: two CSV fields in one form must not overwrite each other.
   */
  public beforeSubmit(payload: Record<string, any>): void {
    if (this.#preview && this.#previewKey) payload[this.#previewKey] = this.#preview.toJson();
  }

  /** Releases the preview table held by this adapter. */
  public destroy(): void {
    this.#preview?.destroy?.();
    this.#preview = null;
  }

  /**
   * Rebuilds the preview table after a CSV/JSON file is selected.
   *
   * @param event - Change event bubbling from the form.
   * @returns A promise resolved once the preview is mounted.
   */
  async #rebuildPreview(event: Event): Promise<void> {
    const form = this.#context.form;
    const fileInput = (event.target as HTMLElement)?.closest?.("input[type='file'][data-uploader-csv]") as HTMLInputElement | null;
    if (!fileInput || !form.contains(fileInput)) return;

    // Step 1: Drop the previous preview and table reference.
    form.querySelector(".table-container")?.remove();
    this.#preview?.destroy?.();
    this.#preview = null;
    this.#previewKey = null;

    // Step 2: Skip rebuilding when the user cleared the input.
    if (!fileInput.files || fileInput.files.length === 0) return;

    // Step 3: Parse the file this input actually holds, then mount the preview table.
    // The table layer owns CSV→rows; asking the input layer for a *form id* (as this used
    // to) meant the table depended on the uploader and could only ever read one file.
    const tableData = await parseTableFile(fileInput.files[0]);
    const table = new TableBuilder({ renderAsCard: false, autoFreezeAt: 0 });
    const tableEl = table.create(tableData);

    this.#preview = table;
    this.#previewKey = fileInput.name || fileInput.id || null;
    (fileInput.parentElement as HTMLElement)?.insertAdjacentElement("afterend", tableEl);
  }

  /**
   * Reads the current control values of a fieldset.
   *
   * @param fieldset - Group whose controls are collected.
   * @returns One value per control, with checked radios and checkboxes only.
   */
  #collectValues(fieldset: HTMLElement): any[] {
    const values: any[] = [];
    const elements = (fieldset as HTMLFieldSetElement).elements as unknown as Iterable<HTMLElement>;

    for (const element of elements) {
      if (!element) break;

      if (element instanceof HTMLInputElement && (element.type === "checkbox" || element.type === "radio")) {
        if (element.checked) values.push(element.value);
        continue;
      }

      values.push((element as HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement).value);
    }

    return values;
  }
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
export const tableFormAdapter: iModuleDefinition<iFormModuleContext, TableFormAdapter> = {
  id: FORM_MODULE_IDS.table,

  /**
   * Builds the table adapter for the host form.
   *
   * @param context - Host context.
   * @returns The live adapter.
   */
  load: (context) => new TableFormAdapter(context),

  /**
   * Releases the preview table.
   *
   * @param adapter - The adapter returned by `load()`.
   * @returns Nothing.
   */
  destroy: (adapter) => adapter.destroy(),
};
