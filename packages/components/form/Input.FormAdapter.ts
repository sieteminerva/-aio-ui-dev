import type { iModuleDefinition } from "@aio-ui/module-loader/ModuleRegistry";
import type { iFormModuleContext } from "./FormModuleTypes";
import { FORM_MODULE_IDS } from "./FormModuleTypes";
import { InputBuilder } from "@aio-ui/input/Input";
import { inputFilesOf, mountControls, mountInputModules } from "@aio-ui/input/InputRegistry";

/**
 * Field rendering adapter.
 *
 * @summary Owns `InputBuilder`: it creates every field the form renders, offers subtrees
 * to the input modules (the file adapter for raw HTML fields), and — only when the form
 * asks for it — contributes the selected files to the submit payload.
 *
 * Nothing here parses or serializes a file: the form config decides, because that is a
 * policy, not a mechanism.
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
   *
   * @summary The host's builder config comes along, so the field inherits `themeId`,
   * `namespace` and `emit` instead of starting blank.
   */
  public renderField(input: any, formId: string): HTMLElement {
    return new InputBuilder({ ...this.#context.builderConfig, formId } as any).create(input);
  }

  /**
   * Covers file inputs that bypass `InputBuilder` (raw HTML fields).
   *
   * @param root - Form element or freshly mounted fieldset.
   * @returns Nothing.
   */
  public mount(root: HTMLElement): void {
    mountInputModules(root);
  }

  /**
   * Gives a group the same control set a field can have.
   *
   * @param fieldset - Group the set acts on.
   * @param spec - `{ actions, position? }` declared by the group schema.
   * @returns The controls node, or `null` when the input preset has no controls module.
   *
   * @summary Delegated to the input module registry, so this adapter does not know how a
   * button works — and a host that drops the `controls` module gets no buttons instead of
   * a broken fieldset.
   */
  public renderActions(fieldset: HTMLElement, spec: { actions: any; position?: "left" | "right" }): HTMLElement[] | null {
    const controls = mountControls(fieldset, spec.actions, spec.position ?? "right");
    return controls ? [controls] : null;
  }

  /**
   * Contributes the selected files when — and only when — the form asks for them.
   *
   * @summary `config.files` is `"ignore"` by default: a form submit carries form data,
   * not an implied file payload. A callback receives the raw `File` map and decides what
   * to add (a Drive serialization, a signed URL, nothing at all).
   * @param payload - Mutable submit payload.
   */
  public async beforeSubmit(payload: Record<string, any>): Promise<void> {
    const policy = this.#context.config.files;
    if (typeof policy !== "function") return;

    const files = inputFilesOf(this.#context.form.id);
    Object.assign(payload, await policy(files, this.#context.form));
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
