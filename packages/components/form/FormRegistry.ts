import type { iModuleDefinition } from "@aio-ui/module-loader/ModuleRegistry";
import type { iFormModuleContext } from "./FormModuleTypes";
import { calculationFormAdapter } from "./adapters/Calculation";
import { cascadeFormAdapter } from "./adapters/Cascade";
import { multistepFormAdapter } from "./adapters/Multistep";
import { validationFormAdapter } from "./adapters/Validation";
import { idAddressFormAdapter } from "./IdAddress/IdAddress.FormAdapter";
import { inputFormAdapter } from "./Input.FormAdapter";

/** Erased definition type for the preset arrays, where module results differ per id. */
export type FormModuleDefinition = iModuleDefinition<iFormModuleContext, any>;

/**
 * Lite preset: field rendering only.
 *
 * @summary No engines and no optional adapters. The input module is still
 * required, because a form with no field renderer cannot produce anything.
 */
export const LITE_FORM_MODULES: FormModuleDefinition[] = [inputFormAdapter];

/**
 * Core preset: every engine and adapter the form has always provided.
 *
 * @summary This is the default set used when no loader is injected. Registration
 * order is also mount order for adapters, so `input` runs before `idAddress`,
 * matching the previous hardcoded sequence. `requires` drives dependency order.
 */
export const CORE_FORM_MODULES: FormModuleDefinition[] = [
  validationFormAdapter,
  cascadeFormAdapter,
  multistepFormAdapter,
  calculationFormAdapter,
  inputFormAdapter,
  idAddressFormAdapter,
];
