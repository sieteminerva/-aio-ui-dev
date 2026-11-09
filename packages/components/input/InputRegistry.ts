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

import { dropdownInputModule } from "./Dropdown/Dropdown.InputModule";
import { fileUploaderInputModule } from "./FileUploader/FileUploader.InputModule";
import { inputControlsInputModule } from "./InputControls/InputControls.InputModule";
import { popoverInputModule } from "./Popover.InputModule";
import { ModuleLoader } from "@aio-ui/module-loader";
import type { iComponentModuleRef } from "@aio-ui/core";
import type {
  InputModuleDefinition,
  InputModuleItem,
  InputModulePreset,
  iInputAdapter,
  iInputModuleContext,
} from "./InputModuleTypes";

export { INPUT_MODULE_IDS } from "./InputModuleTypes";
export type {
  InputModuleId,
  InputModuleItem,
  InputModulePreset,
  iInputAdapter,
  iInputModuleContext,
  InputModuleDefinition,
} from "./InputModuleTypes";

/** Whether a preset item is a definition (needs loading) or a live adapter. */
function isDefinition(item: InputModuleItem): item is InputModuleDefinition {
  return typeof (item as InputModuleDefinition).load === "function";
}

/**
 * Turns any accepted preset into adapters, plus a disposer for the ones it created.
 *
 * @param preset - Definitions, live adapters, or a mix of both.
 * @param context - Host configuration handed to freshly loaded modules.
 * @returns The adapters to use and the matching cleanup.
 */
function adaptersOf(
  preset: InputModulePreset,
  context: iInputModuleContext
): { adapters: iInputAdapter[]; dispose: () => void } {
  const definitions = preset.filter(isDefinition);
  const live = preset.filter((item): item is iInputAdapter => !isDefinition(item));

  if (!definitions.length) {
    // Everything was already resolved by the caller (a parent's manifest): never re-load.
    return { adapters: live, dispose: () => { } };
  }

  const loader = new ModuleLoader<iInputModuleContext, iInputAdapter>("input", definitions);
  return { adapters: [...loader.resolveAll(context), ...live], dispose: () => loader.unloadAll() };
}

/**
 * Every adapter the input layer itself provides — the default set.
 *
 * @summary Registration order is decorate order, so `controls` (the action set) runs
 * before `popover`, which anchors to a wrapper the controls may have changed. Named
 * "definitions" because that is what the items are: nothing here is instantiated until
 * a field, a form or a helper asks for it.
 */
export const INPUT_MODULE_DEFINITIONS: InputModuleDefinition[] = [
  dropdownInputModule,
  fileUploaderInputModule,
  inputControlsInputModule,
  popoverInputModule,
];

/**
 * The same stack as manifest refs, so a parent component can declare it without importing
 * classes and the registry can resolve one entry at a time.
 *
 * @summary `scope` is deliberately absent here: these are input-layer modules, and it is
 * the *nesting* component (`form`) that labels them `scope: "input"` when it re-declares
 * the list in its own manifest.
 */
export const INPUT_MODULE_MANIFEST: iComponentModuleRef[] = [
  { id: "dropdown", path: "@aio-ui/input/dropdown/module", export: "dropdownInputModule" },
  { id: "file", path: "@aio-ui/input/file-uploader/module", export: "fileUploaderInputModule" },
  { id: "controls", path: "@aio-ui/input/controls/module", export: "inputControlsInputModule" },
  { id: "popover", path: "@aio-ui/input/popover/module", export: "popoverInputModule" },
];

/** Ids of the definitions above, so a test can pin the two shapes together. */
export const INPUT_MODULE_DEFINITION_IDS: string[] = INPUT_MODULE_DEFINITIONS.map((definition) => String(definition.id));

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
export function mountInputModules(root: Document | HTMLElement, preset: InputModulePreset = INPUT_MODULE_DEFINITIONS): void {
  const { adapters, dispose } = adaptersOf(preset, { builderConfig: { themeId: "default" } });
  for (const module of adapters) module.mount?.(root);
  dispose();
}

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
export function mountControls(
  scope: HTMLElement,
  actions: any,
  position: "left" | "right" = "right",
  preset: InputModulePreset = INPUT_MODULE_DEFINITIONS
): HTMLElement | null {
  const { adapters, dispose } = adaptersOf(preset, { builderConfig: { themeId: "default" } });
  const module = adapters.find((m) => typeof m.renderActions === "function");
  const node = module?.renderActions?.(scope, { actions, position }) ?? null;
  dispose();
  return node;
}

/**
 * The files currently selected inside a form, keyed by input name.
 *
 * @param formId - Id of the form that owns the file inputs.
 * @param preset - Definitions to resolve. Defaults to the core set.
 * @returns Raw files; empty when the preset has no module that can read them.
 */
export function inputFilesOf(formId: string, preset: InputModulePreset = INPUT_MODULE_DEFINITIONS): Record<string, File[]> {
  const { adapters, dispose } = adaptersOf(preset, { builderConfig: { themeId: "default" } });
  const module = adapters.find((m) => typeof m.getFiles === "function");
  const files = module?.getFiles ? module.getFiles(formId) : {};
  dispose();
  return files;
}
