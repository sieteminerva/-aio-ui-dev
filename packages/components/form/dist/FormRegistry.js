import { INPUT_MODULE_MANIFEST } from "@aio-ui/input/InputRegistry";
import { calculationFormAdapter } from "./adapters/Calculation.js";
import { cascadeFormAdapter } from "./adapters/Cascade.js";
import { multistepFormAdapter } from "./adapters/Multistep.js";
import { validationFormAdapter } from "./adapters/Validation.js";
import { inputFormAdapter } from "./Input.FormAdapter.js";
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
export const FORM_ADAPTER_DEFINITIONS = [
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
export const FORM_ADAPTER_MANIFEST = [
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
export const FORM_ADAPTER_IDS = FORM_ADAPTER_DEFINITIONS.map((definition) => String(definition.id));
//# sourceMappingURL=FormRegistry.js.map