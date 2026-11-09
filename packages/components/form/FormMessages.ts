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
  // Native constraints, read from element attributes.
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  /** Constraint step, not the wizard step (see `stepIndex`). */
  step?: number;
  pattern?: string;

  // Multistep / cascade position.
  stepIndex?: number;
  stepTotal?: number;

  // Aggregates.
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
export const DEFAULT_FORM_MESSAGES = {
  validation: {
    title: "Periksa Kembali",
    type: "error",
    icon: "icon error",
    invalidField: "{label} belum diisi / tidak valid.",
    field: '"{label}" — {fallback}',
    form: "Pastikan seluruh isian wajib telah diisi dengan benar.",
  },
  cascade: {
    title: "Selangkah Lagi",
    type: "warning",
    icon: "notification icon",
    gate: "Lengkapi isian sebelumnya untuk membuka langkah berikutnya.",
    branch: "Pilihan ini tidak tersedia untuk cabang yang sedang aktif.",
  },
  multistep: {
    title: "Langkah Belum Lengkap",
    type: "warning",
    icon: "notification icon",
    incomplete: "Lengkapi langkah {stepIndex} sebelum melanjutkan.",
    lastStep: "Ini langkah terakhir — gunakan tombol kirim.",
  },
  calculation: {
    title: "Perhitungan Gagal",
    type: "warning",
    icon: "notification icon",
    failed: "Perhitungan {formula} tidak dapat dijalankan.",
  },
  submit: {
    titles: { success: "Operasi Sukses!", error: "Terjadi Kendala" },
    types: { success: "success", error: "error" },
    icons: { success: "checkmark circle icon", error: "icon error" },
    durations: { success: 4000, error: 6000 },
    success: "Data Anda telah diproses.",
    error: "Data Anda gagal diproses. Silakan coba lagi.",
  },
} as const satisfies iFormMessages;

/** A message group after defaults are applied. */
type MessageGroup = iFormMessageStyle & { codes?: Record<string, iFormMessage> } & Record<string, unknown>;

/** Reads one slot (sentence) out of a group without tripping over style keys. */
function readSlot(group: unknown, slot: string): iFormMessage | undefined {
  if (!group || typeof group !== "object") return undefined;
  const value = (group as Record<string, unknown>)[slot];
  return typeof value === "string" || typeof value === "function" ? (value as iFormMessage) : undefined;
}

/**
 * Fills `{token}` placeholders.
 *
 * Deliberately dumb: unknown tokens collapse to empty text instead of being
 * left visible, so a typo cannot leak `{maxx}` into the interface.
 */
function fillTemplate(template: string, compose: iFormMessageCompose): string {
  const tokens: Record<string, string | number | undefined> = {
    ...compose.params,
    label: compose.field?.label,
    name: compose.field?.name,
    id: compose.field?.id,
    type: compose.field?.type,
    formId: compose.formId,
    code: compose.code,
    slot: compose.slot,
    category: compose.category,
    fallback: compose.fallback,
  };

  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = tokens[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

/** Renders one message value against a draft. */
export function renderMessage(value: iFormMessage | undefined, compose: iFormMessageCompose): string {
  if (typeof value === "function") return value(compose);
  if (typeof value === "string") return fillTemplate(value, compose);
  return compose.fallback;
}

/**
 * Resolves the final sentence for a draft.
 *
 * Order: the configured `codes[code]` entry, then the configured slot, then the
 * built-in slot, then `compose.fallback`. A composer's return value is used
 * as-is — it replaces the sentence rather than being appended to it.
 */
export function composeMessage(
  messages: iFormMessages | undefined,
  compose: iFormMessageCompose,
): string {
  const group = messages?.[compose.category] as MessageGroup | undefined;
  const fallbackGroup = DEFAULT_FORM_MESSAGES[compose.category] as MessageGroup;

  const value =
    group?.codes?.[compose.code] ??
    readSlot(group, compose.slot) ??
    readSlot(fallbackGroup, compose.slot);

  return renderMessage(value, compose) || compose.fallback;
}

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
export function resolveStyle(
  messages: iFormMessages | undefined,
  compose: iFormMessageCompose,
): iFormStyleResolution {
  const group = (messages?.[compose.category] ?? {}) as MessageGroup;
  const fallbackGroup = DEFAULT_FORM_MESSAGES[compose.category] as MessageGroup;

  const title = group.titles?.[compose.slot] ?? group.title ?? fallbackGroup.titles?.[compose.slot] ?? fallbackGroup.title;
  const type = group.types?.[compose.slot] ?? group.type ?? fallbackGroup.types?.[compose.slot] ?? fallbackGroup.type;
  const icon = group.icons?.[compose.slot] ?? group.icon ?? fallbackGroup.icons?.[compose.slot] ?? fallbackGroup.icon;
  const duration =
    group.durations?.[compose.slot] ??
    group.duration ??
    fallbackGroup.durations?.[compose.slot] ??
    fallbackGroup.duration;

  return {
    title: renderMessage(title, compose),
    type: typeof type === "string" ? type : "",
    icon: typeof icon === "string" ? icon : "",
    duration: typeof duration === "number" ? duration : undefined,
  };
}

/** Builds a draft without repeating every field at each call site. */
export function messageDraft(
  init: Pick<iFormMessageCompose, "category" | "slot" | "code" | "formId" | "fallback"> &
    Partial<Pick<iFormMessageCompose, "field" | "params">>,
): iFormMessageCompose {
  return {
    ...init,
    params: init.params ?? {},
  };
}
