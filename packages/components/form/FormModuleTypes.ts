import type { iBuilderConfig } from "@aio-ui/core/interface";
import type { iMessageContent } from "@aio-ui/message/Message";
import type { iFormConfig } from "./Form";
import type { FormMultistepHost } from "./Handlers/Multistep";

/**
 * Cascade contracts.
 *
 * @summary These describe what `FormBuilder` **offers** to a cascade engine, so they live
 * with the form and not with the engine package: `@aio-ui/form-cascade` may be swapped,
 * while the form that hosts it must keep offering the same hooks.
 */

/**
 * Aturan kaskade form: menentukan kapan sebuah input/group boleh "lahir" ke DOM.
 * Bisa berupa fungsi `(value, state) => boolean` atau objek deklaratif.
 *
 * @example
 * condition: { field: "web-type", equals: "ecommerce" }
 * condition: { field: ["email", "company"], filled: true, message: "Lengkapi kontak dulu" }
 * condition: (value, state) => value === "ecommerce"
 */
export interface iFormCondition {
  field?: string | string[];   // nama/id input "sebelum" yang menjadi sumber nilai
  equals?: any;                // nilai harus sama persis (perbandingan longgar via String())
  in?: any[];                  // nilai harus termasuk salah satu dari daftar
  notEquals?: any;             // nilai harus TIDAK sama
  notIn?: any[];               // nilai harus di luar daftar
  filled?: boolean;            // nilai harus terisi (tidak kosong)
  when?: (value: any, state: Record<string, any>) => boolean; // resolver kustom
  message?: string;            // pesan bimbingan saat gate multistep mengunci langkah
}

/** Payload of the `onCascade` callback and the cascade events. */
export interface iCascadeEventDetail {
  action: "mount" | "unmount";
  key: string;                            // posisi skema item, mis. "2" atau "2.group.1"
  element: HTMLElement | null;            // elemen yang di-mount / di-unmount
  descriptor: any;                        // deskriptor input/group asli pembawa .condition
  condition: iFormCondition;
  state: Record<string, any>;             // snapshot nilai form saat itu
}

/** Form + schema a cascade rule is evaluated against. */
export type iCascadeState = {
  form: HTMLFormElement;
  inputs: any[];
};

/** How conditional items are held until their condition passes. */
export type FormCascadeMode = "template" | "hidden";

/** What the form reports to the user when a gate blocks "next". */
export interface CascadeBlockedInfo {
  form: HTMLFormElement;
  guidance: string;
  condition: iFormCondition | null;
  step: number;
  path?: string;
}

/** Kontrak minimal yang wajib dipenuhi host (FormBuilder) agar engine bekerja */
export interface FormCascadeHost {
  builder: string;
  inputs: any[];
  multistep: boolean;
  /** Gerbang tombol next: null/undefined = ikuti cascading && multistep;
   * true = kunci selama ada kondisi belum terpenuhi; false = nonaktif. */
  autoDisableNextStep?: boolean;
  /**
   * How a not-yet-met conditional item is kept.
   *
   * - `template` (default): a `<template>` placeholder, the real element is built only
   *   when the condition passes. Cheapest, and the item cannot be touched while hidden.
   * - `hidden`: the item is built immediately and toggled with the `hidden` attribute.
   *   Needed by chained inputs (an address picker injecting options into the *next*
   *   select) because a `<template>` gives them nothing to inject into.
   */
  cascadeMode?: FormCascadeMode;
  onCascade?: null | ((detail: iCascadeEventDetail) => void);
  emit?: any;
  /** Bangun <fieldset> dari deskriptor group (termasuk menahan anak ber-condition) */
  renderGroup(group: any, formId: string, path?: string): HTMLElement;
  /** Bangun row layout dari deskriptor row (termasuk menahan anak ber-condition) */
  renderRow(row: any, formId: string, path?: string): HTMLElement;
  /** Bangun satu field dari deskriptor; engine tidak tahu `InputBuilder` */
  renderField(input: any, formId: string): HTMLElement;
  /** Pasang adapter input di area yang baru lahir (uploader, dropdown, dsb.) */
  mountInputs?(root: HTMLElement): void;
  /** Perbaiki langkah aktif bila sebuah step di-unmount oleh kaskade */
  refreshSteps?(form: HTMLFormElement): void;
  /** Laporkan tombol "next" terkunci karena sebuah condition belum terpenuhi */
  reportCascadeBlocked?(info: CascadeBlockedInfo): void;
}

/**
 * Stable ids for Form sub-modules.
 *
 * Kept in a leaf file so module definitions can import an id without importing
 * the runtime composition module, which would create a circular import.
 */
export const FORM_MODULE_IDS = {
  validation: "validation",
  cascade: "cascade",
  multistep: "multistep",
  calculation: "calculation",
  input: "input",
  idAddress: "idAddress",
  table: "table",
  message: "message",
} as const;

/** Union of every Form sub-module id. */
export type FormModuleId = (typeof FORM_MODULE_IDS)[keyof typeof FORM_MODULE_IDS];

/**
 * When a module may load.
 *
 * - `prepare` — during `FormBuilder.prepare()`, while the schema is rendered.
 * - `initialize` — during `FormBuilder.initialize()`, after submit listeners exist,
 *   for modules that read final DOM (calculation, lazily mounted multistep steps).
 */
export type FormModulePhase = "prepare" | "initialize";

/** Target handed to {@link iFormAdapter.renderTable}. */
export interface iFormTableTarget {
  /** Fieldset that will receive the table. */
  fieldset: HTMLElement;

  /** Submit button rendered for this group, to be wired by the table owner. */
  submitButton: HTMLButtonElement;

  /** Optional group id from the schema. */
  groupId?: string;
}

/** Target handed to {@link iFormAdapter.notify}. */
export interface iFormMessageTarget {
  /** Form the message belongs to. */
  form: HTMLFormElement;

  /** Whether the action that produced the message succeeded. */
  success: boolean;
}

/**
 * Optional hooks a loaded Form module result may implement.
 *
 * @summary `FormBuilder` iterates its loaded modules and calls these hooks when
 * present. That is how adapters such as the uploader, the address picker,
 * and schema tables take part in rendering and submission without the builder
 * importing them.
 *
 * Every hook is optional; a module that only exposes an API ignores them.
 */
export interface iFormAdapter {
  /**
   * Builds one field from the input schema.
   *
   * @param input - Basic input node or raw descriptor.
   * @param formId - Id of the owning form.
   * @returns The rendered field, or `null` when this module does not render fields.
   *   The first module returning an element wins.
   */
  renderField?: (input: any, formId: string) => HTMLElement | null;

  /**
   * Attaches to a DOM area: the form itself once, then every lazily mounted
   * multistep fieldset. Implementations must be idempotent.
   *
   * @param root - Form element or freshly mounted fieldset.
   */
  mount?: (root: HTMLElement) => void;

  /**
   * Contributes data to the submit payload before `formSubmit` is dispatched.
   *
   * @param payload - Mutable payload. Mutate it in place to enrich the event.
   */
  beforeSubmit?: (payload: Record<string, any>) => void | Promise<void>;

  /**
   * Builds schema-driven table blocks for a group that declares `table`.
   *
   * @param spec - The `table` descriptor from the group schema.
   * @param target - Fieldset and submit button the table belongs to.
   * @returns Nodes to append after the submit button, or `null` when this module
   *   does not handle table specs. The first module returning nodes wins.
   */
  renderTable?: (spec: any, target: iFormTableTarget) => HTMLElement[] | null;

  /**
   * Builds a control set (add/edit/save/search/…) for a group that declares `actions`.
   *
   * @param fieldset - Group the set acts on.
   * @param spec - `{ actions, position? }` from the group schema.
   * @returns Nodes to append to the fieldset, or `null` when this module does not
   *   handle action sets. The first module returning nodes wins.
   *
   * @summary A group is a scope, exactly like a field: the buttons and their behaviour
   * belong to the controls module, so `FormBuilder` only hands the fieldset over and the
   * engine never learns that a button exists.
   */
  renderActions?: (fieldset: HTMLElement, spec: { actions: any; position?: "left" | "right" }) => HTMLElement[] | null;

  /**
   * Presents a status message to the user.
   *
   * @param content - Message content, possibly already filled by the caller.
   * @param target - Form the message belongs to and whether the action succeeded.
   *   The first loaded module implementing this hook handles the message.
   */
  notify?: (content: iMessageContent, target: iFormMessageTarget) => void;

  /**
   * Called after the form was reset, so a module can clear the state it owns.
   *
   * @summary `form.reset()` only resets controls the browser knows about — a preview
   * table, an uploader's file list or an address picker keep showing the old values
   * unless they are told.
   * @param form - The form that was just reset.
   */
  reset?: (form: HTMLFormElement) => void;
}

/**
 * Host context handed to a Form sub-module's `load()`.
 *
 * @summary Deliberately narrow: a sub-module receives the form element, the host
 * capabilities it may use, and lazily-built host contracts for the engines it
 * drives. It never receives the `FormBuilder` instance, so modules cannot reach
 * into builder internals.
 */
export interface iFormModuleContext {
  /** Public builder identifier of the host, for example `"form"`. */
  builder: string;

  /** Live form element the module attaches to. */
  form: HTMLFormElement;

  /** Raw input schema, as passed to `prepare()`. */
  inputs: any[];

  /** Current load phase, so a definition can restrict itself to one phase. */
  phase: FormModulePhase;

  /** Global event emitter, when the host was configured with one. */
  emit: ((event: string, payload: any) => void) | null;

  /**
   * Builder-level config to hand to the nested builders this module creates.
   *
   * @summary A field is its own builder, so without this it starts with an empty
   * config: no `themeId` for a themed adapter, and no `emit` — which is why a
   * field's `elementChanged` never reached the application bus while the form
   * itself could publish fine.
   */
  builderConfig: Partial<iBuilderConfig<any>>;

  /** Message host callback, wired to `FormBuilder.createMessage`. */
  showMessage: (content: iMessageContent) => void;

  /** Fully resolved Form configuration. */
  config: Required<iFormConfig>;

  /**
   * Builds the cascade host contract. A thunk because the host closes over
   * modules that may still be loading when this context is created.
   */
  cascadeHost: () => FormCascadeHost;

  /**
   * Builds the multistep host contract. A thunk for the same reason as
   * {@link cascadeHost}.
   */
  multistepHost: () => FormMultistepHost;
}
