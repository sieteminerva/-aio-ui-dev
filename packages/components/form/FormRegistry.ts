import type { iModuleDefinition } from "@aio-ui/module-loader/ModuleRegistry";
import type { iFormModuleContext } from "./FormModuleTypes";
import { calculationFormAdapter } from "./adapters/Calculation";
import { cascadeFormAdapter } from "./adapters/Cascade";
import { multistepFormAdapter } from "./adapters/Multistep";
import { validationFormAdapter } from "./adapters/Validation";
import { inputFormAdapter } from "./Input.FormAdapter";

/** Erased definition type for the preset arrays, where module results differ per id. */
export type FormModuleDefinition = iModuleDefinition<iFormModuleContext, any>;

/**
 * Core preset: every engine and adapter the form has always provided.
 *
 * @summary This is the default set used when no loader is injected, so it is what makes
 * `new FormBuilder({ schema })` render anything at all: `input` is required for a field
 * to exist, the four engines are the form's own behaviour (they degrade to no-ops when
 * absent — `Form` loads them by id and calls through `?.`). Everything that belongs to
 * another package (`table`, `message`, `id-address`) is composed by the host instead, so
 * this list is "what the form is", not "what a project may want".
 *
 * @summary Registration order is also mount order for adapters, so `input` runs before
 * `idAddress`, matching the previous hardcoded sequence. `requires` drives dependency order.
 */
export const CORE_FORM_MODULES: FormModuleDefinition[] = [
  validationFormAdapter,
  cascadeFormAdapter,
  multistepFormAdapter,
  calculationFormAdapter,
  inputFormAdapter,
];
