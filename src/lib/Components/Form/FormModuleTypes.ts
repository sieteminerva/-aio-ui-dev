import type { iMessageContent } from "../Message/Message";
import type { iFormConfig } from "./Form";
import type { FormCascadeHost } from "./Handlers/Cascade";
import type { FormMultistepHost } from "./Handlers/Multistep";

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

/** Target handed to {@link iFormCollaborator.renderTable}. */
export interface iFormTableTarget {
  /** Fieldset that will receive the table. */
  fieldset: HTMLElement;

  /** Submit button rendered for this group, to be wired by the table owner. */
  submitButton: HTMLButtonElement;

  /** Optional group id from the schema. */
  groupId?: string;
}

/** Target handed to {@link iFormCollaborator.notify}. */
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
 * present. That is how collaborators such as the uploader, the address picker,
 * and schema tables take part in rendering and submission without the builder
 * importing them.
 *
 * Every hook is optional; a module that only exposes an API ignores them.
 */
export interface iFormCollaborator {
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
   * Presents a status message to the user.
   *
   * @param content - Message content, possibly already filled by the caller.
   * @param target - Form the message belongs to and whether the action succeeded.
   *   The first loaded module implementing this hook handles the message.
   */
  notify?: (content: iMessageContent, target: iFormMessageTarget) => void;
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
