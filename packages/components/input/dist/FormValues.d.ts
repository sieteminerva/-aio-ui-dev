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
/** Collection options. */
export interface iCollectValuesOptions {
    /**
     * Drop `""`, `false` and empty arrays from the payload.
     *
     * Default `false` on purpose: an update payload usually needs **every** key present so
     * the backend can tell "clear this cell" from "this column was not part of the form".
     * Turn it on for insert-style payloads, where an absent key is the same as an empty one.
     */
    excludeEmpty?: boolean;
}
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
export declare function collectFormValues(form: HTMLFormElement | HTMLFieldSetElement | HTMLElement, options?: iCollectValuesOptions): Record<string, any>;
//# sourceMappingURL=FormValues.d.ts.map