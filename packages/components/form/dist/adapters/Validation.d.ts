import type { iMessageContent } from "@aio-ui/message";
import type { iModuleDefinition } from "@aio-ui/module-loader";
import type { CascadeBlockedInfo, iFormCondition, iFormModuleContext } from "../FormModuleTypes";
import type { iFormMessageCompose, iFormMessageParams, iFormMessages } from "../FormMessages";
export interface iInvalidField {
    name?: string;
    id?: string;
    type?: string;
    label?: string;
    message?: string;
    /** Machine-readable reason derived from `ValidityState`, e.g. `VALUE_MISSING`. */
    code?: string;
    /** Constraint metadata for the composer (min, max, maxLength, pattern, …). */
    params?: iFormMessageParams;
}
/** Maps a control's `ValidityState` to one stable code. */
export declare function validityCode(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string;
/**
 * Reads constraint metadata off the element.
 *
 * Only attributes are read — never `el.value` — so a message can explain the
 * limit without echoing what the user typed.
 */
export declare function validityParams(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): iFormMessageParams;
export type FormValidationReason = "native" | "cascade";
export interface iFormValidationDetail {
    formId: string;
    builder?: string;
    reason: FormValidationReason;
    valid: boolean;
    /** index langkah multistep yang sedang divalidasi (opsional) */
    step?: number;
    message: string;
    fields?: iInvalidField[];
    condition?: iFormCondition | null;
    path?: string;
    data?: any;
    /**
     * The draft this message was composed from, so listeners (and the toast
     * presenter) can re-render or restyle it without rebuilding the context.
     */
    compose?: iFormMessageCompose;
}
export interface FormValidationOptions {
    builder?: string;
    emit?: (event: string, payload: any) => void;
    showMessage?: (content: iMessageContent) => void;
    /** User-configurable sentences; missing entries fall back to the defaults. */
    messages?: iFormMessages;
}
export declare class FormValidationHandler {
    private options;
    constructor(options?: FormValidationOptions);
    /**
     * Releases host references so the handler does not outlive its form.
     *
     * @summary Drops the emit and message callbacks. Safe to call more than once.
     * @returns Nothing.
     */
    dispose(): void;
    /** Ambil label ramah-manusia dari sebuah kontrol (label[for] → .field label → id/name/type). */
    private static resolveLabel;
    /**
     * Kumpulkan field yang gagal validasi native. Bila `step` diberikan,
     * pemindaian dibatasi ke fieldset langkah itu saja (multistep) — langkah
     * lain yang tersembunyi/tidak aktif tidak ikut dipertimbangkan.
     */
    static collectInvalidFields(form: HTMLFormElement, step?: number): iInvalidField[];
    /** Bangun detail untuk validasi NATIVE (submit / next). */
    buildNativeDetail(form: HTMLFormElement, step?: number): iFormValidationDetail;
    /** Bangun detail untuk gerbang KASKADE (tombol next terkunci kondisi). */
    buildCascadeDetail(info: CascadeBlockedInfo): iFormValidationDetail;
    /** Jalur terpusat tunggal: emit + CustomEvent di form + tampilkan toast. */
    report(detail: iFormValidationDetail, form?: HTMLFormElement): iFormValidationDetail;
    /** Lapor validasi NATIVE: kumpulkan field tak valid & pusatkan ke report(). */
    reportNative(form: HTMLFormElement, step?: number): iFormValidationDetail;
    /** Lapor gerbang KASKADE: tombol next terkunci karena sebuah condition belum terpenuhi. */
    reportCascadeBlocked(info: CascadeBlockedInfo): iFormValidationDetail;
}
/**
 * Form module definition for the validation handler.
 *
 * @summary Loads the centralized validation handler from the host context. The
 * handler keeps its own single `report()` path, so native and cascade failures
 * still emit, dispatch a `CustomEvent`, and show a message.
 *
 * @example
 * // registered by FORM_ADAPTER_DEFINITIONS; no manual wiring needed
 */
export declare const validationFormAdapter: iModuleDefinition<iFormModuleContext, FormValidationHandler>;
//# sourceMappingURL=Validation.d.ts.map