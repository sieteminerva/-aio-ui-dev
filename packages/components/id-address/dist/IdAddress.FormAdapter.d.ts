import type { iModuleDefinition } from "@aio-ui/module-loader";
import type { iFormModuleContext } from "@aio-ui/form/FormModuleTypes";
/**
 * Address picker adapter.
 *
 * @summary Owns `IdAddressBuilder`: builds the picker lazily once the form shows
 * enough `[data-level]` controls, and contributes resolved address names to the
 * submit payload.
 */
declare class IdAddressFormAdapter {
    #private;
    /**
     * @param context - Host context.
     */
    constructor(context: iFormModuleContext);
    /**
     * Builds the picker the first time the form exposes address levels.
     *
     * @summary Re-checked on every mount because multistep steps that carry
     * `[data-level]` controls are born lazily, after the form-level mount.
     * @param _root - Form element or freshly mounted fieldset; the picker always
     *   binds to the whole form, so the argument is unused.
     * @returns Nothing.
     */
    mount(_root: HTMLElement): void;
    /**
     * Copies resolved address names into the submit payload.
     *
     * @param payload - Mutable submit payload.
     * @returns Nothing.
     */
    beforeSubmit(payload: Record<string, any>): void;
    /** Removes picker listeners and cached state. */
    destroy(): void;
}
/**
 * Address picker module definition.
 *
 * @summary Always loaded: applicability depends on rendered DOM, which does not
 * exist yet when modules are loaded.
 *
 * @example
 * // registered by FORM_ADAPTER_DEFINITIONS; no manual wiring needed
 */
export declare const idAddressFormAdapter: iModuleDefinition<iFormModuleContext, IdAddressFormAdapter>;
export {};
//# sourceMappingURL=IdAddress.FormAdapter.d.ts.map