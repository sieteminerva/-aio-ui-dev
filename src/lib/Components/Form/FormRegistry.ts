import type { iModuleDefinition } from "../../Modules/ModuleRegistry";
import type { iFormModuleContext } from "./FormModuleTypes";
import { calculationFormAdapter } from "./Handlers/Calculation";
import { cascadeFormAdapter } from "./Handlers/Cascade";
import { multistepFormAdapter } from "./Handlers/Multistep";
import { validationFormAdapter } from "./Handlers/Validation";
import { idAddressFormAdapter } from "./IdAddress/IdAddress.FormAdapter";
import { inputFormAdapter } from "./Input.FormAdapter";
import { messageFormAdapter } from "../Message/Message.FormAdapter";
import { tableFormAdapter } from "../Table/Table.FormAdapter";

/** Erased definition type for the preset arrays, where module results differ per id. */
export type FormModuleDefinition = iModuleDefinition<iFormModuleContext, any>;

/**
 * Lite preset: field rendering only.
 *
 * @summary No engines and no optional collaborators. The input module is still
 * required, because a form with no field renderer cannot produce anything.
 */
export const LITE_FORM_MODULES: FormModuleDefinition[] = [inputFormAdapter];

/**
 * Core preset: every engine and collaborator the form has always provided.
 *
 * @summary This is the default set used when no loader is injected. Registration
 * order is also mount order for collaborators, so `input` runs before `idAddress`,
 * matching the previous hardcoded sequence. `requires` drives dependency order.
 */
export const CORE_FORM_MODULES: FormModuleDefinition[] = [
  validationFormAdapter,
  cascadeFormAdapter,
  multistepFormAdapter,
  calculationFormAdapter,
  inputFormAdapter,
  idAddressFormAdapter,
  tableFormAdapter,
  messageFormAdapter,
];
