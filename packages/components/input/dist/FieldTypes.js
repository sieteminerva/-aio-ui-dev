/**
 * Field types — one row per type.
 *
 * A field type answers three questions, and they are answered here once instead of
 * three times in three places (the render `switch`, the attribute applier, and the
 * schema validator in `Attribute.ts`):
 *
 * 1. **which selector renders the control** — `@field>textarea`, `@field>checkbox`, …
 * 2. **which DOM attributes the type accepts** — the matrix, so an attribute that means
 *    nothing for a type is dropped instead of silently landing in the markup;
 * 3. **which keys are structural** — consumed by the builder (`title` is the legacy label
 *    alias, `group`/`condition` belong to the form engine), so they never become attributes.
 *
 * Adding a field type is one row here plus, when it needs custom markup, one selector.
 */
/** Attributes shared by every free-text control. */
const TEXTUAL = ["placeholder", "name", "required", "disabled", "readonly"];
/** Attributes shared by every control that holds a scalar value. */
const SCALAR = ["name", "value", "required", "disabled"];
/**
 * Keys the builder itself consumes and must never forward to the DOM.
 *
 * `title` is the important one: it is **not** the HTML `title` attribute. It is the legacy
 * shorthand for `[id, name, label, placeholder]` and is read as label text
 * (`input.label ?? input.title`). Renaming it would break every consumer schema, so it
 * stays an alias and stays out of the attribute matrix.
 */
export const INPUT_STRUCTURAL_KEYS = [
    "type",
    "id",
    "name",
    "title",
    "label",
    "value",
    "config",
    "info",
    "input",
    "group",
    // Layout containers and their knobs: `row` is a grid, `column` its column count,
    // `wide` the share of a row a child takes. Never DOM attributes.
    "row",
    "column",
    "wide",
    "span",
    "condition",
    "then",
    "table",
    "legend",
    "description",
    "infos",
    "class",
    "className",
    "position",
    "useLabel",
    "display",
    // A field that stays writable while a control set locks its scope; becomes
    // `data-editable` on the wrapper, never an attribute of the control.
    "editable",
    "actions",
    "popover",
    "options",
    "steps",
    "step",
    "isLast",
    "formId",
    "modules",
];
/** The matrix. Every `InputType` must appear, so a new type cannot be half-added. */
export const INPUT_TYPE_REGISTRY = {
    text: { control: "@field>input", attributes: [...TEXTUAL, "maxlength", "minlength", "pattern", "autocomplete", "inputmode", "value"] },
    textarea: { control: "@field>textarea", attributes: [...TEXTUAL, "rows", "cols", "maxlength", "minlength"] },
    number: { control: "@field>input", attributes: [...TEXTUAL, "min", "max", "step", "value"] },
    select: { control: "@field>select", attributes: ["name", "required", "disabled", "multiple", "value"] },
    dropdown: { control: null, attributes: ["name", "required", "disabled", "value"] },
    actions: { control: "@field>input", attributes: [...SCALAR] },
    checkbox: { control: "@field>checkbox", attributes: [...SCALAR, "checked"] },
    radio: { control: "@field>radio", attributes: [...SCALAR, "checked"] },
    range: { control: "@field>input", attributes: [...SCALAR, "min", "max", "step"] },
    date: { control: "@field>input", attributes: [...SCALAR, "min", "max"] },
    time: { control: "@field>input", attributes: [...SCALAR, "min", "max"] },
    "datetime-local": { control: "@field>input", attributes: [...SCALAR, "min", "max"] },
    file: { control: "@field>file", attributes: ["name", "required", "disabled", "accept", "multiple"] },
    color: { control: "@field>input", attributes: [...SCALAR] },
    email: { control: "@field>input", attributes: [...TEXTUAL, "maxlength", "minlength", "pattern", "value"] },
    password: { control: "@field>input", attributes: [...TEXTUAL, "maxlength", "minlength", "pattern", "value"] },
    url: { control: "@field>input", attributes: [...TEXTUAL, "maxlength", "pattern", "value"] },
    tel: { control: "@field>input", attributes: [...TEXTUAL, "maxlength", "pattern", "value"] },
    hidden: { control: "@field>input", attributes: ["name", "value", "required", "disabled"] },
};
/** The `text` row: the fallback for an unknown or missing type. */
export function inputTypeOf(type) {
    return INPUT_TYPE_REGISTRY[(type ?? "text")] ?? INPUT_TYPE_REGISTRY.text;
}
/** Whether a DOM attribute is meaningful for this field type. */
export function isInputAttributeAllowed(type, attribute) {
    return inputTypeOf(type).attributes.includes(attribute);
}
/**
 * Splits a schema into the attributes a type accepts and the ones it does not.
 *
 * Used by `Attribute.ts` as the validator, and the reason the matrix lives in one place:
 * the renderer and the validator can never disagree about what a type may carry.
 *
 * @param type - Field type (`"checkbox"`, `"number"`, …).
 * @param schema - Keys to check; structural keys are ignored, not reported.
 * @returns `accepted` and `rejected` attribute names, plus the structural keys found.
 */
export function scanInputAttributes(type, schema) {
    const definition = inputTypeOf(type);
    const accepted = [];
    const rejected = [];
    const structural = [];
    for (const key of Object.keys(schema)) {
        if (INPUT_STRUCTURAL_KEYS.includes(key)) {
            structural.push(key);
            continue;
        }
        if (definition.attributes.includes(key))
            accepted.push(key);
        else
            rejected.push(key);
    }
    return { accepted, rejected, structural };
}
//# sourceMappingURL=FieldTypes.js.map