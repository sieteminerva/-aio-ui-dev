import type { iModuleDefinition } from "../../../Modules/ModuleRegistry";
import { FORM_MODULE_IDS } from "../FormModuleTypes";
import type { iFormModuleContext } from "../FormModuleTypes";

export type CalculationPrimitive = string | number | boolean | null;
export type CalculationValues = Record<string, CalculationPrimitive>;

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

export interface iCalculationContext<TData = unknown> {
  form: HTMLFormElement;
  groupId?: string;
  data?: TData;
  values: Readonly<CalculationValues>;
  get: (inputId: string) => CalculationPrimitive;
  getNumber: (inputId: string) => number;
}

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
}

/**
 * Form-owned calculation engine. Formula callbacks are ordinary typed
 * functions; no string evaluation or `eval` is used.
 */
export class FormCalculationHandler {
  private form: HTMLFormElement;
  private config: iFormCalculationConfig;
  private summary: iCalculationLineItem[] = [];
  private values: CalculationValues = {};
  private onChange: ((event: Event) => void) | null = null;
  private started = false;

  constructor(form: HTMLFormElement, config: iFormCalculationConfig) {
    this.form = form;
    this.config = config;
  }

  /** Attach delegated listeners and calculate the initial result. */
  create(): this {
    if (this.started) return this;
    this.started = true;
    this.onChange = () => this.recalculate();
    this.form.addEventListener("input", this.onChange);
    this.form.addEventListener("change", this.onChange);
    // Conditions can mount/unmount fields without a native input event.
    this.form.addEventListener("formCascade", this.onChange);
    this.recalculate();
    return this;
  }

  /** Read one current form value by control id or name. */
  get(inputId: string): CalculationPrimitive {
    const escaped = CSS.escape(inputId);
    const control = this.form.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      `#${escaped}, [name="${escaped}"]`,
    );
    if (!control) return null;
    if (control instanceof HTMLInputElement) {
      if (control.type === "checkbox") return control.checked;
      if (control.type === "radio") {
        const selected = this.form.querySelector<HTMLInputElement>(`input[type="radio"][name="${CSS.escape(control.name)}"]:checked`);
        return selected?.value ?? null;
      }
      if (control.type === "number" || control.type === "range") {
        return control.value === "" ? null : control.valueAsNumber;
      }
    }
    if (control instanceof HTMLSelectElement && control.multiple) {
      return control.selectedOptions.length ? Array.from(control.selectedOptions, (option) => option.value).join(",") : null;
    }
    return control.value === "" ? null : control.value;
  }

  getNumber(inputId: string): number {
    const value = this.get(inputId);
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value === "boolean" || value === null) return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  /** Current form snapshot, keyed by id/name. */
  getValues(): CalculationValues {
    return { ...this.values };
  }

  /** Current calculated total; optionally restrict to one schema group. */
  getTotal(groupId?: string): number {
    return this.getSummary(groupId).reduce((total, item) => total + item.total, 0);
  }

  /** Current normalized summary rows; optionally restrict to one schema group. */
  getSummary(groupId?: string): iCalculationLineItem[] {
    const rows = groupId ? this.summary.filter((item) => item.groupId === groupId) : this.summary;
    return rows.map((item) => ({ ...item, details: item.details ? { ...item.details } : undefined }));
  }

  /** Re-run formulas and notify callback + form event listeners. */
  recalculate(): iCalculationUpdate {
    this.values = this.collectValues();
    const summary: iCalculationLineItem[] = [];

    for (const strategy of this.config.strategies.formula ?? []) {
      if (strategy.groupId && !this.isGroupMounted(strategy.groupId)) {
        this.writeOutput(strategy.outputId, "");
        continue;
      }
      const context = this.createContext(strategy);
      try {
        if (strategy.when && !strategy.when(context)) {
          this.writeOutput(strategy.outputId, "");
          continue;
        }
        const result = strategy.formula(context);
        if (!result || !Number.isFinite(Number(result.total))) {
          this.writeOutput(strategy.outputId, "");
          continue;
        }
        const total = Number(result.total);
        this.writeOutput(strategy.outputId, String(total));
        summary.push({
          ...result,
          id: result.id || strategy.id,
          groupId: result.groupId ?? strategy.groupId,
          quantity: Number(result.quantity) || 0,
          unitPrice: Number(result.unitPrice) || 0,
          total,
        });
      } catch (error) {
        this.writeOutput(strategy.outputId, "");
        console.warn(`[Form Calculation] Formula "${strategy.id}" failed:`, error);
      }
    }

    this.summary = summary;
    const update: iCalculationUpdate = {
      form: this.form,
      total: this.getTotal(),
      summary: this.getSummary(),
      values: this.getValues(),
    };
    try {
      this.config.onUpdate?.(update);
    } catch (error) {
      console.warn("[Form Calculation] onUpdate callback failed:", error);
    }
    this.form.dispatchEvent(new CustomEvent<iCalculationUpdate>("formCalculation", {
      bubbles: true,
      detail: update,
    }));
    return update;
  }

  /** Remove listeners and drop computed state. */
  destroy(): void {
    if (this.onChange) {
      this.form.removeEventListener("input", this.onChange);
      this.form.removeEventListener("change", this.onChange);
      this.form.removeEventListener("formCascade", this.onChange);
    }
    this.onChange = null;
    this.started = false;
    this.summary = [];
    this.values = {};
    if (this.form.calculator === this) delete this.form.calculator;
  }

  private createContext<TData>(strategy: iCalculationFormula<TData>): iCalculationContext<TData> {
    const get = (inputId: string) => this.get(inputId);
    return {
      form: this.form,
      groupId: strategy.groupId,
      data: strategy.data,
      values: this.getValues(),
      get,
      getNumber: (inputId) => {
        const value = get(inputId);
        if (typeof value === "number") return Number.isFinite(value) ? value : 0;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
      },
    };
  }

  private collectValues(): CalculationValues {
    const values: CalculationValues = {};
    this.form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      "input[id], input[name], select[id], select[name], textarea[id], textarea[name]",
    ).forEach((control) => {
      const key = control.id || control.name;
      if (key) values[key] = this.get(key);
    });
    return values;
  }

  private isGroupMounted(groupId: string): boolean {
    const group = this.form.querySelector<HTMLElement>(`#${CSS.escape(groupId)}`);
    return Boolean(group && this.form.contains(group));
  }

  private writeOutput(inputId: string | undefined, value: string): void {
    if (!inputId) return;
    const output = this.form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${CSS.escape(inputId)}`);
    if (output && output.value !== value) output.value = value;
  }
}

declare global {
  interface HTMLFormElement {
    calculator?: FormCalculationHandler;
  }
}

/**
 * Collects per-input calculation strategies, inferring the nearest group id.
 *
 * @summary Walks the raw schema tree and turns every `config.calculator` entry
 * into a typed formula.
 * @param inputs - Raw input schema passed to `prepare()`.
 * @returns Formula definitions in schema order.
 */
function collectFormulas(inputs: any[]): iCalculationFormula<any>[] {
  const formulas: iCalculationFormula<any>[] = [];

  const visit = (items: any[], parentGroupId?: string): void => {
    for (const item of items ?? []) {
      if (!item || typeof item !== "object" || item instanceof Node) continue;

      const formula = item.config?.calculator;
      if (formula && typeof formula.formula === "function") {
        formulas.push({
          ...formula,
          groupId: formula.groupId ?? parentGroupId,
          outputId: formula.outputId ?? item.id,
        });
      }

      if (Array.isArray(item.group)) visit(item.group, item.id ?? parentGroupId);
    }
  };

  visit(inputs);
  return formulas;
}

/**
 * Form module definition for the calculation engine.
 *
 * @summary Active when the form declares `calculation`, and only in the
 * initialize phase, because it reads DOM that exists after submit listeners are
 * attached.
 *
 * @example
 * // registered by CORE_FORM_MODULES; no manual wiring needed
 */
export const calculationFormAdapter: iModuleDefinition<iFormModuleContext, FormCalculationHandler> = {
  id: FORM_MODULE_IDS.calculation,

  /**
   * Calculation only runs when the form opts in, in the initialize phase.
   *
   * @param context - Host context.
   * @returns `true` when the calculation engine should load.
   */
  matches: (context) => context.config.calculation === true && context.phase === "initialize",

  /**
   * Attaches the calculation engine to the live form and exposes it on the element.
   *
   * @param context - Host context.
   * @returns The running calculation engine.
   */
  load: (context) => {
    // Step 1: Build the formula set from the schema.
    const handler = new FormCalculationHandler(context.form, {
      strategies: { formula: collectFormulas(context.inputs) },
    }).create();

    // Step 2: Expose the engine on the form element, as the legacy path did.
    context.form.calculator = handler;
    return handler;
  },

  /**
   * Removes calculation listeners and computed state.
   *
   * @param handler - The engine returned by `load()`.
   * @returns Nothing.
   */
  destroy: (handler) => handler.destroy(),
};
