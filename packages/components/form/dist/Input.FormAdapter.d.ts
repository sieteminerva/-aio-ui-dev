import type { iModuleDefinition } from "@aio-ui/module-loader";
import type { iFormModuleContext } from "./FormModuleTypes";
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
declare class InputFormAdapter {
    #private;
    /**
     * @param context - Host context.
     */
    constructor(context: iFormModuleContext);
    /**
     * Builds one field from the input schema.
     *
     * @param input - Basic input node or raw descriptor.
     * @param formId - Id of the owning form, forwarded to the field markup.
     * @returns The rendered field element.
     *
     * @summary The host's builder config comes along, so the field inherits `themeId`,
     * `namespace` and `emit` instead of starting blank — and so does its adapter set.
     */
    renderField(input: any, formId: string): HTMLElement;
    /**
     * Covers file inputs that bypass `InputBuilder` (raw HTML fields).
     *
     * @param root - Form element or freshly mounted fieldset.
     * @returns Nothing.
     */
    mount(root: HTMLElement): void;
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
    renderActions(fieldset: HTMLElement, spec: {
        actions: any;
        position?: "left" | "right";
    }): HTMLElement[] | null;
    /**
     * Contributes the selected files when — and only when — the form asks for them.
     *
     * @summary `config.files` is `"ignore"` by default: a form submit carries form data,
     * not an implied file payload. A callback receives the raw `File` map and decides what
     * to add (a Drive serialization, a signed URL, nothing at all).
     * @param payload - Mutable submit payload.
     */
    beforeSubmit(payload: Record<string, any>): Promise<void>;
}
/**
 * Input module definition.
 *
 * @summary Required for rendering: without it the builder cannot create fields
 * and fails loudly instead of rendering an empty form.
 *
 * @example
 * // registered by FORM_ADAPTER_DEFINITIONS (the form's default set)
 */
export declare const inputFormAdapter: iModuleDefinition<iFormModuleContext, InputFormAdapter>;
export {};
//# sourceMappingURL=Input.FormAdapter.d.ts.map