// ======================================================================
// 🧾 FORM VALIDATION HANDLER — satu-satunya jalur terpusat untuk:
//  1. Validasi NATIVE (required, pattern, type, dll.) — saat submit / next.
//  2. Validasi KASKADE (kondisi) — saat tombol "next" terkunci karena
//     sebuah condition belum terpenuhi (gate engine Cascade.ts).
//
// Setiap laporan (report) melakukan 3 hal sekaligus:
//  a) emit("formValidation", detail)  → lewat config.emit (EventEmitter global)
//  b) dispatch CustomEvent("formValidation") di <form> → mudah ditangkap content.ts
//  c) showMessage(...) → langsung menampilkan info memakai FormBuilder.createMessage
//
// Dengan begitu, semua "kenapa form tidak bisa lanjut?" berpusat di satu metode.
// ======================================================================
import { FORM_MODULE_IDS } from "../FormModuleTypes.js";
import { composeMessage, messageDraft, resolveStyle } from "../FormMessages.js";
/**
 * Reason codes, in priority order.
 *
 * The browser already computes every one of these flags through
 * `checkValidity()`, so the form never re-implements constraint logic: it only
 * gives each flag a stable, translatable name for the message composer.
 * Order matters when several flags are true at once.
 */
const VALIDITY_CODES = [
    ["valueMissing", "VALUE_MISSING"],
    ["typeMismatch", "TYPE_MISMATCH"],
    ["patternMismatch", "PATTERN_MISMATCH"],
    ["tooLong", "TOO_LONG"],
    ["tooShort", "TOO_SHORT"],
    ["rangeOverflow", "RANGE_OVERFLOW"],
    ["rangeUnderflow", "RANGE_UNDERFLOW"],
    ["stepMismatch", "STEP_MISMATCH"],
    ["badInput", "BAD_INPUT"],
    ["customError", "CUSTOM_ERROR"],
];
/** Maps a control's `ValidityState` to one stable code. */
export function validityCode(el) {
    for (const [flag, code] of VALIDITY_CODES) {
        if (el.validity[flag])
            return code;
    }
    return "INVALID";
}
/**
 * Reads constraint metadata off the element.
 *
 * Only attributes are read — never `el.value` — so a message can explain the
 * limit without echoing what the user typed.
 */
export function validityParams(el) {
    const num = (name) => {
        const parsed = parseFloat(el.getAttribute(name) ?? "");
        return Number.isFinite(parsed) ? parsed : undefined;
    };
    return {
        min: num("min"),
        max: num("max"),
        minLength: num("minlength"),
        maxLength: num("maxlength"),
        step: num("step"),
        pattern: el.getAttribute("pattern") ?? undefined,
    };
}
export class FormValidationHandler {
    options;
    constructor(options = {}) {
        this.options = options;
    }
    /**
     * Releases host references so the handler does not outlive its form.
     *
     * @summary Drops the emit and message callbacks. Safe to call more than once.
     * @returns Nothing.
     */
    dispose() {
        // Step 1: Replace the option bag so closures over the host become collectable.
        this.options = {};
    }
    /** Ambil label ramah-manusia dari sebuah kontrol (label[for] → .field label → id/name/type). */
    static resolveLabel(scope, el) {
        const name = el.name || "";
        if (name) {
            const labelled = scope.querySelector(`label[for="${CSS.escape(name)}"]`);
            const text = labelled?.textContent?.trim();
            if (text)
                return text;
        }
        const wrapping = el.closest?.(".field, .ui-action-field");
        const wrapLabel = wrapping?.querySelector("label")?.textContent?.trim();
        if (wrapLabel)
            return wrapLabel;
        return el.id || name || el.type || "field";
    }
    /**
     * Kumpulkan field yang gagal validasi native. Bila `step` diberikan,
     * pemindaian dibatasi ke fieldset langkah itu saja (multistep) — langkah
     * lain yang tersembunyi/tidak aktif tidak ikut dipertimbangkan.
     */
    static collectInvalidFields(form, step) {
        const scope = step !== undefined ? (form.querySelector(`fieldset[data-index="${step}"]`) ?? form) : form;
        const fields = [];
        scope
            .querySelectorAll("input[name], select[name], textarea[name], input:not([name])")
            .forEach((el) => {
            if (el.disabled || el.validity.valid)
                return;
            fields.push({
                name: el.name || undefined,
                id: el.id || undefined,
                type: el.type || el.tagName.toLowerCase(),
                label: this.resolveLabel(scope, el),
                message: el.validationMessage || "Isian ini belum diisi / tidak valid.",
                // The browser already knows *why*; we only name it.
                code: validityCode(el),
                params: validityParams(el),
            });
        });
        return fields;
    }
    /** Bangun detail untuk validasi NATIVE (submit / next). */
    buildNativeDetail(form, step) {
        const fields = FormValidationHandler.collectInvalidFields(form, step);
        const first = fields[0];
        // The composed draft is the single input to both the sentence and the toast
        // style, so "why it failed" is decided exactly once.
        const compose = first
            ? messageDraft({
                category: "validation",
                slot: "field",
                code: first.code ?? "INVALID",
                formId: form.id,
                fallback: first.message || "Isian belum valid.",
                field: { id: first.id, name: first.name, label: first.label, type: first.type },
                params: first.params ?? {},
            })
            : messageDraft({
                category: "validation",
                slot: "form",
                code: "FORM_INVALID",
                formId: form.id,
                fallback: "Pastikan seluruh isian wajib telah diisi dengan benar.",
                params: { count: fields.length },
            });
        return {
            formId: form.id,
            builder: this.options.builder,
            reason: "native",
            valid: fields.length === 0,
            step,
            message: composeMessage(this.options.messages, compose),
            fields,
            compose,
        };
    }
    /** Bangun detail untuk gerbang KASKADE (tombol next terkunci kondisi). */
    buildCascadeDetail(info) {
        const compose = messageDraft({
            category: "cascade",
            slot: "gate",
            code: "GATE_BLOCKED",
            formId: info.form.id,
            fallback: info.guidance || "Lengkapi isian sebelumnya untuk membuka langkah berikutnya.",
            params: { stepIndex: info.step },
        });
        return {
            formId: info.form.id,
            builder: this.options.builder,
            reason: "cascade",
            valid: false,
            step: info.step,
            message: composeMessage(this.options.messages, compose),
            condition: info.condition,
            path: info.path,
            compose,
        };
    }
    /** Jalur terpusat tunggal: emit + CustomEvent di form + tampilkan toast. */
    report(detail, form) {
        // a) Emit global lewat config.emit (EventEmitter di main.ts).
        if (typeof this.options.emit === "function") {
            try {
                this.options.emit("formValidation", detail);
            }
            catch (error) {
                console.warn("[Form Validation] emit failed:", error);
            }
        }
        // b) CustomEvent di <form> agar content.ts cukup addEventListener — sama seperti formSubmit.
        if (form) {
            try {
                form.dispatchEvent(new CustomEvent("formValidation", { bubbles: true, detail }));
            }
            catch (error) {
                console.warn("[Form Validation] dispatch failed:", error);
            }
        }
        // c) Tampilkan info langsung memakai createMessage host.
        if (typeof this.options.showMessage === "function") {
            try {
                // Style is resolved from the same draft as the sentence: a configured
                // `titles`/`types`/`icons` entry changes the toast, not just the text.
                const compose = detail.compose ?? messageDraft({
                    category: detail.reason === "cascade" ? "cascade" : "validation",
                    slot: detail.reason === "cascade" ? "gate" : (detail.fields?.length ? "field" : "form"),
                    code: detail.reason === "cascade" ? "GATE_BLOCKED" : "INVALID",
                    formId: detail.formId,
                    fallback: detail.message,
                });
                const style = resolveStyle(this.options.messages, compose);
                this.options.showMessage({
                    header: style.title || undefined,
                    message: detail.message,
                    type: style.type || undefined,
                    icon: style.icon || undefined,
                });
            }
            catch (error) {
                console.warn("[Form Validation] showMessage failed:", error);
            }
        }
        return detail;
    }
    /** Lapor validasi NATIVE: kumpulkan field tak valid & pusatkan ke report(). */
    reportNative(form, step) {
        return this.report(this.buildNativeDetail(form, step), form);
    }
    /** Lapor gerbang KASKADE: tombol next terkunci karena sebuah condition belum terpenuhi. */
    reportCascadeBlocked(info) {
        return this.report(this.buildCascadeDetail(info), info.form);
    }
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
export const validationFormAdapter = {
    id: FORM_MODULE_IDS.validation,
    /**
     * Builds the validation handler for the supplied host.
     *
     * @param context - Host context carrying the form, emitter, and message host.
     * @returns The live validation handler.
     */
    load: (context) => new FormValidationHandler({
        builder: context.builder,
        // `undefined` is what the handler checks for, so a missing emitter stays inert.
        emit: context.emit ?? undefined,
        showMessage: context.showMessage,
        // Sentences come from the form config; the handler owns the fallbacks.
        messages: context.config?.messages,
    }),
    /**
     * Releases the handler by dropping its host callbacks.
     *
     * @param handler - The handler returned by `load()`.
     * @returns Nothing.
     */
    destroy: (handler) => handler.dispose(),
};
//# sourceMappingURL=Validation.js.map