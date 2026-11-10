import { InputBuilder } from "./Input.js";
import { scanInputAttributes } from "./FieldTypes.js";
// Base config applied to every input
const baseInputConfig = {
    label: "",
    name: "",
    value: "",
    required: false,
    disabled: false,
};
export class InputAttributeBuilder {
    // Type-specific overrides (minimal defaults per type)
    static inputs = {
        text: { placeholder: "Enter text", maxlength: 255 },
        textarea: { placeholder: "Enter your message", rows: 3, cols: 30 },
        number: { placeholder: "Enter a number", value: 50, min: 0, max: 100, step: 1 },
        select: { placeholder: "Select an option", range: "sheet_range", form: "form_id", multiple: false },
        dropdown: { placeholder: "Select an option", range: "sheet_range", form: "form_id", multiple: false },
        checkbox: { value: "default_value", checked: false },
        radio: { value: "default_value", range: "sheet_range" },
        range: { value: 50, min: 0, max: 100, step: 1, orient: "horizontal" },
        actions: {},
        date: { min: "yyyy-MM-dd", max: "yyyy-MM-dd" },
        time: {},
        "datetime-local": { min: "YYYY-MM-DDTHH:mm", max: "YYYY-MM-DDTHH:mm" },
        file: {
            accept: "image/*,.pdf",
            multiple: false,
            "data-max-upload": 10,
            "data-max-file-size": 5,
            "data-group-unallowed": true,
            "data-thumbnail": true,
            "data-view": "thumbnails",
        },
        color: { value: "#000000" },
        email: { placeholder: "Enter email" },
        password: { placeholder: "Enter password", minlength: 8, maxlength: 255 },
        url: { placeholder: "Enter URL", pattern: "https://.*" },
        tel: { placeholder: "Enter phone number", pattern: "" },
        hidden: { value: "hidden_value" },
    };
    // Generic attribute definitions
    static attributes = {
        value: { name: "value", type: "text", value: "" },
        placeholder: { name: "placeholder", type: "text", value: "" },
        required: { name: "required", type: "checkbox", config: { style: "toggle", position: "left" }, value: false },
        disabled: { name: "disabled", type: "checkbox", config: { style: "toggle", position: "left" }, value: false },
        min: { name: "min", type: "number", value: "" },
        max: { name: "max", type: "number", value: "" },
        minlength: { name: "minlength", type: "number", value: "" },
        maxlength: { name: "maxlength", type: "number", value: "" },
        step: { name: "step", type: "number", value: 1 },
        rows: { name: "rows", type: "number", value: 3 },
        cols: { name: "cols", type: "number", value: 30 },
        accept: { name: "accept", type: "text", value: "" },
        multiple: { name: "multiple", type: "checkbox", config: { style: "toggle", position: "left" }, value: false },
        checked: { name: "checked", type: "checkbox", config: { style: "toggle", position: "left" }, value: false },
        orient: { name: "orient", type: "text", value: "horizontal" },
        pattern: { name: "pattern", type: "text", value: "" },
        // Custom
        ["data-max-upload"]: { name: "data-max-upload", label: "max upload", type: "number", value: 10 },
        ["data-max-file-size"]: { name: "data-max-file-size", label: "max file size", type: "number", value: 5 },
        ["data-view"]: {
            name: "data-view",
            type: "select",
            value: "thumbnails",
            config: { options: ["thumbnails", "list"] },
        },
        ["data-group-unallowed"]: {
            name: "data-group-unallowed",
            label: "group unallowed",
            type: "checkbox",
            config: { style: "toggle", position: "left" },
            value: false,
        },
        ["data-thumbnail"]: { name: "data-thumbnail", label: "display thumbnail", type: "checkbox", config: { style: "toggle", position: "left" }, value: false },
    };
    // resolve correct attr type for min/max
    static resolveMinMaxType(inputType, key) {
        if (!["min", "max"].includes(key))
            return null;
        switch (inputType) {
            case "date":
                return "date";
            case "time":
                return "time";
            case "datetime-local":
                return "datetime-local";
            default:
                return "number";
        }
    }
    // unified builder
    static buildSchemaForType(inputType, header = {}) {
        // merge base + type defaults + user overrides
        const merged = {
            ...baseInputConfig,
            ...this.inputs[inputType],
            ...header,
            type: inputType,
        };
        const schema = {
            ...merged,
            template: "", // main input
        };
        // now generate attribute editors
        for (const attrKey in this.attributes) {
            const key = attrKey;
            const schemaDef = this.attributes[key];
            if (!schemaDef)
                continue;
            // skip attributes irrelevant to this type
            if (!(key in merged))
                continue;
            let value = merged[key];
            // console.log(`[${inputType} > value]`, value);
            let attrType = schemaDef.type;
            // special case: min/max type resolution
            if (["min", "max"].includes(key)) {
                const resolved = this.resolveMinMaxType(inputType, key);
                if (resolved)
                    attrType = resolved;
            }
            // special case: checkbox / radio → use `checked` not value=true
            if (inputType === "checkbox" || inputType === "radio") {
                if (typeof value === "boolean") {
                    schema.checked = value;
                    value = value;
                }
            }
            // special case: file remove value editor field
            if (inputType === "file") {
                delete schema.value;
            }
            const title = header.id
                ? header.id.toLowerCase().replace(/[\s_]+/g, "-")
                : header.title
                    ? header.title.toLowerCase().replace(/[\s_]+/g, "-")
                    : inputType;
            const elementId = `${title}-${schemaDef.name}`;
            let attrConfig = {
                type: attrType,
                title: schemaDef.name,
                label: schemaDef.label,
                id: elementId,
                value,
                ...(schemaDef.config ? { config: schemaDef.config } : {}),
            };
            // console.log(`[${inputType} > attrConfig]`, attrConfig);
            schema[key] = {
                input: attrType,
                value,
                ...(schemaDef.config ? { config: schemaDef.config } : {}),
                template: new InputBuilder().create(attrConfig),
            };
        }
        // console.log(`[${inputType} > schema]`, schema);
        return schema;
    }
    /**
     * Checks a field schema against the registry matrix for its type.
     *
     * One source of truth: the same rows `InputBuilder` renders with decide what may be
     * accepted, so the editor and the renderer can never disagree. The previous version
     * kept its own copy of the matrix and returned `true` as soon as *any* key was
     * allowed — one bad key next to one good key passed silently.
     *
     * @param type - Field type the schema claims.
     * @param schema - Field schema (`{ type, id, title, placeholder, config, … }`).
     * @param customAllowed - Extra keys this project allows beyond the matrix.
     * @returns Accepted/rejected/structural keys; `ok` is true when nothing was rejected.
     */
    static scan(type, schema, customAllowed = []) {
        const result = scanInputAttributes(type, schema);
        const extra = result.rejected.filter((key) => customAllowed.includes(key));
        const rejected = result.rejected.filter((key) => !customAllowed.includes(key));
        return {
            type,
            accepted: [...result.accepted, ...extra],
            rejected,
            structural: result.structural,
            ok: rejected.length === 0,
        };
    }
    /**
     * Boolean form of {@link scan}, kept for callers that only need a pass/fail.
     *
     * @param type - Field type.
     * @param config - Field schema.
     * @param customAllowed - Extra keys this project allows.
     * @returns `true` when every non-structural key is valid for the type.
     */
    static scanUnallowedAttrs(type, config, customAllowed = []) {
        return this.scan(type, config, customAllowed).ok;
    }
    static create(headers) {
        return headers.map((header) => {
            // we expect each header at least has a `type`
            const type = header.type || "text";
            // const scanStatus = scanUnallowedAttrs(type, header, ["title", "type", "range", "config"]);
            // console.log("[generateInputAttributes] > isGoodToGo:", scanStatus);
            return this.buildSchemaForType(type, header);
        });
    }
}
//# sourceMappingURL=Attribute.js.map