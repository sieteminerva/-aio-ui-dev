/**
 * Input module registry.
 *
 * The input layer has its own sub-modules — controls nobody should pay for unless the
 * field asks for them: a dropdown (a whole builder), the uploader (~1.8k lines), the
 * action button set, and popovers. They are declared here as **definitions**, the same
 * shape `FormRegistry` uses, so:
 *
 * - `InputBuilder` renders a field without importing any of them,
 * - a project picks the definitions (`INPUT_MODULE_DEFINITIONS` or its own set) or injects its
 *   own `ModuleLoader` through `config.modules`,
 * - the set can later move into installable packages one definition at a time (fase 7).
 *
 * This is *not* the field-type matrix — that is `FieldTypes.ts`. This file decides who is
 * allowed to touch a field while it is being built.
 */
import type { iComponentModuleRef } from "@aio-ui/core";
import type { InputModuleDefinition, InputModulePreset } from "./InputModuleTypes";
export { INPUT_MODULE_IDS } from "./InputModuleTypes";
export type { InputModuleId, InputModuleItem, InputModulePreset, iInputAdapter, iInputModuleContext, InputModuleDefinition, } from "./InputModuleTypes";
/**
 * Every adapter the input layer itself provides — the default set.
 *
 * @summary Registration order is decorate order, so `controls` (the action set) runs
 * before `popover`, which anchors to a wrapper the controls may have changed. Named
 * "definitions" because that is what the items are: nothing here is instantiated until
 * a field, a form or a helper asks for it.
 */
export declare const INPUT_MODULE_DEFINITIONS: InputModuleDefinition[];
/**
 * The same stack as manifest refs, so a parent component can declare it without importing
 * classes and the registry can resolve one entry at a time.
 *
 * @summary `scope` is deliberately absent here: these are input-layer modules, and it is
 * the *nesting* component (`form`) that labels them `scope: "input"` when it re-declares
 * the list in its own manifest.
 */
export declare const INPUT_MODULE_MANIFEST: iComponentModuleRef[];
/** Ids of the definitions above, so a test can pin the two shapes together. */
export declare const INPUT_MODULE_DEFINITION_IDS: string[];
/**
 * Offers a subtree to every module in the preset.
 *
 * This is the only entry point a host needs for "fields that were not built by
 * `InputBuilder`" (raw HTML in a form, a multistep step that was just mounted): the
 * registry walks its own set, so the caller never names `FileUploader` — or any other
 * adapter — and a preset without the `file` module simply has nothing to mount.
 *
 * @param root - Subtree to scan.
 * @param preset - Definitions to resolve. Defaults to the core set.
 */
export declare function mountInputModules(root: Document | HTMLElement, preset?: InputModulePreset): void;
/**
 * Builds a control set for a scope — a field wrapper or a whole group.
 *
 * @param scope - Element the set acts on.
 * @param actions - Declared actions; the module normalises the shape.
 * @param position - Where the buttons sit relative to the scope.
 * @param preset - Definitions to resolve. Defaults to the core set.
 * @returns The controls node, or `null` when the preset has no controls module.
 *
 * @summary The group-level entry point: `FormBuilder` offers a `<fieldset>` here and never
 * learns that buttons exist, and a preset without the `controls` module simply has no
 * capability rather than a dead button set.
 */
export declare function mountControls(scope: HTMLElement, actions: any, position?: "left" | "right", preset?: InputModulePreset): HTMLElement | null;
/**
 * The files currently selected inside a form, keyed by input name.
 *
 * @param formId - Id of the form that owns the file inputs.
 * @param preset - Definitions to resolve. Defaults to the core set.
 * @returns Raw files; empty when the preset has no module that can read them.
 */
export declare function inputFilesOf(formId: string, preset?: InputModulePreset): Record<string, File[]>;
//# sourceMappingURL=InputRegistry.d.ts.map