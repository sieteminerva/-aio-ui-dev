import type { iModuleDefinition } from "@aio-ui/module-loader/ModuleRegistry";
import { FileUploader } from "./FileUploader";
import { INPUT_MODULE_IDS, type iInputCollaborator, type iInputModuleContext } from "../InputModuleTypes";

/**
 * File input module.
 *
 * The uploader is the heaviest optional piece of the input layer (preview grid, size and
 * count validation, CSV parsing). It is a module for that reason: a field of type `file`
 * gets it, every other field does not.
 */
class FileUploaderInputModule implements iInputCollaborator {
  /**
   * Attaches the uploader to a file input this builder produced.
   *
   * @summary The uploader finds its host `.field` when constructed, so this runs after
   * the control is mounted; calling it twice is safe (the constructor is idempotent per
   * element).
   */
  public decorate(_wrapper: HTMLElement, control: HTMLElement, field: any): void {
    if (field.type !== "file" || !(control instanceof HTMLInputElement)) return;

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

  /** Serializes the files currently selected inside a form. */
  public async collectFiles(formId: string): Promise<Record<string, any>> {
    if (typeof FileUploader.getFilesForGoogleDrive !== "function") return {};
    return FileUploader.getFilesForGoogleDrive(formId);
  }

  /** Parses the CSV/JSON file selected inside a form into table data. */
  public async parseCsv(formId: string): Promise<{ header: any[]; body: any[]; footer: any }> {
    return FileUploader.parseCSVToTable(formId);
  }
}

/**
 * File module definition.
 *
 * @example
 * // registered by CORE_INPUT_MODULES; a form that never uploads can drop it
 */
export const fileUploaderInputModule: iModuleDefinition<iInputModuleContext, iInputCollaborator> = {
  id: INPUT_MODULE_IDS.file,
  load: () => new FileUploaderInputModule(),
};
