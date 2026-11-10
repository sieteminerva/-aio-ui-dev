/**
 * Submit values — what a form actually contains.
 *
 * `Object.fromEntries(new FormData(form))` is not enough for a form builder: it drops every
 * unchecked checkbox, collapses a group of checkboxes that share a name to the last value,
 * and keeps only the last selected option of a multi-select. A payload that lies is worse
 * than no payload, because the consumer cannot tell the difference.
 *
 * The rules are deliberately explicit:
 *
 * | Control                  | Value                                             |
 * | ------------------------ | ------------------------------------------------- |
 * | text / number / date / … | the string in the field                           |
 * | `select`                 | the selected value                                |
 * | `select[multiple]`       | array of selected values                          |
 * | `checkbox` (lone)        | `true` / `false` — "not ticked" is information    |
 * | `checkbox` (shared name) | array of the ticked values                        |
 * | `radio` group            | value of the checked option, or omitted           |
 * | `file`                   | never — uploads are a decision (`config.files`)   |
 *
 * Disabled controls and buttons are skipped, exactly like a real submission would.
 */
/** Controls that never contribute a value to the payload. */
const SKIPPED_TYPES = new Set(["file", "submit", "button", "reset", "image"]);
/**
 * Reads every successful control of a form — or of any container holding controls.
 *
 * @param form - Live form element, a `<fieldset>` group, or any wrapper (a `.field`).
 * @param options - Collection options; see {@link iCollectValuesOptions}.
 * @returns Payload keyed by control name.
 *
 * @summary A `<fieldset>` and a `.field` wrapper are scopes a control set can own, and
 * `search` has to read them with the same vocabulary a submit uses — one definition of
 * "what this form holds", not two that drift apart. `elements` is used when the root has
 * it (it skips nothing and keeps document order); a plain wrapper falls back to a query.
 */
export function collectFormValues(form, options = {}) {
    const controls = Array.from((typeof HTMLFieldSetElement !== "undefined" && form instanceof HTMLFieldSetElement) || form instanceof HTMLFormElement
        ? form.elements
        : form.querySelectorAll("input, select, textarea"));
    const entries = [];
    for (const control of controls) {
        if (!control || !control.name)
            continue;
        if (SKIPPED_TYPES.has(control.type))
            continue;
        if (control.disabled)
            continue;
        if (control instanceof HTMLInputElement && (control.type === "checkbox" || control.type === "radio")) {
            entries.push({ name: control.name, kind: "toggle", toggle: control.type, value: control.value, checked: control.checked });
            continue;
        }
        if (control instanceof HTMLSelectElement && control.multiple) {
            entries.push({
                name: control.name,
                kind: "field",
                toggle: null,
                value: Array.from(control.selectedOptions).map((option) => option.value),
                checked: true,
            });
            continue;
        }
        entries.push({
            name: control.name,
            kind: "field",
            toggle: null,
            value: control.value,
            checked: true,
        });
    }
    return options.excludeEmpty ? stripEmpty(assemble(entries)) : assemble(entries);
}
/**
 * Removes values a consumer would treat as "nothing".
 *
 * @param data - Assembled payload.
 * @returns Payload without `""`, `false` and empty arrays.
 */
function stripEmpty(data) {
    const kept = {};
    for (const [name, value] of Object.entries(data)) {
        if (value === "" || value === false)
            continue;
        if (Array.isArray(value) && value.length === 0)
            continue;
        kept[name] = value;
    }
    return kept;
}
/** A toggle's contribution: `true` when it was left at the browser's default value. */
function toggleValue(entry) {
    return entry.value === "on" ? true : entry.value;
}
/**
 * Collapses per-control entries into one value per name.
 *
 * @param entries - Raw contributions, in document order.
 * @returns Payload.
 */
function assemble(entries) {
    const grouped = new Map();
    for (const entry of entries) {
        const bucket = grouped.get(entry.name);
        if (bucket)
            bucket.push(entry);
        else
            grouped.set(entry.name, [entry]);
    }
    const data = {};
    for (const [name, bucket] of grouped) {
        const fields = bucket.filter((entry) => entry.kind === "field");
        const toggles = bucket.filter((entry) => entry.kind === "toggle");
        // A plain field wins over anything sharing its name: that is a schema mistake, and the
        // readable value is the one the visitor typed.
        if (fields.length) {
            data[name] = fields[fields.length - 1].value;
            continue;
        }
        const radios = toggles.filter((entry) => entry.toggle === "radio");
        const boxes = toggles.filter((entry) => entry.toggle === "checkbox");
        const ticked = toggles.filter((entry) => entry.checked);
        // A radio group reports the selected option and nothing when none is selected.
        if (radios.length) {
            if (ticked.length)
                data[name] = toggleValue(ticked[0]);
            continue;
        }
        // One checkbox is a boolean: an unticked "agree" is a fact worth carrying.
        if (boxes.length === 1) {
            data[name] = boxes[0].checked ? toggleValue(boxes[0]) : false;
            continue;
        }
        // Several checkboxes with one name are a set: only the ticked values appear.
        data[name] = ticked.map(toggleValue);
    }
    return data;
}
//# sourceMappingURL=FormValues.js.map