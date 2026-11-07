import type { iModuleDefinition } from "@aio-ui/modules/ModuleRegistry";
import type { iFormModuleContext } from "./FormModuleTypes";
import { FORM_MODULE_IDS } from "./FormModuleTypes";
import { InputBuilder } from "./Input";

/**
 * Field rendering adapter.
 *
 * @summary Owns `InputBuilder`: it creates every field the form renders and
 * collects the files its file adapter produced. `FileUploader` stays inside the
 * input layer; this adapter only talks to `InputBuilder`.
 */
class InputFormAdapter {
  /** Host context captured at load time. */
  readonly #context: iFormModuleContext;

  /**
   * @param context - Host context.
   */
  constructor(context: iFormModuleContext) {
    this.#context = context;
  }

  /**
   * Builds one field from the input schema.
   *
   * @param input - Basic input node or raw descriptor.
   * @param formId - Id of the owning form, forwarded to the field markup.
   * @returns The rendered field element.
   */
  public renderField(input: any, formId: string): HTMLElement {
    return new InputBuilder({ formId } as any).create(input);
  }

  /**
   * Covers file inputs that bypass `InputBuilder` (raw HTML fields).
   *
   * @param root - Form element or freshly mounted fieldset.
   * @returns Nothing.
   */
  public mount(root: HTMLElement): void {
    InputBuilder.initFileAdapters(root);
  }

  /**
   * Contributes serialized uploads to the submit payload.
   *
   * @param payload - Mutable submit payload.
   * @returns A promise resolved once files are serialized.
   */
  public async beforeSubmit(payload: Record<string, any>): Promise<void> {
    Object.assign(payload, await InputBuilder.collectFiles(this.#context.form.id));
  }
}

/**
 * Input module definition.
 *
 * @summary Required for rendering: without it the builder cannot create fields
 * and fails loudly instead of rendering an empty form.
 *
 * @example
 * // registered by CORE_FORM_MODULES and LITE_FORM_MODULES
 */
export const inputFormAdapter: iModuleDefinition<iFormModuleContext, InputFormAdapter> = {
  id: FORM_MODULE_IDS.input,

  /**
   * Builds the input adapter for the host form.
   *
   * @param context - Host context.
   * @returns The live adapter.
   */
  load: (context) => new InputFormAdapter(context),
};
