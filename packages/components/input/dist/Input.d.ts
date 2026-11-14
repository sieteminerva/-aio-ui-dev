import type { iElementProperty, iBuilderConfig, iBuilderRegistry } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base";
import { ModuleLoader } from "@aio-ui/module-loader";
import { type iInputAdapter, type iInputModuleContext, type InputModulePreset } from "./InputRegistry";
import type { iCalculationFormula } from "./CalculationTypes";
export type InputType = "text" | "textarea" | "number" | "select" | "dropdown" | "actions" | "checkbox" | "radio" | "range" | "date" | "time" | "datetime-local" | "file" | "color" | "email" | "password" | "url" | "tel" | "hidden";
export interface iBasicSelectOption {
    value?: string;
    label?: string;
    icon?: string;
}
export type InputElementType = "@field" | "@field>label" | "@field>input" | "@field>textarea" | "@field>select" | "@field>select>option" | "@field>checkbox" | "@field>radio" | "@field>toggle" | "@field>file" | "@field>info";
export type iActionType = "add" | "remove" | "delete" | "save" | "edit" | "copy" | "search" | "custom" | "editor" | "repeater";
export interface iInputActionDefinition {
    type: iActionType;
    selector?: Record<string, iElementProperty>;
    label?: string;
    icon?: string;
    onClick: iInputActionHandler;
}
export interface iInputActionContext {
    parentElement: HTMLElement;
    /** Field the set belongs to; `null` when the scope is a group. */
    input: iBasicInputNode | null;
    action: iActionType;
    button: HTMLButtonElement;
    /** First control of the scope, kept for single-field sets. */
    element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
    /** One control's value, or a serialized summary for a group. */
    value: string;
    /** Every value of the scope, in submit vocabulary (that is what `search` reports). */
    values?: Record<string, any>;
    event: MouseEvent;
    result?: unknown;
}
export type iInputActionHandler = (parentElement: HTMLElement, context: iInputActionContext) => void | Promise<void>;
export interface iBasicInputConfig {
    attributes?: Array<{
        name: string;
        value: string;
    }>;
    style?: string;
    field?: string;
    className?: string;
    options?: Array<string | iBasicSelectOption>;
    position?: "left" | "right";
    icon?: string;
    content?: string | Record<string, unknown>;
    /**
     * Buttons for this set.
     *
     * Entries may be mixed: a bare name is a preset (`"editor"` → edit+save, `"repeater"` →
     * add+delete, `"search"` → search) with the built-in behaviour and no callback, while an
     * object is taken literally — it exists so a project can name the button and do its own
     * work. `["editor", { type: "copy", onClick }]` is therefore valid.
     */
    actions?: Array<iActionType | iInputActionDefinition> | Partial<Record<iActionType, Omit<iInputActionDefinition, "type">>> | null;
    /**
     * Keep this field writable even when a control set locks its scope.
     *
     * Same meaning as the node-level `editable`; accepted here too so a schema can group it
     * with the rest of the field's behaviour.
     */
    editable?: boolean;
    /**
     * Width hint when the field sits inside a row.
     *
     * `50` → half the row, `0.5` → the same thing as a fraction, `"auto"` → the whole row.
     * Ignored outside a row (a plain field is always full width).
     */
    wide?: number | string | null;
    useLabel?: boolean;
    view?: string;
    thumbnail?: boolean;
    maxUpload?: number;
    maxFileSize?: number;
    groupUnallowed?: boolean;
    createEventListener?: boolean;
    popover?: string | HTMLElement | undefined;
    display?: "block" | "inline";
    /** Options forwarded to the dropdown module when `type` is `"dropdown"`. */
    dropdown?: Record<string, any>;
    /**
     * Called with the raw files the user picked, when the file module is registered.
     *
     * The input layer deliberately stops here: parsing a CSV into a table, serializing a
     * Drive payload or rendering a preview are decisions for whoever owns the file. Without
     * the `file` module in the preset this callback never fires.
     *
     * @param files - Selected files, in the order the browser reported them.
     * @param field - The resolved field payload, for id/name context.
     */
    onFileSelected?: (files: File[], field: any) => void | Promise<void>;
    /** Calculation strategy attached to this input (usually a readonly total field). */
    calculator?: iCalculationFormula<any>;
}
export interface iBasicInputNode extends iBuilderConfig<InputElementType> {
    type?: InputType;
    id?: string;
    formId?: string | null;
    name?: string;
    title?: string;
    /** Alternatif `title` untuk teks label; dipakai lebih dulu bila ada. */
    label?: string;
    placeholder?: string;
    value?: any;
    /** Numeric increment; defaults to "any" so decimal values pass native validation. */
    step?: number | "any";
    rows?: number;
    cols?: number;
    multiple?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    /** Skip InputControls' automatic read-only/disabled lock when edit actions are present. */
    editable?: boolean;
    required?: boolean;
    checked?: boolean;
    range?: string;
    info?: string;
    position?: "top" | "left" | "right" | "bottom";
    config?: iBasicInputConfig;
    onValueChange?: (form: any, e: Event) => {};
}
/** Builder-level configuration for the input layer. */
export interface iInputConfig extends iBuilderConfig<InputElementType> {
    /**
     * Optional loader that supplies the input sub-modules (dropdown, file, controls, popover).
     *
     * Leave it `null` and the core preset keeps every adapter available. Inject one to
     * trim the layer down (for example `LITE_INPUT_MODULES`), or to add a project module.
     *
     * An already-resolved `iInputAdapter[]` is accepted too: that is what a parent
     * component hands over when its own manifest resolved the set — the field must not
     * load or unload modules its host owns.
     */
    modules?: ModuleLoader<iInputModuleContext, iInputAdapter> | InputModulePreset | null;
}
export declare class InputBuilder extends Builder<InputElementType, iInputConfig> {
    #private;
    readonly builderId: keyof iBuilderRegistry;
    readonly name: keyof iBuilderRegistry;
    readonly stylesheet: string;
    /**
     * 🪶 LOADING MOCKUP — one label and one control box, drawn with the mandatory
     * `@aio-ui/skeleton` primitive. The control type (select, textarea, switch) changes the
     * skin, never the box: a field reserves one line plus one control.
     */
    protected loading(): HTMLElement;
    constructor(config?: Partial<iInputConfig>);
    private resolvePayload;
    prepare(inputObj: Partial<iBasicInputNode>, _config?: Required<iInputConfig> | undefined): HTMLElement | Record<string, any | HTMLElement>;
    protected template(typeKey: InputElementType, el: HTMLElement, payload?: any): void;
    initialize(_el?: HTMLElement, _payload?: any, _context?: any): void;
    /**
     * Applies a schema to a live control.
     *
     * The registry decides what a type may carry: an attribute that means nothing for the
     * type is dropped instead of landing in the markup (`maxlength` on a `checkbox`, a
     * `min` on a `file`). `id` and `name` are structural and always set; `config.attributes`
     * is applied last, so an escape hatch still wins.
     */
    private applyAttributes;
    private _sanitizeId;
}
//# sourceMappingURL=Input.d.ts.map