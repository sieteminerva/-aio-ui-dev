/**
 * Calculation vocabulary — what a field may carry, without importing the engine.
 *
 * @summary `InputBuilder` only needs to say "this field has a formula attached"
 * (`config.calculator`). Importing that type from `Handlers/Calculation` made the input
 * layer depend on a form handler, which would block shipping `@aio-ui/input` on its own.
 * The types live here; the engine (`Calculation.ts`) implements against them.
 */
export {};
//# sourceMappingURL=CalculationTypes.js.map