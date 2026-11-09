import type { iModuleDefinition } from "@aio-ui/module-loader/ModuleRegistry";
import type { iComponentModuleRef } from "@aio-ui/core/ComponentRegistry";
import { INPUT_MODULE_MANIFEST } from "@aio-ui/input/InputRegistry";
import type { iFormModuleContext } from "./FormModuleTypes";
import { calculationFormAdapter } from "./adapters/Calculation";
import { cascadeFormAdapter } from "./adapters/Cascade";
import { multistepFormAdapter } from "./adapters/Multistep";
import { validationFormAdapter } from "./adapters/Validation";
import { inputFormAdapter } from "./Input.FormAdapter";

/**
 * The form's adapter stack, in two shapes that must say the same thing.
 *
 * `FORM_ADAPTER_DEFINITIONS` is the live list: definitions the form instantiates through
 * its `ModuleLoader`. `FORM_ADAPTER_MANIFEST` is the same list as manifest `modules` refs,
 * so a host can declare the stack without importing classes and the registry can resolve
 * one entry at a time. Named "adapters" rather than "core modules" because that is what
 * they are — and because "core" made readers expect the input modules to be in here too.
 */

/** Erased definition type for the preset arrays, where module results differ per id. */
export type FormModuleDefinition = iModuleDefinition<iFormModuleContext, any>;

/**
 * Every adapter the form itself provides — the default set.
 *
 * @summary This is what makes `new FormBuilder({ schema })` render anything at all:
 * `input` is required for a field to exist, the four engines are the form's own behaviour
 * (they degrade to no-ops when absent — `Form` loads them by id and calls through `?.`).
 * Anything owned by another package (`table`, `message`, `id-address`) is composed by the
 * host instead, so this list is "what the form is", not "what a project may want".
 *
 * Registration order is also mount order for adapters, matching the previous hardcoded
 * sequence. `requires` drives dependency order.
 */
export const FORM_ADAPTER_DEFINITIONS: FormModuleDefinition[] = [
  validationFormAdapter,
  cascadeFormAdapter,
  multistepFormAdapter,
  calculationFormAdapter,
  inputFormAdapter,
];

/**
 * The same stack as manifest refs, plus the input sub-modules a form normally wants.
 *
 * @summary `scope` is what makes the split work: a parent that nests another builder
 * declares both layers here, and `Form.provideModules()` routes by id — `"input"` entries
 * become the field-level preset (`@aio-ui/input` owns them, the form only mounts them),
 * everything else stays with the form. Adapters owned by yet other packages (`table`,
 * `message`, `id-address`) are deliberately absent: the host composes those.
 */
export const FORM_ADAPTER_MANIFEST: iComponentModuleRef[] = [
  { id: "validation", path: "@aio-ui/form/validation-adapter", export: "validationFormAdapter", scope: "form" },
  { id: "cascade", path: "@aio-ui/form/cascade-adapter", export: "cascadeFormAdapter", scope: "form" },
  { id: "multistep", path: "@aio-ui/form/multistep-adapter", export: "multistepFormAdapter", scope: "form" },
  { id: "calculation", path: "@aio-ui/form/calculation-adapter", export: "calculationFormAdapter", scope: "form" },
  { id: "input", path: "@aio-ui/form/Input.FormAdapter", export: "inputFormAdapter", scope: "form" },
  // The input layer's own manifest, labelled with the layer it belongs to. Re-declaring
  // the four entries here by hand is how the two lists would drift apart.
  ...INPUT_MODULE_MANIFEST.map((ref) => ({ ...ref, scope: "input" })),
];

/** Ids of the definitions above, so a test can pin the two shapes together. */
export const FORM_ADAPTER_IDS: string[] = FORM_ADAPTER_DEFINITIONS.map((definition) => String(definition.id));
