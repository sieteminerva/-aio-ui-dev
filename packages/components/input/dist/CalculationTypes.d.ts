/**
 * Calculation vocabulary — what a field may carry, without importing the engine.
 *
 * @summary `InputBuilder` only needs to say "this field has a formula attached"
 * (`config.calculator`). Importing that type from `Handlers/Calculation` made the input
 * layer depend on a form handler, which would block shipping `@aio-ui/input` on its own.
 * The types live here; the engine (`Calculation.ts`) implements against them.
 */
/** A value a formula may read or produce. */
export type CalculationPrimitive = string | number | boolean | null;
/** Snapshot of the form's values, keyed by field id. */
export type CalculationValues = Record<string, CalculationPrimitive>;
/** One row a formula produces (a summary line). */
export interface iCalculationLineItem {
    id: string;
    groupId?: string;
    label: string;
    specification?: string;
    quantity: number;
    unitPrice: number;
    total: number;
    details?: Record<string, unknown>;
}
/** What a formula receives when it runs. */
export interface iCalculationContext<TData = unknown> {
    form: HTMLFormElement;
    groupId?: string;
    data?: TData;
    values: Readonly<CalculationValues>;
    get: (inputId: string) => CalculationPrimitive;
    getNumber: (inputId: string) => number;
}
/** A strategy attached to an input (`config.calculator`). */
export interface iCalculationFormula<TData = unknown> {
    id: string;
    groupId?: string;
    /** Optional readonly/text control to receive this formula's total. */
    outputId?: string;
    data?: TData;
    /** Optional predicate for custom activation logic, in addition to group visibility. */
    when?: (context: iCalculationContext<TData>) => boolean;
    /** Return null when this formula should not produce a summary row. */
    formula: (context: iCalculationContext<TData>) => iCalculationLineItem | null;
}
//# sourceMappingURL=CalculationTypes.d.ts.map