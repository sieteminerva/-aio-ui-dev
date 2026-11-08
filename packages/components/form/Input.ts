import type { iActionProperty, iBuilderConfig, iBuilderRegistry } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base/Base";
import { ModuleLoader } from "@aio-ui/module-loader/ModuleLoader";
import { inputTypeOf } from "./FieldTypes";
import {
  CORE_INPUT_MODULES,
  type iInputCollaborator,
  type iInputModuleContext,
} from "./InputRegistry";
import type { iCalculationFormula } from "./Handlers/Calculation";

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
] as const;

/** Attributes whose presence is the value: `required`, `disabled`, `multiple`, … */
const BOOLEAN_ATTRIBUTES = new Set(["required", "disabled", "readonly", "multiple"]);

export type InputType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "dropdown"
  | "actions"
  | "checkbox"
  | "radio"
  | "range"
  | "date"
  | "time"
  | "datetime-local"
  | "file"
  | "color"
  | "email"
  | "password"
  | "url"
  | "tel"
  | "hidden";

export interface iBasicSelectOption {
  value?: string;
  label?: string;
  icon?: string;
}

export type InputElementType =
  | "@field"
  | "@field>label"
  | "@field>input"
  | "@field>textarea"
  | "@field>select"
  | "@field>select>option"
  | "@field>checkbox"
  | "@field>radio"
  | "@field>file"
  | "@field>info";

export type iActionType = "add" | "remove" | "delete" | "save" | "edit" | "copy" | "search" | "custom";

export interface iInputActionDefinition {
  type: iActionType;
  selector?: Record<string, iActionProperty>;
  label?: string;
  icon?: string;
  onClick: iInputActionHandler;
}

export interface iInputActionContext {
  parentElement: HTMLElement;
  input: iBasicInputNode;
  action: iActionType;
  button: HTMLButtonElement;
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
  value: string;
  event: MouseEvent;
  result?: unknown;
}

export type iInputActionHandler = (parentElement: HTMLElement, context: iInputActionContext) => void;

export interface iBasicInputConfig {
  attributes?: Array<{ name: string; value: string }>;
  style?: string;
  field?: string;
  className?: string;
  options?: Array<string | iBasicSelectOption>;
  position?: "left" | "right";
  icon?: string;
  content?: string | Record<string, unknown>;
  actions?: iInputActionDefinition[] | Partial<Record<iActionType, Omit<iInputActionDefinition, "type">>> | null;
  actionMode?: string;
  wide?: number | null;
  useLabel?: boolean;
  view?: string;
  thumbnail?: boolean;
  maxUpload?: number;
  maxFileSize?: number;
  groupUnallowed?: boolean;
  createEventListener?: boolean;
  popover?: string | HTMLElement | undefined;
  display?: "block" | "inline";
  /** Options forwarded to the dropdown module when `type` is `"dropdown"`. */
  dropdown?: Record<string, any>;
  /**
   * Called with the raw files the user picked, when the file module is registered.
   *
   * The input layer deliberately stops here: parsing a CSV into a table, serializing a
   * Drive payload or rendering a preview are decisions for whoever owns the file. Without
   * the `file` module in the preset this callback never fires.
   *
   * @param files - Selected files, in the order the browser reported them.
   * @param field - The resolved field payload, for id/name context.
   */
  onFileSelected?: (files: File[], field: any) => void | Promise<void>;
  /** Calculation strategy attached to this input (usually a readonly total field). */
  calculator?: iCalculationFormula<any>;
}

export interface iBasicInputNode extends iBuilderConfig<InputElementType> {
  type?: InputType;
  id?: string;
  formId?: string | null;
  name?: string;
  title?: string;
  /** Alternatif `title` untuk teks label; dipakai lebih dulu bila ada. */
  label?: string;
  placeholder?: string;
  value?: any;
  /** Numeric increment; defaults to "any" so decimal values pass native validation. */
  step?: number | "any";
  rows?: number;
  cols?: number;
  multiple?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  /** Skip InputControls' automatic read-only/disabled lock when edit actions are present. */
  editable?: boolean;
  required?: boolean;
  checked?: boolean;
  range?: string;
  info?: string;
  position?: "top" | "left" | "right" | "bottom";
  config?: iBasicInputConfig;
  onValueChange?: (form: any, e: Event) => {}
}

/** Builder-level configuration for the input layer. */
export interface iInputConfig extends iBuilderConfig<InputElementType> {
  /**
   * Optional loader that supplies the input sub-modules (dropdown, file, controls, popover).
   *
   * Leave it `null` and the core preset keeps every collaborator available. Inject one to
   * trim the layer down (for example `LITE_INPUT_MODULES`), or to add a project module.
   */
  modules?: ModuleLoader<iInputModuleContext, iInputCollaborator> | null;
}

export class InputBuilder extends Builder<InputElementType, iInputConfig> {
  readonly builderId: keyof iBuilderRegistry = "input";
  readonly name: keyof iBuilderRegistry = "input";
  readonly stylesheet: string = "";

  #input: iBasicInputNode = {};

  /** Owns the lifecycle of the input sub-modules: one resolve per prepare. */
  readonly #loader: ModuleLoader<iInputModuleContext, iInputCollaborator>;

  /** Modules resolved for the field being built. */
  #modules: iInputCollaborator[] = [];

  /** Host data a module may read: the builder's own configuration. */
  get #moduleContext(): iInputModuleContext {
    return { builderConfig: this.config };
  }

  constructor(config: Partial<iInputConfig> = {}) {
    super();

    const defaultSelectors = {
      "@field": { tagName: "div", className: "field" },
      "@field>label": { tagName: "label" },
      "@field>input": { tagName: "input" },
      "@field>textarea": { tagName: "textarea" },
      "@field>select": { tagName: "select" },
      "@field>select>option": { tagName: "option" },
      "@field>checkbox": { tagName: "input", type: "checkbox" as InputType, wrapper: ".switch.control" },
      "@field>radio": { tagName: "input", type: "radio" as InputType },
      "@field>file": { tagName: "input", type: "file" as InputType },
      "@field>info": { tagName: "small", className: "info" }
    };

    const defaultConfig: Required<iInputConfig> = {
      themeId: "default",
      selectors: defaultSelectors as any,
      namespace: null,
      emit: () => { },
      modules: null,
    };

    this.config = this.resolveConfig(defaultConfig, config);

    // The loader is the only thing that knows the collaborator set; `prepare()` resolves it.
    this.#loader = this.config.modules ?? new ModuleLoader<iInputModuleContext, iInputCollaborator>("input", CORE_INPUT_MODULES);

  }

  private resolvePayload(inputObj: iBasicInputNode) {
    // Generate ID unik generik untuk keperluan atribut 'id' dan 'for' pada label
    const elementId = this._sanitizeId(inputObj.id || inputObj.title || `input-${Math.random().toString(36).slice(2, 10)}`);

    const defaultPayload: iBasicInputNode = {
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
    const rawOptions = inputObj.config?.options ?? (inputObj as any).options;
    if (Array.isArray(rawOptions)) {
      inputPayload.config.options = rawOptions.map((option: any) => typeof option === "string" ? { value: option, label: option } : option);
    }

    return inputPayload;
  }



  public prepare(inputObj: Partial<iBasicInputNode>, _config?: Required<iInputConfig> | undefined): HTMLElement | Record<string, any | HTMLElement> {

    this.#input = this.resolvePayload(inputObj);

    const cfg = this.#input.config;
    const definition = inputTypeOf(this.#input.type);

    // 🧩 Modules are resolved once per prepare, after the payload exists: a module decides
    // from the field what it wants to do, and `InputBuilder` never learns their names.
    this.#modules = this.#loader.resolveAll(this.#moduleContext);

    const wrapper = this.render("@field", this.#input)!;

    // 🏷️ One label, one place. `useLabel` is an on/off switch (default on, set in
    // `resolvePayload`); `position` is a CSS hint (`data-position`), never an order change.
    //
    // Read from `config` only: a top-level `position` on the schema resolves through the
    // reactive payload proxy to an inherited value (the demo checkbox came back `"right"`
    // without asking for it), and `config.position` is the typed home anyway.
    const labelText = this.#input.label ?? this.#input.title;
    const labelPosition = this.#input.config?.position;

    const label = labelText && this.#input.config?.useLabel !== false
      ? this.render("@field>label", { text: labelText, position: labelPosition, id: this.#input.id }) as HTMLElement
      : null;

    if (label) wrapper.appendChild(label);

    // 🧩 Precedence: a registered module may own any type (that is how a project swaps in
    // its own picker), then the field-type matrix picks the selector, then the plain
    // `<input>` fallback. `InputBuilder` never names a collaborator.
    let inputEl: (HTMLInputElement | HTMLSelectElement | HTMLElement | null) = null;

    for (const module of this.#modules) {
      const rendered = module.renderControl?.(this.#input, this.#moduleContext);
      if (rendered) {
        inputEl = rendered;
        break;
      }
    }

    if (!inputEl && definition.control) {
      inputEl = this.render(definition.control, this.#input) as HTMLElement;
    }

    if (!inputEl) {
      // Default untuk jenis text, number, email, password, dll.
      inputEl = this.render("@field>input", this.#input)!;
      if ((this.#input.type === "text" || this.#input.type === "number") && (cfg?.className === "loading")) {
        inputEl.classList.add("loading");
      }
    }

    if (inputEl) {
      this.applyAttributes(inputEl, this.#input);
    }

    // C. Render Info Tambahan di bagian bawah jika ada
    if (this.#input.info) {
      const info = this.render("@field>info", this.#input.info)!;
      wrapper.appendChild(info);
    }


    // Dropdown mencetak root `.dropdown` sendiri, jadi root itu yang ditempel apa adanya.
    if (inputEl) inputEl.__outer ? wrapper.appendChild(inputEl.__outer) : wrapper.appendChild(inputEl);

    // 🧩 Decoration runs after the control is in the wrapper: the uploader, the action set
    // and the popover all need a mounted control (and, for the uploader, its `.field`).
    if (inputEl) {
      for (const module of this.#modules) module.decorate?.(wrapper, inputEl, this.#input, this.#moduleContext);
    }

    return wrapper!;
  }


  protected template(typeKey: InputElementType, el: HTMLElement, payload?: any): void {
    if (!payload) return;

    const cfg = payload.config; // ini merujuk ke 'payload' utuh yang dioper dari case @field

    switch (typeKey) {
      case "@field":
        // console.log(el)
        // Gaya kelas & atribut kosmetik wrapper utama
        if (payload?.className && payload?.className !== "loading") {
          el.classList.add(...payload.className.split(" ").filter(Boolean));
        }

        if (payload?.display) el.setAttribute("data-display", payload.display ?? cfg.display);
        break;

      case "@field>label":
        el.setAttribute("for", payload.id);
        el.textContent = payload.text;
        if (payload.position) el.setAttribute("data-position", payload.position)
        break;

      case "@field>checkbox":
        (el as HTMLInputElement).type = "checkbox";
        const slider = document.createElement("div");
        slider.className = "slider";
        slider.setAttribute("data-shape", "round")
        el.__outer.appendChild(slider);
        break;

      case "@field>input":
        (el as HTMLInputElement).type = payload.type || "text";
        (el as HTMLInputElement).autocomplete = "off";
        break;

      case "@field>textarea":
        (el as HTMLTextAreaElement).rows = payload.rows;
        break;

      case "@field>select":
        if (cfg?.className === "loading") el.classList.add("loading");
        // Buat baris placeholder awal untuk select
        const placeholderOpt = document.createElement("option");
        placeholderOpt.value = "";
        placeholderOpt.textContent = payload.placeholder || "Pilih Opsi...";
        placeholderOpt.disabled = true;
        placeholderOpt.selected = true;
        el.appendChild(placeholderOpt);

        // Render barisan opsi anak secara rekursif/looping
        const options = (cfg?.options || []) as any[];
        for (const option of options) {
          const optionEl = this.render("@field>select>option", { option, parentValue: payload.value })!;
          el.appendChild(optionEl);
          if (placeholderOpt.selected && optionEl.hasAttribute("selected")) {
            placeholderOpt.selected = false;
          }
        }
        break;

      case "@field>radio":
        (el as HTMLInputElement).type = payload.type;
        // Only a field that asks for it starts checked; a radio group is several fields,
        // so defaulting to true put every option in the group in the checked state.
        (el as HTMLInputElement).checked = payload.checked === true;
        break;

      case "@field>file":
        (el as HTMLInputElement).type = "file";
        el.setAttribute("data-uploader", "");
        el.setAttribute("data-view", `${cfg?.view || "list"}`);
        el.setAttribute("data-render-thumbnail", `${cfg?.thumbnail ?? "true"}`);
        break;

      case "@field>select>option":
        const option = el as HTMLOptionElement;
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

  public initialize(_el?: HTMLElement, _payload?: any, _context?: any): void {
    if (this.#input.config?.popover) {
      if (this.#input.config?.popover instanceof HTMLElement) {
        _el?.appendChild(this.#input.config?.popover);
      }
      else if (typeof this.#input.config?.popover === "string") {
        _el?.insertAdjacentHTML("beforeend", this.#input.config?.popover);
      }
    }
  }

  /**
   * Applies a schema to a live control.
   *
   * The registry decides what a type may carry: an attribute that means nothing for the
   * type is dropped instead of landing in the markup (`maxlength` on a `checkbox`, a
   * `min` on a `file`). `id` and `name` are structural and always set; `config.attributes`
   * is applied last, so an escape hatch still wins.
   */
  private applyAttributes(el: HTMLInputElement | HTMLSelectElement | HTMLElement, payload: any) {
    const cfg = payload.config ?? {};
    const allowed = inputTypeOf(payload.type).attributes;

    el.id = payload.id;
    (el as HTMLInputElement).name = payload.name ? String(payload.name) : payload.id;

    const read = (key: string) => payload[key] !== undefined ? payload[key] : cfg[key];

    for (const key of ATTRIBUTE_ORDER) {
      if (!allowed.includes(key)) continue;

      const value = read(key);

      if (key === "value") {
        // The live property after options exist — cascade re-renders rely on this.
        if (value !== undefined && value !== null && "value" in el) {
          (el as HTMLInputElement | HTMLSelectElement).value = String(value);
        }
        continue;
      }

      if (key === "checked") {
        if (el instanceof HTMLInputElement) el.checked = Boolean(value);
        continue;
      }

      if (BOOLEAN_ATTRIBUTES.has(key)) {
        // Presence is the value: `false` must leave the attribute absent, never render
        // an empty or `"false"` one — an attribute that exists is still an enabled toggle.
        if (!value) continue;
        el.setAttribute(key, "");
        if (key in el) (el as any)[key] = true;
        continue;
      }

      if (value === undefined || value === null || value === "") continue;
      el.setAttribute(key, String(value));
    }

    // A number input without a step snaps to integers; the browser default is 1.
    if (el instanceof HTMLInputElement && el.type === "number" && !el.getAttribute("step")) {
      el.step = "any";
    }

    // Tancapkan custom inline attributes bawaan array schema Anda (jika ada)
    if (cfg?.attributes && Array.isArray(cfg.attributes)) {
      cfg.attributes.forEach((attr: any) => {
        if (attr?.name) {
          if (typeof attr.value === "function" && (attr.name as string).startsWith("on")) {
            (el as any)[attr.name as string] = attr.value;
          } else {
            el.setAttribute(attr.name, attr.value);
          }
        }
      });
    }

  }


  private _sanitizeId(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

}
