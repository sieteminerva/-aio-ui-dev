import type { iModuleDefinition } from "../../../Modules/ModuleRegistry";
import type { iFormModuleContext } from "../FormModuleTypes";
import { FORM_MODULE_IDS } from "../FormModuleTypes";
import { IdAddressBuilder } from "./id-address-builder";

/** Endpoint used by the address cascade when a form declares `[data-level]` fields. */
const DEPLOYMENT_ID = "AKfycbwjQ_iNQClJuyf5z1ZlJcJ-j6LEnINfvbBmjBFlE4T3X4dVAoxF_GzUCCv6TXZ_apfhpA";
const API_URL = `https://script.google.com/macros/s/${DEPLOYMENT_ID}/exec`;

/**
 * Address picker adapter.
 *
 * @summary Owns `IdAddressBuilder`: builds the picker lazily once the form shows
 * enough `[data-level]` controls, and contributes resolved address names to the
 * submit payload.
 */
class IdAddressFormAdapter {
  /** Host context captured at load time. */
  readonly #context: iFormModuleContext;

  /** Live picker, once the form is ready for it. */
  #picker: IdAddressBuilder | null = null;

  /**
   * @param context - Host context.
   */
  constructor(context: iFormModuleContext) {
    this.#context = context;
  }

  /**
   * Builds the picker the first time the form exposes address levels.
   *
   * @summary Re-checked on every mount because multistep steps that carry
   * `[data-level]` controls are born lazily, after the form-level mount.
   * @param _root - Form element or freshly mounted fieldset; the picker always
   *   binds to the whole form, so the argument is unused.
   * @returns Nothing.
   */
  public mount(_root: HTMLElement): void {
    if (this.#picker) return;
    if (this.#context.form.querySelectorAll("[data-level]").length <= 1) return;

    this.#picker = new IdAddressBuilder({
      container: this.#context.form,
      url: API_URL,
      geocode: false,
    });
    this.#picker.init();
  }

  /**
   * Copies resolved address names into the submit payload.
   *
   * @param payload - Mutable submit payload.
   * @returns Nothing.
   */
  public beforeSubmit(payload: Record<string, any>): void {
    const detail = this.#picker?.detail;
    if (!detail) return;

    for (const key of Object.keys(detail)) {
      if (!key.endsWith("_name")) continue;

      // Step 1: `<level>_name` feeds the `<level>` control so the payload stays flat.
      const outputKey = key.replace("_name", "");
      if (outputKey in payload) payload[outputKey] = String(detail[key as keyof typeof detail]).toLowerCase();
    }
  }

  /** Removes picker listeners and cached state. */
  public destroy(): void {
    this.#picker?.destroy();
    this.#picker = null;
  }
}

/**
 * Address picker module definition.
 *
 * @summary Always loaded: applicability depends on rendered DOM, which does not
 * exist yet when modules are loaded.
 *
 * @example
 * // registered by CORE_FORM_MODULES; no manual wiring needed
 */
export const idAddressFormAdapter: iModuleDefinition<iFormModuleContext, IdAddressFormAdapter> = {
  id: FORM_MODULE_IDS.idAddress,

  /**
   * Builds the address adapter for the host form.
   *
   * @param context - Host context.
   * @returns The live adapter.
   */
  load: (context) => new IdAddressFormAdapter(context),

  /**
   * Destroys the address picker.
   *
   * @param collaborator - The collaborator returned by `load()`.
   * @returns Nothing.
   */
  destroy: (collaborator) => collaborator.destroy(),
};
