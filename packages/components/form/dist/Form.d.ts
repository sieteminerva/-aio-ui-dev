import type { iBuilderConfig, iBuilderRegistry } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base";
import type { iCascadeEventDetail } from "./FormModuleTypes";
import type { iFormModuleContext } from "./FormModuleTypes";
import { ModuleLoader } from "@aio-ui/module-loader";
import type { HttpService } from "@aio-ui/http-service";
import type { iFormMessages } from "./FormMessages";
export { composeMessage, resolveStyle, DEFAULT_FORM_MESSAGES, messageDraft } from "./FormMessages";
export type { iFormMessage, iFormMessageCategory, iFormMessageCompose, iFormMessageField, iFormMessageParams, iFormMessages, iFormMessageStyle, } from "./FormMessages";
export type FormElementType = "@container" | "@form" | "@form>group" | "@form>group>legend" | "@form>group>desc" | "@form>title" | "@form>desc" | "@form>row" | "@form>row>title" | "@form>actions" | "@form>actions>submit" | "@form>actions>submit-group" | "@form>footer" | "@form>buttons-set";
export interface iFormConfig extends iBuilderConfig<FormElementType> {
    id?: string;
    name?: string;
    title?: string;
    description?: string;
    method?: "get" | "post";
    action?: string;
    className?: string;
    submitButton?: boolean;
    buttonText?: string;
    buttonClass?: string;
    resetOnSubmit?: boolean;
    resetOnComplete?: boolean;
    createEventListener?: boolean;
    autoDisableNextStep?: boolean;
    minHeight?: string;
    multistep?: boolean;
    cascading?: boolean;
    /**
     * How conditional items are kept until their condition passes.
     *
     * `template` (default) plants a `<template>` and builds the element only when the
     * condition holds. `hidden` builds it immediately and toggles the `hidden` attribute —
     * required by chained inputs (an address picker injecting options into the next select)
     * because a template gives them nothing to inject into.
     */
    cascadeMode?: "template" | "hidden";
    onCascade?: null | ((detail: iCascadeEventDetail) => void);
    calculation?: boolean;
    footer?: HTMLElement | string | null;
    onSubmit?: null | Function;
    /**
     * Every sentence the form says back to the user.
     *
     * Validation, cascade gates, multistep notices, calculation failures and the
     * submit toast all resolve through this config; anything left out keeps the
     * built-in default. Values are template strings (`"{label} maksimal {max}."`)
     * so they can come from a spreadsheet, or functions when a template is not
     * enough:
     *
     * ```ts
     * messages: {
     *   validation: { field: ({ field, fallback }) => `${field?.label}: ${fallback}` },
     *   submit: { success: "Terima kasih!", error: "Periksa kembali isian Anda." },
     * }
     * ```
     */
    messages?: iFormMessages;
    /**
     * What a submit does with the files selected in the form.
     *
     * `"ignore"` (default) keeps them out of the payload: a submit carries form data, and
     * turning a `File` into a Drive payload (or a URL, or a preview) is a decision the
     * application makes. Pass a function to opt in — it receives the raw `File` map keyed by
     * input name and returns whatever should be merged into the payload.
     *
     * ```ts
     * files: async (files) => ({ uploads: await serialize(files) })
     * ```
     */
    files?: "ignore" | ((files: Record<string, File[]>, form: HTMLFormElement) => Record<string, any> | Promise<Record<string, any>>);
    /**
     * Drop `""`, `false` and empty arrays from the submit payload.
     *
     * Default `false`: an update wants every key, so the backend can tell "clear this cell"
     * from "this column was not in the form". Turn it on for insert-style payloads.
     */
    excludeEmpty?: boolean;
    /**
     * Data source for `[data-level]` address fields.
     *
     * The picker used to ship a hardcoded endpoint, which made it unusable off that one
     * deployment. Declare the source here instead:
     *
     * ```ts
     * address: { loader: (query) => http.get({ sheet: "wilayah", ...query }) }
     * ```
     *
     * `loader` wins; `url`/`service` fall back to the built-in HTTP path.
     */
    address?: {
        /** Rows for one level, already in `{ <level>_id, <level>_name }` shape. */
        loader?: ((query: Record<string, any>) => Promise<any>) | null;
        /** Endpoint for the built-in path. */
        url?: string | null;
        /** Shared HTTP service; otherwise the picker builds its own from `url`. */
        service?: HttpService | null;
        /** Ask for coordinates as well. */
        geocode?: boolean;
        /**
         * Which picker adapter drives the levels: `"aio"` for this framework's markup,
         * `"native"` for platform controls (default), or a name registered with
         * `IdAddressBuilder.registerAdapter()`.
         */
        useAdapter?: string | null;
    } | null;
    /**
     * Optional loader that supplies optional Form sub-modules.
     *
     * Leave it `null` (default) and every feature keeps its built-in handler, so
     * existing forms are unaffected. An injected loader only replaces a feature
     * when the matching module is registered in it.
     */
    modules?: ModuleLoader<iFormModuleContext, any> | null;
}
export declare class FormBuilder extends Builder<FormElementType, iFormConfig> {
    #private;
    readonly builderId: keyof iBuilderRegistry;
    readonly name: keyof iBuilderRegistry;
    readonly stylesheet: string;
    private submitButtonId;
    /**
     * Memisahkan modul yang diserahkan registry menurut lapisannya.
     *
     * @param modules - Id modul → modul hasil resolve.
     *
     * @summary `Form` menaungi builder lain (`input`), jadi satu manifest memuat dua
     * lapisan: id milik `INPUT_MODULE_IDS` menjadi preset field, sisanya milik form.
     * Id tetap yang menentukan — `scope` di manifest hanya menyatakan niat, dan
     * mencocokkan lewat id membuat manifest lama tanpa `scope` tetap benar.
     */
    provideModules(modules: Record<string, unknown>): void;
    constructor(config?: Partial<iFormConfig>);
    /**
     * REFACTOR TOTAL: Merakit Form menggunakan struktur iBasicNode[] murni
     */
    prepare(inputs: Array<any | HTMLElement | string> | any, _config?: Partial<iFormConfig>): HTMLElement;
    /**
     * Recursively renders a group (fieldset) and its child inputs or sub-groups.
     * Param `cascade` opsional: saat aktif, anak-anak group yang membawa `.condition`
     * ditahan ke registry kaskade alih-alih langsung dirender.
     */
    private renderGroup;
    /**
     * Renders a row: fields side by side in a CSS grid.
     *
     * A row is **layout only** — it produces no legend, no fieldset and no field data, which
     * is why `group` (fieldset + legend) stays a separate word in the schema. Children wrap
     * on their own once the declared column count is exhausted; a child's width comes from
     * its `wide` hint (`50` → half, `"auto"` → full row) or an explicit `span`.
     *
     * Nesting works: a row inside a row is just another grid cell, so a stacked column is
     * `{ column: 1, wide: 50, row: [...] }`.
     *
     * @param rowInput - Row node (`{ label, column, row: [...] }`).
     * @param formId - Id of the owning form.
     * @param cascadePath - Path segment when cascade is active, so a conditional child can
     *   be held and mounted later with the same key the engine walks.
     * @returns The row container element.
     */
    private renderRow;
    /**
     * Renders one field through the loaded input module.
     *
     * @summary Keeps `InputBuilder` out of the builder: the module owns field
     * creation, the form only asks for an element.
     * @param input - Input schema or raw descriptor.
     * @param formId - Id of the owning form.
     * @returns The rendered field element.
     * @throws {Error} When no loaded module can render fields, meaning the `input`
     *   module is missing from the presets.
     */
    private _renderField;
    private _buildModuleContext;
    private _buildCascadeHost;
    private _buildMultistepHost;
    /** Set nilai field secara programatik — engine memantik evaluasi via event change */
    setCascadeValue(field: string, value: any): void;
    /**
     * 🪜 Multistep: posisi langkah aktif, gerbang validasi, dan pelahirkan
     * fieldset langkah kini sepenuhnya dikelola engine FormMultistepHandler
     * (Handlers/Multistep.ts) — lihat _buildMultistepHost().
     */
    initialize(formElement: HTMLFormElement): void;
    protected template(typeKey: FormElementType, el: HTMLElement, payload?: any): void;
    unmount(): void;
    /**
     * Listener submit/klik + orkestrasi hook kolaborator (mount, beforeSubmit).
     */
    private attachFormListener;
    /**
     * Presents a status message through the loaded message module.
     *
     * @summary `FormBuilder` owns no message renderer: the module that implements
     * `notify` decides how the message appears. Without such a module the builder
     * warns instead of failing, so plugging the module out never breaks rendering.
     * @param form - Form the message belongs to.
     * @param success - Whether the action that produced the message succeeded.
     * @param content - Message content, possibly already filled by the caller.
     * @returns Nothing.
     */
    private _notify;
    /**
     * Helper internal untuk memindai string HTML mentah atau element hidup
     * guna mencari tombol submit yang sudah ada (untuk link ID)
     */
    private scanForSubmitButton;
}
//# sourceMappingURL=Form.d.ts.map