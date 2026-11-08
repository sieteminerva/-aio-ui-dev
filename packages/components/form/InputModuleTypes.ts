/**
 * Input module contract — ids and types only.
 *
 * Kept in a leaf file on purpose: a module definition needs its own id, and importing
 * that id from `InputRegistry.ts` (which imports the definitions) would close a cycle and
 * leave `INPUT_MODULE_IDS` undefined while the definitions are being built. The Form family
 * solves the same problem the same way (`FormModuleTypes.ts`).
 */

import type { iModuleDefinition } from "@aio-ui/module-loader/ModuleRegistry";
import type { iBuilderConfig } from "@aio-ui/core/interface";
import type { iBasicInputNode } from "./Input";

/** Stable ids for input sub-modules. */
export const INPUT_MODULE_IDS = {
  dropdown: "dropdown",
  file: "file",
  controls: "controls",
  popover: "popover",
} as const;

/** Union of every input sub-module id. */
export type InputModuleId = (typeof INPUT_MODULE_IDS)[keyof typeof INPUT_MODULE_IDS];

/** What a module receives when it is loaded: the host builder's own configuration. */
export interface iInputModuleContext {
  /** Builder-level config of the hosting `InputBuilder` (`themeId`, `namespace`, `emit`). */
  builderConfig: iBuilderConfig<any>;
}

/**
 * Optional hooks an input sub-module may implement.
 *
 * Every hook is optional and every hook is a no-op when the module is not registered, so
 * removing a module from the preset degrades the field instead of breaking it.
 */
export interface iInputCollaborator {
  /**
   * Renders the control for a field type this module owns.
   *
   * @param field - Resolved field payload.
   * @param host - Host configuration.
   * @returns The control, or `null` when this module does not handle the type.
   */
  renderControl?: (field: iBasicInputNode, host: iInputModuleContext) => HTMLElement | null;

  /**
   * Adds markup or behaviour around a control that already exists.
   *
   * @param wrapper - The `.field` element.
   * @param control - The rendered control.
   * @param field - Resolved field payload.
   * @param host - Host configuration.
   */
  decorate?: (wrapper: HTMLElement, control: HTMLElement, field: iBasicInputNode, host: iInputModuleContext) => void;

  /**
   * Attaches to every input inside a subtree, including raw HTML fields that never went
   * through `InputBuilder.prepare()`.
   *
   * @param root - Subtree to scan. Must be idempotent.
   */
  mount?: (root: Document | HTMLElement) => void;

  /** Serializes the files selected inside a form (file module only). */
  collectFiles?: (formId: string) => Promise<Record<string, any>>;

  /** Parses the CSV/JSON file selected inside a form into table data (file module only). */
  parseCsv?: (formId: string) => Promise<{ header: any[]; body: any[]; footer: any }>;
}

/** Erased definition type for the preset arrays, where module results differ per id. */
export type InputModuleDefinition = iModuleDefinition<iInputModuleContext, iInputCollaborator>;
