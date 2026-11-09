import type { iModuleDefinition } from "@aio-ui/module-loader/ModuleRegistry";
import type { iFormModuleContext } from "@aio-ui/form/FormModuleTypes";
import { FORM_MODULE_IDS } from "@aio-ui/form/FormModuleTypes";
import { IdAddressBuilder } from "./id-address-builder";

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

  /** Whether the missing-configuration warning was already printed. */
  #warned = false;

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

    // The endpoint is the application's decision, not the component's. `address.loader` is
    // the preferred form (route it through the app's HTTP service or a mock); `url` (plus
    // an optional `service`) keeps the built-in path available.
    const address = this.#context.config.address;
    const hasSource = Boolean(address?.loader || address?.url || address?.service);

    if (!hasSource) {
      if (!this.#warned) {
        this.#warned = true;
        console.warn(
          "[FormBuilder] Address fields found, but no address source is configured. " +
          "Set config.address.loader(query) (preferred) or config.address.url."
        );
      }
      return;
    }

    this.#picker = new IdAddressBuilder({
      container: this.#context.form,
      url: address?.url ?? null,
      loader: address?.loader ?? null,
      service: address?.service ?? null,
      geocode: address?.geocode ?? false,
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
   * @param adapter - The adapter returned by `load()`.
   * @returns Nothing.
   */
  destroy: (adapter) => adapter.destroy(),
};
