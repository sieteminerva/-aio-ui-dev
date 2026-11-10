import type { iModuleDefinition } from "@aio-ui/module-loader";
import { type iInputAdapter, type iInputModuleContext } from "../InputModuleTypes";
/**
 * Accepts both action shapes — an array (mixed names and objects) or `{ [type]: definition }`.
 *
 * @param configured - Declared actions.
 * @returns Array form, with composite presets expanded and `type` filled in.
 *
 * @example
 * normaliseActions(["editor", { type: "copy", label: "Copy", onClick }])
 * // → edit, save, copy
 */
export declare function normaliseActions(configured: any): Array<Record<string, any> & {
    type: string;
}>;
/**
 * Action controls module definition.
 *
 * @example
 * // registered by INPUT_MODULE_DEFINITIONS; drop it and `config.actions` silently renders nothing
 */
export declare const inputControlsInputModule: iModuleDefinition<iInputModuleContext, iInputAdapter>;
//# sourceMappingURL=InputControls.InputModule.d.ts.map