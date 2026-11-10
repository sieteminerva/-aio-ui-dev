import { FORM_MODULE_IDS } from "../FormModuleTypes.js";
import { composeMessage, messageDraft, resolveStyle } from "../FormMessages.js";
/**
 * Form-owned calculation engine. Formula callbacks are ordinary typed
 * functions; no string evaluation or `eval` is used.
 */
export class FormCalculationHandler {
    form;
    config;
    summary = [];
    values = {};
    onChange = null;
    started = false;
    /**
     * Identity of the last reported failure set (`"a|b"`), empty when everything
     * worked. `recalculate()` runs on every keystroke, so without this a single
     * broken formula would emit a toast per input event.
     */
    lastFailureKey = "";
    constructor(form, config) {
        this.form = form;
        this.config = config;
    }
    /** Attach delegated listeners and calculate the initial result. */
    create() {
        if (this.started)
            return this;
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
    get(inputId) {
        const escaped = CSS.escape(inputId);
        const control = this.form.querySelector(`#${escaped}, [name="${escaped}"]`);
        if (!control)
            return null;
        if (control instanceof HTMLInputElement) {
            if (control.type === "checkbox")
                return control.checked;
            if (control.type === "radio") {
                const selected = this.form.querySelector(`input[type="radio"][name="${CSS.escape(control.name)}"]:checked`);
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
    getNumber(inputId) {
        const value = this.get(inputId);
        if (typeof value === "number")
            return Number.isFinite(value) ? value : 0;
        if (typeof value === "boolean" || value === null)
            return 0;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    /**
     * Reports broken formulas through the host message sink.
     *
     * @param failures - Formulas that threw during this pass, in schema order.
     *
     * @summary Deduplicated by formula id: the same broken set never reports twice,
     * but a recovered-then-broken formula reports again. Recovery itself is silent —
     * a working total is its own feedback.
     */
    reportFailures(failures) {
        const key = failures.map((failure) => failure.id).sort().join("|");
        if (key === this.lastFailureKey)
            return;
        this.lastFailureKey = key;
        if (failures.length === 0)
            return;
        // The console line is the debugging trail; the toast is the user-facing one.
        for (const failure of failures) {
            console.warn(`[Form Calculation] Formula "${failure.id}" failed:`, failure.error);
        }
        if (typeof this.config.notify !== "function")
            return;
        const compose = messageDraft({
            category: "calculation",
            slot: "failed",
            code: "FORMULA_FAILED",
            formId: this.form.id,
            fallback: `Perhitungan ${failures[0].id} tidak dapat dijalankan.`,
            params: { formula: failures[0].id },
        });
        const style = resolveStyle(this.config.messages, compose);
        this.config.notify({
            header: style.title || undefined,
            message: composeMessage(this.config.messages, compose),
            type: style.type || undefined,
            icon: style.icon || undefined,
        });
    }
    /** Current form snapshot, keyed by id/name. */
    getValues() {
        return { ...this.values };
    }
    /** Current calculated total; optionally restrict to one schema group. */
    getTotal(groupId) {
        return this.getSummary(groupId).reduce((total, item) => total + item.total, 0);
    }
    /** Current normalized summary rows; optionally restrict to one schema group. */
    getSummary(groupId) {
        const rows = groupId ? this.summary.filter((item) => item.groupId === groupId) : this.summary;
        return rows.map((item) => ({ ...item, details: item.details ? { ...item.details } : undefined }));
    }
    /** Re-run formulas and notify callback + form event listeners. */
    recalculate() {
        this.values = this.collectValues();
        const summary = [];
        const failures = [];
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
            }
            catch (error) {
                this.writeOutput(strategy.outputId, "");
                failures.push({ id: strategy.id, error });
            }
        }
        // Announce once per changed failure set — a formula broken on load is visible,
        // and typing does not turn it into a toast storm.
        this.reportFailures(failures);
        this.summary = summary;
        const update = {
            form: this.form,
            total: this.getTotal(),
            summary: this.getSummary(),
            values: this.getValues(),
        };
        try {
            this.config.onUpdate?.(update);
        }
        catch (error) {
            console.warn("[Form Calculation] onUpdate callback failed:", error);
        }
        this.form.dispatchEvent(new CustomEvent("formCalculation", {
            bubbles: true,
            detail: update,
        }));
        return update;
    }
    /** Remove listeners and drop computed state. */
    destroy() {
        if (this.onChange) {
            this.form.removeEventListener("input", this.onChange);
            this.form.removeEventListener("change", this.onChange);
            this.form.removeEventListener("formCascade", this.onChange);
        }
        this.onChange = null;
        this.started = false;
        this.summary = [];
        this.values = {};
        if (this.form.calculator === this)
            delete this.form.calculator;
    }
    createContext(strategy) {
        const get = (inputId) => this.get(inputId);
        return {
            form: this.form,
            groupId: strategy.groupId,
            data: strategy.data,
            values: this.getValues(),
            get,
            getNumber: (inputId) => {
                const value = get(inputId);
                if (typeof value === "number")
                    return Number.isFinite(value) ? value : 0;
                const parsed = Number(value);
                return Number.isFinite(parsed) ? parsed : 0;
            },
        };
    }
    collectValues() {
        const values = {};
        this.form.querySelectorAll("input[id], input[name], select[id], select[name], textarea[id], textarea[name]").forEach((control) => {
            const key = control.id || control.name;
            if (key)
                values[key] = this.get(key);
        });
        return values;
    }
    isGroupMounted(groupId) {
        const group = this.form.querySelector(`#${CSS.escape(groupId)}`);
        return Boolean(group && this.form.contains(group));
    }
    writeOutput(inputId, value) {
        if (!inputId)
            return;
        const output = this.form.querySelector(`#${CSS.escape(inputId)}`);
        if (output && output.value !== value)
            output.value = value;
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
function collectFormulas(inputs) {
    const formulas = [];
    const visit = (items, parentGroupId) => {
        for (const item of items ?? []) {
            if (!item || typeof item !== "object" || item instanceof Node)
                continue;
            const formula = item.config?.calculator;
            if (formula && typeof formula.formula === "function") {
                formulas.push({
                    ...formula,
                    groupId: formula.groupId ?? parentGroupId,
                    outputId: formula.outputId ?? item.id,
                });
            }
            if (Array.isArray(item.group))
                visit(item.group, item.id ?? parentGroupId);
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
 * // registered by FORM_ADAPTER_DEFINITIONS; no manual wiring needed
 */
export const calculationFormAdapter = {
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
            // Sentences come from the form config, delivery from the form's message host.
            messages: context.config?.messages,
            notify: (content) => context.showMessage(content),
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
//# sourceMappingURL=Calculation.js.map