import { Builder } from "@aio-ui/base";
import { Skeleton } from "@aio-ui/skeleton";
import { ModuleLoader } from "@aio-ui/module-loader";
import { inputTypeOf } from "./FieldTypes.js";
import { INPUT_MODULE_DEFINITIONS, } from "./InputRegistry.js";
/**
 * Attributes `applyAttributes` knows how to map, in application order.
 *
 * A key not listed here is not applied by the builder (it can still be passed through
 * `config.attributes`), and a key listed here is still dropped for a type whose registry
 * row does not accept it.
 */
const ATTRIBUTE_ORDER = [
    "value",
    "checked",
    "placeholder",
    "required",
    "disabled",
    "readonly",
    "multiple",
    "accept",
    "min",
    "max",
    "minlength",
    "maxlength",
    "step",
    "pattern",
    "rows",
    "cols",
    "autocomplete",
    "inputmode",
];
/** Attributes whose presence is the value: `required`, `disabled`, `multiple`, … */
const BOOLEAN_ATTRIBUTES = new Set(["required", "disabled", "readonly", "multiple"]);
export class InputBuilder extends Builder {
    builderId = "input";
    name = "input";
    stylesheet = "./input.css";
    #input = {};
    /** Owns the lifecycle of the input sub-modules: one resolve per prepare. */
    #loader;
    /** Adapters that arrived already live (host-owned); never loaded or disposed here. */
    #live;
    /** Modules resolved for the field being built. */
    #modules = [];
    /** Host data a module may read: the builder's own configuration. */
    get #moduleContext() {
        return { builderConfig: this.config };
    }
    /**
     * 🪶 LOADING MOCKUP — one label and one control box, drawn with the mandatory
     * `@aio-ui/skeleton` primitive. The control type (select, textarea, switch) changes the
     * skin, never the box: a field reserves one line plus one control.
     */
    loading() {
        return Skeleton.create({
            shape: "stack",
            children: [
                { shape: "line", width: "25%" },
                { shape: "bone", height: "2.75rem" },
            ],
        });
    }
    constructor(config = {}) {
        super();
        const defaultSelectors = {
            "@field": { tagName: "div", className: "field" },
            "@field>label": { tagName: "label" },
            "@field>input": { tagName: "input" },
            "@field>textarea": { tagName: "textarea" },
            "@field>select": { tagName: "select" },
            "@field>select>option": { tagName: "option" },
            "@field>checkbox": { tagName: "input", type: "checkbox", wrapper: ".switch.control" },
            "@field>radio": { tagName: "input", type: "radio" },
            // Same switch shell for a radio: `config.style: "toggle"` opts into it.
            "@field>toggle": { tagName: "input", wrapper: ".switch.control" },
            "@field>file": { tagName: "input", type: "file" },
            "@field>info": { tagName: "small", className: "info" }
        };
        const defaultConfig = {
            themeId: "default",
            selectors: defaultSelectors,
            namespace: null,
            emit: () => { },
            modules: null,
        };
        this.config = this.resolveConfig(defaultConfig, config);
        // Two ways to get an adapter set: a loader (host-owned lifecycle), a preset whose
        // definitions this builder loads itself while live adapters are used as-is, or the
        // default definitions when the host says nothing.
        if (Array.isArray(this.config.modules)) {
            const preset = this.config.modules;
            const definitions = preset.filter((item) => typeof item.load === "function");
            this.#live = preset.filter((item) => typeof item.load !== "function");
            this.#loader = definitions.length
                ? new ModuleLoader("input", definitions)
                : null;
        }
        else {
            this.#live = [];
            this.#loader = this.config.modules
                ?? new ModuleLoader("input", INPUT_MODULE_DEFINITIONS);
        }
    }
    resolvePayload(inputObj) {
        // Generate ID unik generik untuk keperluan atribut 'id' dan 'for' pada label
        const elementId = this._sanitizeId(inputObj.id || inputObj.title || `input-${Math.random().toString(36).slice(2, 10)}`);
        const defaultPayload = {
            type: "text",
            id: elementId,
            title: "",
            placeholder: "",
            rows: 3,
            multiple: false,
            disabled: false,
            readonly: false,
            required: false,
            checked: false,
            config: {
                attributes: [],
                style: "",
                className: "",
                options: [],
                useLabel: true,
                display: undefined,
                createEventListener: false,
                popover: undefined,
                actions: undefined
            }
        };
        const inputPayload = { ...defaultPayload, ...inputObj, config: { ...defaultPayload.config, ...inputObj.config } };
        if (!inputPayload.placeholder && inputPayload.title) {
            inputPayload.placeholder = (inputPayload.type === "select" || inputPayload.type === "textarea") ? `Pilih ${inputPayload.title}` : `Isi ${inputPayload.title}`;
        }
        // 🧩 `options` is accepted at the top level (`{ type: "select", options: [...] }`) as
        // well as under `config`, because a schema read from a sheet writes it flat. Both
        // shapes normalise into `config.options`, which is where the select and dropdown
        // templates read from.
        const rawOptions = inputObj.config?.options ?? inputObj.options;
        if (Array.isArray(rawOptions)) {
            inputPayload.config.options = rawOptions.map((option) => typeof option === "string" ? { value: option, label: option } : option);
        }
        return inputPayload;
    }
    prepare(inputObj, _config) {
        this.#input = this.resolvePayload(inputObj);
        const cfg = this.#input.config;
        const definition = inputTypeOf(this.#input.type);
        // 🧩 Modules are resolved once per prepare, after the payload exists: a module decides
        // from the field what it wants to do, and `InputBuilder` never learns their names.
        this.#modules = [...(this.#loader?.resolveAll(this.#moduleContext) ?? []), ...this.#live];
        const wrapper = this.render("@field", this.#input);
        // 🏷️ One label, one place. `useLabel` is an on/off switch (default on, set in
        // `resolvePayload`); `position` is a CSS hint (`data-position`), never an order change.
        //
        // Both spellings are accepted — `{ position }` on the field and `config.position` —
        // because the schema shape predates the config bag. A toggle (`checkbox`/`radio`) has
        // no sensible "above the control" layout, so it defaults to `right`; without any
        // `data-position` its `:has(> label[…])` grid rules never match and the label stacks
        // on top of the switch.
        const labelText = this.#input.label ?? this.#input.title;
        const isToggle = this.#input.type === "checkbox" || this.#input.type === "radio";
        const labelPosition = this.#input.config?.position
            ?? this.#input.position
            ?? (isToggle ? "right" : undefined);
        const label = labelText && this.#input.config?.useLabel !== false
            ? this.render("@field>label", { text: labelText, position: labelPosition, id: this.#input.id })
            : null;
        if (label)
            wrapper.appendChild(label);
        // 🧩 Precedence: a registered module may own any type (that is how a project swaps in
        // its own picker), then the field-type matrix picks the selector, then the plain
        // `<input>` fallback. `InputBuilder` never names a adapter.
        let inputEl = null;
        for (const module of this.#modules) {
            const rendered = module.renderControl?.(this.#input, this.#moduleContext);
            if (rendered) {
                inputEl = rendered;
                break;
            }
        }
        // A toggle renders the same switch shell a checkbox has. `style: "toggle"` is the
        // opt-in for a radio, whose default is the native dot: a group of options should not
        // turn into a wall of switches unless the schema asks for it.
        const controlKey = this.#input.type === "radio" && this.#isToggleStyle()
            ? "@field>toggle"
            : definition.control;
        if (!inputEl && controlKey) {
            inputEl = this.render(controlKey, this.#input);
        }
        if (!inputEl) {
            // Default untuk jenis text, number, email, password, dll.
            inputEl = this.render("@field>input", this.#input);
            if ((this.#input.type === "text" || this.#input.type === "number") && (cfg?.className === "loading")) {
                inputEl.classList.add("loading");
            }
        }
        if (inputEl) {
            this.applyAttributes(inputEl, this.#input);
        }
        // `editable: true` is a promise to the visitor: this field stays writable even when the
        // control set locks everything else (its buttons are `edit`/`save`). The marker goes on
        // the wrapper because that is the scope a set reads, and it is one attribute instead of
        // every control kind having to know about the lock.
        if (this.#input.editable === true || cfg?.editable === true) {
            wrapper.setAttribute("data-editable", "true");
        }
        // C. Render Info Tambahan di bagian bawah jika ada
        if (this.#input.info) {
            const info = this.render("@field>info", this.#input.info);
            wrapper.appendChild(info);
        }
        // Dropdown mencetak root `.dropdown` sendiri, jadi root itu yang ditempel apa adanya.
        if (inputEl)
            inputEl.__outer ? wrapper.appendChild(inputEl.__outer) : wrapper.appendChild(inputEl);
        // 🧩 Decoration runs after the control is in the wrapper: the uploader, the action set
        // and the popover all need a mounted control (and, for the uploader, its `.field`).
        if (inputEl) {
            for (const module of this.#modules)
                module.decorate?.(wrapper, inputEl, this.#input, this.#moduleContext);
        }
        return wrapper;
    }
    template(typeKey, el, payload) {
        if (!payload)
            return;
        const cfg = payload.config; // ini merujuk ke 'payload' utuh yang dioper dari case @field
        switch (typeKey) {
            case "@field":
                // console.log(el)
                // Gaya kelas & atribut kosmetik wrapper utama
                if (payload?.className && payload?.className !== "loading") {
                    el.classList.add(...payload.className.split(" ").filter(Boolean));
                }
                if (payload?.display)
                    el.setAttribute("data-display", payload.display ?? cfg.display);
                break;
            case "@field>label":
                el.setAttribute("for", payload.id);
                el.textContent = payload.text;
                if (payload.position)
                    el.setAttribute("data-position", payload.position);
                break;
            case "@field>checkbox":
                el.type = "checkbox";
                const slider = document.createElement("div");
                slider.className = "slider";
                slider.setAttribute("data-shape", "round");
                el.__outer.appendChild(slider);
                break;
            case "@field>input":
                el.type = payload.type || "text";
                el.autocomplete = "off";
                break;
            case "@field>textarea":
                el.rows = payload.rows;
                break;
            case "@field>select":
                if (cfg?.className === "loading")
                    el.classList.add("loading");
                // Buat baris placeholder awal untuk select
                const placeholderOpt = document.createElement("option");
                placeholderOpt.value = "";
                placeholderOpt.textContent = payload.placeholder || "Pilih Opsi...";
                placeholderOpt.disabled = true;
                placeholderOpt.selected = true;
                el.appendChild(placeholderOpt);
                // Render barisan opsi anak secara rekursif/looping
                const options = (cfg?.options || []);
                for (const option of options) {
                    const optionEl = this.render("@field>select>option", { option, parentValue: payload.value });
                    el.appendChild(optionEl);
                    if (placeholderOpt.selected && optionEl.hasAttribute("selected")) {
                        placeholderOpt.selected = false;
                    }
                }
                break;
            case "@field>radio":
                el.type = payload.type;
                // Only a field that asks for it starts checked; a radio group is several fields,
                // so defaulting to true put every option in the group in the checked state.
                el.checked = payload.checked === true;
                break;
            case "@field>toggle": {
                // Serves checkbox and radio: the type comes from the field, the shell is shared.
                const toggle = el;
                toggle.type = payload.type === "radio" ? "radio" : "checkbox";
                toggle.checked = payload.checked === true;
                const slider = document.createElement("div");
                slider.className = "slider";
                slider.setAttribute("data-shape", payload.config?.shape ?? "round");
                el.__outer.appendChild(slider);
                break;
            }
            case "@field>file":
                el.type = "file";
                el.setAttribute("data-uploader", "");
                el.setAttribute("data-view", `${cfg?.view || "list"}`);
                el.setAttribute("data-render-thumbnail", `${cfg?.thumbnail ?? "true"}`);
                // Opt-in, and only declarative: this field's file is tabular, so whatever owns
                // tables may preview it. The input layer still never parses anything itself.
                if (cfg?.csv === true)
                    el.setAttribute("data-uploader-csv", "");
                break;
            case "@field>select>option":
                const option = el;
                option.value = payload.option.value;
                option.textContent = payload.option.label;
                if (payload.parentValue !== undefined && String(payload.option.value) === String(payload.parentValue)) {
                    option.setAttribute("selected", "selected");
                }
                break;
            case "@field>info":
                el.textContent = payload;
                break;
        }
    }
    initialize(_el, _payload, _context) {
        if (this.#input.config?.popover) {
            if (this.#input.config?.popover instanceof HTMLElement) {
                _el?.appendChild(this.#input.config?.popover);
            }
            else if (typeof this.#input.config?.popover === "string") {
                _el?.insertAdjacentHTML("beforeend", this.#input.config?.popover);
            }
        }
    }
    /** Whether this field asked for the switch shell (`config.style: "toggle"`). */
    #isToggleStyle() {
        const style = String(this.#input.config?.style ?? "").toLowerCase();
        return style === "toggle";
    }
    /**
     * Applies a schema to a live control.
     *
     * The registry decides what a type may carry: an attribute that means nothing for the
     * type is dropped instead of landing in the markup (`maxlength` on a `checkbox`, a
     * `min` on a `file`). `id` and `name` are structural and always set; `config.attributes`
     * is applied last, so an escape hatch still wins.
     */
    applyAttributes(el, payload) {
        const cfg = payload.config ?? {};
        const allowed = inputTypeOf(payload.type).attributes;
        el.id = payload.id;
        el.name = payload.name ? String(payload.name) : payload.id;
        const read = (key) => payload[key] !== undefined ? payload[key] : cfg[key];
        for (const key of ATTRIBUTE_ORDER) {
            if (!allowed.includes(key))
                continue;
            const value = read(key);
            if (key === "value") {
                // The live property after options exist — cascade re-renders rely on this.
                if (value !== undefined && value !== null && "value" in el) {
                    el.value = String(value);
                }
                continue;
            }
            if (key === "checked") {
                if (el instanceof HTMLInputElement)
                    el.checked = Boolean(value);
                continue;
            }
            if (BOOLEAN_ATTRIBUTES.has(key)) {
                // Presence is the value: `false` must leave the attribute absent, never render
                // an empty or `"false"` one — an attribute that exists is still an enabled toggle.
                if (!value)
                    continue;
                el.setAttribute(key, "");
                if (key in el)
                    el[key] = true;
                continue;
            }
            if (value === undefined || value === null || value === "")
                continue;
            el.setAttribute(key, String(value));
        }
        // A number input without a step snaps to integers; the browser default is 1.
        if (el instanceof HTMLInputElement && el.type === "number" && !el.getAttribute("step")) {
            el.step = "any";
        }
        // Tancapkan custom inline attributes bawaan array schema Anda (jika ada)
        if (cfg?.attributes && Array.isArray(cfg.attributes)) {
            cfg.attributes.forEach((attr) => {
                if (attr?.name) {
                    if (typeof attr.value === "function" && attr.name.startsWith("on")) {
                        el[attr.name] = attr.value;
                    }
                    else {
                        el.setAttribute(attr.name, attr.value);
                    }
                }
            });
        }
    }
    _sanitizeId(value) {
        return value
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9_-]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }
}
//# sourceMappingURL=Input.js.map