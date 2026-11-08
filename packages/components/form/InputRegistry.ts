/**
 * Input module registry.
 *
 * The input layer has its own sub-modules — controls nobody should pay for unless the
 * field asks for them: a dropdown (a whole builder), the uploader (~1.8k lines), the
 * action button set, and popovers. They are declared here as **definitions**, the same
 * shape `FormRegistry` uses, so:
 *
 * - `InputBuilder` renders a field without importing any of them,
 * - a project picks a preset (`LITE_INPUT_MODULES` / `CORE_INPUT_MODULES`) or injects its
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
import type { InputModuleDefinition } from "./InputModuleTypes";

export { INPUT_MODULE_IDS } from "./InputModuleTypes";
export type { InputModuleId, iInputCollaborator, iInputModuleContext, InputModuleDefinition } from "./InputModuleTypes";

/**
 * Lite preset: the field itself and nothing else.
 *
 * @summary No dropdown builder, no uploader, no action controls. A form that only needs
 * `<input>`/`<select>`/`<textarea>` registers this and ships none of the rest.
 */
export const LITE_INPUT_MODULES: InputModuleDefinition[] = [];

/**
 * Core preset: every optional collaborator the input layer has always provided.
 *
 * @summary Registration order is decorate order, so `controls` (the action set) runs
 * before `popover`, which anchors to a wrapper the controls may have changed.
 */
export const CORE_INPUT_MODULES: InputModuleDefinition[] = [
  dropdownInputModule,
  fileUploaderInputModule,
  inputControlsInputModule,
  popoverInputModule,
];
