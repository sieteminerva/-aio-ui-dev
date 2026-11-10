/**
 * FORM MESSAGES — one place for every sentence the form says back to the user.
 *
 * The form produces feedback from five different features (validation, cascade,
 * multistep, calculation, submit). Before this module each feature carried its
 * own hard-coded Indonesian string — some inside adapters, some inside the
 * message adapter — so changing a sentence meant editing three packages.
 *
 * Model: two axes plus a reason code.
 *
 * - `category` — which feature spoke: validation, cascade, multistep,
 *   calculation, submit. Matches `FORM_MODULE_IDS` so the vocabulary lines up.
 * - `slot`     — which sentence of that feature: `field`, `form`, `gate`,
 *   `success`, `error`, … This is also the exact key read from the config.
 * - `code`     — *why* it spoke: `VALUE_MISSING`, `RANGE_OVERFLOW`, …
 *   The composer can `switch` on it, or a JSON/CMS config can map it through
 *   `codes` without needing a function.
 *
 * A message value is either a template string (`"{label}" — {fallback}`) or a
 * function receiving the full {@link iFormMessageCompose}. Templates exist so a
 * config loaded from a spreadsheet stays serialisable; functions exist for the
 * cases a template cannot express.
 *
 * SECURITY: resolvers only ever read field *metadata* (id, name, label, type)
 * and constraint metadata (min, max, …). User input values are deliberately not
 * part of the draft, and the toast renders through `textContent`, so a message
 * can never become an HTML injection path.
 */
/** Field metadata available to a message composer. Never carries user input. */
export interface iFormMessageField {
    id?: string;
    name?: string;
    /** Human label resolved by `FormValidationHandler.resolveLabel()`. */
    label?: string;
    /** Control type: `"text"`, `"select"`, `"textarea"`, … */
    type?: string;
}
/** Constraint metadata available to a message composer. */
export interface iFormMessageParams {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    /** Constraint step, not the wizard step (see `stepIndex`). */
    step?: number;
    pattern?: string;
    stepIndex?: number;
    stepTotal?: number;
    /** Number of invalid fields on a whole-form failure. */
    count?: number;
    /** Calculation formula id. */
    formula?: string;
}
/** The object handed to a message composer. */
export interface iFormMessageCompose {
    /** Feature that produced the message. */
    category: iFormMessageCategory;
    /** Sentence slot inside that feature (the config key). */
    slot: string;
    /** Machine-readable reason, e.g. `VALUE_MISSING` or `GATE_BLOCKED`. */
    code: string;
    formId: string;
    /**
     * Base text already resolved by the producer: the browser's
     * `validationMessage`, a condition's `message`, or the module default.
     * Composer output overrides it; it is the safety net, not an override.
     */
    fallback: string;
    field?: iFormMessageField;
    params: iFormMessageParams;
}
/**
 * A message: a template string or a composer function.
 *
 * Template tokens: `{label}`, `{name}`, `{id}`, `{type}`, `{formId}`, `{code}`,
 * `{slot}`, `{category}`, `{fallback}` plus every key of `params`
 * (`{max}`, `{count}`, `{stepIndex}`, …). Unknown tokens render as empty text.
 */
export type iFormMessage = string | ((compose: iFormMessageCompose) => string);
export type iFormMessageCategory = "validation" | "cascade" | "multistep" | "calculation" | "submit";
/**
 * Presentation of a message group.
 *
 * The `titles` / `types` / `icons` / `durations` maps exist because some groups
 * present differently per slot — submit success and submit failure have always
 * had different titles and toast durations.
 */
export interface iFormMessageStyle {
    title?: iFormMessage;
    /** Toast type understood by the message adapter: success, error, info, warning. */
    type?: string;
    icon?: string;
    /** Toast lifetime in ms, when the message adapter renders a toast. */
    duration?: number;
    titles?: Record<string, iFormMessage>;
    types?: Record<string, string>;
    icons?: Record<string, string>;
    durations?: Record<string, number>;
}
/**
 * Configurable message groups.
 *
 * Precedence inside a category: `codes[code]` → `slot` → built-in default.
 * `codes` is the JSON-friendly route: a spreadsheet cannot hold a function, but
 * it can hold `{ "RANGE_OVERFLOW": "{label} maksimal {max}." }`.
 */
export interface iFormMessages {
    validation?: iFormMessageStyle & {
        codes?: Record<string, iFormMessage>;
        /** A single field failed a native constraint. */
        invalidField?: iFormMessage;
        /** The reported message for the first invalid field. */
        field?: iFormMessage;
        /** The form failed but no individual field could be blamed. */
        form?: iFormMessage;
    };
    cascade?: iFormMessageStyle & {
        codes?: Record<string, iFormMessage>;
        /** A step gate is locked by an unmet condition. */
        gate?: iFormMessage;
        /** A sibling branch already took the choice. */
        branch?: iFormMessage;
    };
    multistep?: iFormMessageStyle & {
        codes?: Record<string, iFormMessage>;
        /** Leaving a step whose fields are still invalid. */
        incomplete?: iFormMessage;
        /** "Next" on the last step, where submit takes over. */
        lastStep?: iFormMessage;
    };
    calculation?: iFormMessageStyle & {
        codes?: Record<string, iFormMessage>;
        /** A formula threw or produced a non-finite total. */
        failed?: iFormMessage;
    };
    submit?: iFormMessageStyle & {
        codes?: Record<string, iFormMessage>;
        success?: iFormMessage;
        error?: iFormMessage;
    };
}
/**
 * Built-in sentences.
 *
 * These are the exact strings the form used to hard-code, moved here so that
 * *not configuring* `messages` behaves identically to before.
 */
export declare const DEFAULT_FORM_MESSAGES: {
    readonly validation: {
        readonly title: "Periksa Kembali";
        readonly type: "error";
        readonly icon: "icon error";
        readonly invalidField: "{label} belum diisi / tidak valid.";
        readonly field: "\"{label}\" — {fallback}";
        readonly form: "Pastikan seluruh isian wajib telah diisi dengan benar.";
    };
    readonly cascade: {
        readonly title: "Selangkah Lagi";
        readonly type: "warning";
        readonly icon: "notification icon";
        readonly gate: "Lengkapi isian sebelumnya untuk membuka langkah berikutnya.";
        readonly branch: "Pilihan ini tidak tersedia untuk cabang yang sedang aktif.";
    };
    readonly multistep: {
        readonly title: "Langkah Belum Lengkap";
        readonly type: "warning";
        readonly icon: "notification icon";
        readonly incomplete: "Lengkapi langkah {stepIndex} sebelum melanjutkan.";
        readonly lastStep: "Ini langkah terakhir — gunakan tombol kirim.";
    };
    readonly calculation: {
        readonly title: "Perhitungan Gagal";
        readonly type: "warning";
        readonly icon: "notification icon";
        readonly failed: "Perhitungan {formula} tidak dapat dijalankan.";
    };
    readonly submit: {
        readonly titles: {
            readonly success: "Operasi Sukses!";
            readonly error: "Terjadi Kendala";
        };
        readonly types: {
            readonly success: "success";
            readonly error: "error";
        };
        readonly icons: {
            readonly success: "checkmark circle icon";
            readonly error: "icon error";
        };
        readonly durations: {
            readonly success: 4000;
            readonly error: 6000;
        };
        readonly success: "Data Anda telah diproses.";
        readonly error: "Data Anda gagal diproses. Silakan coba lagi.";
    };
};
/** Renders one message value against a draft. */
export declare function renderMessage(value: iFormMessage | undefined, compose: iFormMessageCompose): string;
/**
 * Resolves the final sentence for a draft.
 *
 * Order: the configured `codes[code]` entry, then the configured slot, then the
 * built-in slot, then `compose.fallback`. A composer's return value is used
 * as-is — it replaces the sentence rather than being appended to it.
 */
export declare function composeMessage(messages: iFormMessages | undefined, compose: iFormMessageCompose): string;
/** Presentation of a message after slot-specific overrides are applied. */
export interface iFormStyleResolution {
    title: string;
    type: string;
    icon: string;
    duration?: number;
}
/**
 * Resolves title/type/icon/duration for a draft.
 *
 * Order per property: user slot override → user group value → default slot
 * override → default group value. Missing values resolve to empty strings so a
 * caller can fall back without guessing.
 */
export declare function resolveStyle(messages: iFormMessages | undefined, compose: iFormMessageCompose): iFormStyleResolution;
/** Builds a draft without repeating every field at each call site. */
export declare function messageDraft(init: Pick<iFormMessageCompose, "category" | "slot" | "code" | "formId" | "fallback"> & Partial<Pick<iFormMessageCompose, "field" | "params">>): iFormMessageCompose;
//# sourceMappingURL=FormMessages.d.ts.map