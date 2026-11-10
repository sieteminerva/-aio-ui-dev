import { DropdownBuilder } from "./Dropdown.js";
import { INPUT_MODULE_IDS } from "../InputModuleTypes.js";
/**
 * Dropdown input module.
 *
 * `type: "dropdown"` is the one field type whose markup a sibling builder owns: the
 * dropdown has its own open/close state, filtering and keyboard handling. Owning it here
 * keeps `InputBuilder` free of a direct import, so a project that never uses a dropdown
 * never pays for it.
 */
class DropdownInputModule {
    #context;
    constructor(context) {
        this.#context = context;
    }
    /**
     * Builds the dropdown for a `dropdown` field.
     *
     * @param field - Resolved field payload.
     * @returns The dropdown root, or `null` for any other type.
     */
    renderControl(field) {
        if (field.type !== "dropdown")
            return null;
        const cfg = field.config ?? {};
        const options = (cfg.options || []).map((option) => typeof option === "string" ? { id: option, label: option } : { id: option.value, label: option.label });
        const payload = {
            id: field.id,
            title: field.title,
            placeholder: field.placeholder,
            value: field.value,
            options,
            name: field.name || field.id,
            attributes: cfg.attributes || [],
        };
        const builder = new DropdownBuilder({
            ...cfg.dropdown,
            themeId: this.#context.builderConfig.themeId || "default",
            namespace: this.#context.builderConfig.namespace,
            emit: this.#context.builderConfig.emit,
        });
        const element = builder.create(payload, {
            apiUrl: cfg.apiUrl || null,
            debounceDelay: cfg.debounceDelay,
            style: cfg.style || "select",
            min: cfg.min,
            max: cfg.max,
            isMultiple: cfg.isMultiple,
            onSelect: cfg.onSelect,
            onMultiChange: cfg.onMultiChange,
        });
        // The dropdown root already is a `.field`-shaped block: give its hidden input the
        // form field name so submission works without a second wrapper.
        const hidden = element.querySelector("input[type='hidden']");
        if (hidden && field.id)
            hidden.setAttribute("name", field.name || field.id);
        return element;
    }
}
/**
 * Dropdown module definition.
 *
 * @example
 * // registered by INPUT_MODULE_DEFINITIONS; omit it from a custom preset to drop the builder
 */
export const dropdownInputModule = {
    id: INPUT_MODULE_IDS.dropdown,
    load: (context) => new DropdownInputModule(context),
};
//# sourceMappingURL=Dropdown.InputModule.js.map