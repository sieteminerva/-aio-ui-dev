import type { iModuleDefinition } from "@aio-ui/module-loader";
import type { iFormModuleContext } from "../FormModuleTypes";
import type { iMessageContent } from "@aio-ui/message";
import type { iFormMessages } from "../FormMessages";
import type { CalculationPrimitive, CalculationValues, iCalculationFormula, iCalculationLineItem } from "@aio-ui/input/CalculationTypes";
export type { CalculationPrimitive, CalculationValues, iCalculationContext, iCalculationFormula, iCalculationLineItem, } from "@aio-ui/input/CalculationTypes";
export interface iCalculationStrategies {
    formula: Array<iCalculationFormula<any>>;
}
export interface iCalculationUpdate {
    form: HTMLFormElement;
    total: number;
    summary: iCalculationLineItem[];
    values: CalculationValues;
}
export interface iFormCalculationConfig {
    strategies: iCalculationStrategies;
    onUpdate?: (update: iCalculationUpdate) => void;
    /** User-configurable sentences; `messages.calculation.failed` explains a broken formula. */
    messages?: iFormMessages;
    /** Host message sink (the form's `showMessage`), so a failure is not just a console line. */
    notify?: (content: iMessageContent) => void;
}
/**
 * Form-owned calculation engine. Formula callbacks are ordinary typed
 * functions; no string evaluation or `eval` is used.
 */
export declare class FormCalculationHandler {
    private form;
    private config;
    private summary;
    private values;
    private onChange;
    private started;
    /**
     * Identity of the last reported failure set (`"a|b"`), empty when everything
     * worked. `recalculate()` runs on every keystroke, so without this a single
     * broken formula would emit a toast per input event.
     */
    private lastFailureKey;
    constructor(form: HTMLFormElement, config: iFormCalculationConfig);
    /** Attach delegated listeners and calculate the initial result. */
    create(): this;
    /** Read one current form value by control id or name. */
    get(inputId: string): CalculationPrimitive;
    getNumber(inputId: string): number;
    /**
     * Reports broken formulas through the host message sink.
     *
     * @param failures - Formulas that threw during this pass, in schema order.
     *
     * @summary Deduplicated by formula id: the same broken set never reports twice,
     * but a recovered-then-broken formula reports again. Recovery itself is silent —
     * a working total is its own feedback.
     */
    private reportFailures;
    /** Current form snapshot, keyed by id/name. */
    getValues(): CalculationValues;
    /** Current calculated total; optionally restrict to one schema group. */
    getTotal(groupId?: string): number;
    /** Current normalized summary rows; optionally restrict to one schema group. */
    getSummary(groupId?: string): iCalculationLineItem[];
    /** Re-run formulas and notify callback + form event listeners. */
    recalculate(): iCalculationUpdate;
    /** Remove listeners and drop computed state. */
    destroy(): void;
    private createContext;
    private collectValues;
    private isGroupMounted;
    private writeOutput;
}
declare global {
    interface HTMLFormElement {
        calculator?: FormCalculationHandler;
    }
}
/**
 * Form module definition for the calculation engine.
 *
 * @summary Active when the form declares `calculation`, and only in the
 * initialize phase, because it reads DOM that exists after submit listeners are
 * attached.
 *
 * @example
 * // registered by FORM_ADAPTER_DEFINITIONS; no manual wiring needed
 */
export declare const calculationFormAdapter: iModuleDefinition<iFormModuleContext, FormCalculationHandler>;
//# sourceMappingURL=Calculation.d.ts.map