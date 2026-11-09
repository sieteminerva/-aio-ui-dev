import type { iModuleDefinition } from "@aio-ui/module-loader/ModuleRegistry";
import { FileUploader } from "./FileUploader";
import { INPUT_MODULE_IDS, type iInputAdapter, type iInputModuleContext } from "../InputModuleTypes";

/**
 * File input module.
 *
 * The uploader is the heaviest optional piece of the input layer (preview grid, size and
 * count validation), so it is a module: a `file` field gets it, nothing else does.
 *
 * What this module does **not** do is decide what a selected file means. It reports raw
 * `File` objects — through `config.onFileSelected` on the field and through the global
 * `elementChanged` event — and offers `getFiles(formId)` for callers that want the
 * current selection. Parsing a CSV into a table, serializing to a Drive payload, showing
 * a preview: all of that belongs to whoever owns the file, not to the input layer.
 */
class FileUploaderInputModule implements iInputAdapter {
  /**
   * Attaches the uploader to a file field and wires the selection callback.
   *
   * @summary The uploader looks for its host `.field` when constructed, so this runs after
   * the control is mounted. Calling it twice is safe: the constructor is idempotent per
   * element, and the `change` listener is installed once per input.
   */
  public decorate(_wrapper: HTMLElement, control: HTMLElement, field: any, host: iInputModuleContext): void {
    if (field.type !== "file" || !(control instanceof HTMLInputElement)) return;

    // Report first, decorate second: the selection callback is the capability, and it must
    // not be hostage to the uploader's UI (which can fail on its own without taking the
    // data channel with it).
    if (!(control as HTMLInputElement & { __fileSelectedBound?: boolean }).__fileSelectedBound) {
      (control as HTMLInputElement & { __fileSelectedBound?: boolean }).__fileSelectedBound = true;

      control.addEventListener("change", () => {
        const files = Array.from(control.files ?? []);
        const onFileSelected = field.config?.onFileSelected;

        if (typeof onFileSelected === "function") {
          try {
            void onFileSelected(files, field);
          } catch (error) {
            console.error("[InputBuilder] onFileSelected failed:", error);
          }
        }

        // The global channel reports the same facts, so a listener that never saw the field
        // schema can still react. `config.emit` exists when the host attached an emitter.
        host.builderConfig.emit?.("elementChanged", {
          builder: "input",
          type: "@field>file",
          element: control,
          data: { field: field.id, files },
        });
      });
    }

    try {
      new FileUploader(control);
    } catch (error) {
      console.warn("[InputBuilder] file adapter init failed:", error);
    }
  }

  /**
   * Covers file inputs that bypass `InputBuilder` (raw HTML inside a form).
   *
   * @param root - Subtree to scan.
   */
  public mount(root: Document | HTMLElement): void {
    try {
      FileUploader.initAll(root);
    } catch (error) {
      console.warn("[InputBuilder] file adapter init failed:", error);
    }
  }

  /**
   * The files currently selected inside a form, keyed by input name.
   *
   * @param formId - Id of the form that owns the file inputs.
   * @returns Raw `File` arrays; empty when nothing is selected.
   */
  public getFiles(formId: string): Record<string, File[]> {
    return FileUploader.getFiles(formId);
  }
}

/**
 * File module definition.
 *
 * @example
 * // registered by INPUT_MODULE_DEFINITIONS; a form that never uploads can drop it
 */
export const fileUploaderInputModule: iModuleDefinition<iInputModuleContext, iInputAdapter> = {
  id: INPUT_MODULE_IDS.file,
  load: () => new FileUploaderInputModule(),
};
