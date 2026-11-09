import type { iBuilderConfig, iBuilderRegistry } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base/Base";
import type { iMessageContent } from "@aio-ui/message/Message";
import type { FormCascade } from "./adapters/Cascade";
import type { FormCascadeHost, iCascadeEventDetail } from "./FormModuleTypes";
import type { FormMultistepHandler, FormMultistepHost } from "./Handlers/Multistep";
import type { FormValidationHandler } from "./Handlers/Validation";
import { FORM_MODULE_IDS } from "./FormModuleTypes";
import type { FormModulePhase, iFormAdapter, iFormModuleContext } from "./FormModuleTypes";
import { CORE_FORM_MODULES } from "./FormRegistry";
import { ModuleLoader } from "@aio-ui/module-loader/ModuleLoader";
import { applyRowColumns, applyRowSpan, childSpanOf, columnsOf } from "./FormLayout";
import { collectFormValues } from "@aio-ui/input/FormValues";
import type { HttpService } from "@aio-ui/http-service";
// 🎨 Gaya baseline field milik form: adaptor input juga mengimpornya untuk
// pemakaian mandiri, tetapi form tetap memuatnya agar tampilan tidak bergantung
// pada modul input mana yang dipasang (mis. renderer kustom).


export type FormElementType =
  | "@container"
  | "@form"
  | "@form>group"
  | "@form>group>legend"
  | "@form>group>desc"
  | "@form>title"
  | "@form>desc"
  | "@form>row"
  | "@form>row>title"
  | "@form>actions"
  | "@form>actions>submit"
  | "@form>actions>submit-group"
  | "@form>footer"
  | "@form>buttons-set";

export interface iFormConfig extends iBuilderConfig<FormElementType> {
  id?: string;
  name?: string;
  title?: string;
  description?: string;
  method?: "get" | "post";
  action?: string;
  className?: string;
  submitButton?: boolean;
  buttonText?: string;
  buttonClass?: string;
  resetOnSubmit?: boolean;
  resetOnComplete?: boolean;
  createEventListener?: boolean; autoDisableNextStep?: boolean
  minHeight?: string;
  multistep?: boolean;
  cascading?: boolean; // show or build input or group based on condition from input value before. it will looking "condition" property 
  /**
   * How conditional items are kept until their condition passes.
   *
   * `template` (default) plants a `<template>` and builds the element only when the
   * condition holds. `hidden` builds it immediately and toggles the `hidden` attribute —
   * required by chained inputs (an address picker injecting options into the next select)
   * because a template gives them nothing to inject into.
   */
  cascadeMode?: "template" | "hidden";
  onCascade?: null | ((detail: iCascadeEventDetail) => void); // listener kustom setiap kaskade mount/unmount/gate
  calculation?: boolean;
  footer?: HTMLElement | string | null;
  onSubmit?: null | Function;
  /**
   * What a submit does with the files selected in the form.
   *
   * `"ignore"` (default) keeps them out of the payload: a submit carries form data, and
   * turning a `File` into a Drive payload (or a URL, or a preview) is a decision the
   * application makes. Pass a function to opt in — it receives the raw `File` map keyed by
   * input name and returns whatever should be merged into the payload.
   *
   * ```ts
   * files: async (files) => ({ uploads: await serialize(files) })
   * ```
   */
  files?: "ignore" | ((files: Record<string, File[]>, form: HTMLFormElement) => Record<string, any> | Promise<Record<string, any>>);
  /**
   * Drop `""`, `false` and empty arrays from the submit payload.
   *
   * Default `false`: an update wants every key, so the backend can tell "clear this cell"
   * from "this column was not in the form". Turn it on for insert-style payloads.
   */
  excludeEmpty?: boolean;
  /**
   * Data source for `[data-level]` address fields.
   *
   * The picker used to ship a hardcoded endpoint, which made it unusable off that one
   * deployment. Declare the source here instead:
   *
   * ```ts
   * address: { loader: (query) => http.get({ sheet: "wilayah", ...query }) }
   * ```
   *
   * `loader` wins; `url`/`service` fall back to the built-in HTTP path.
   */
  address?: {
    /** Rows for one level, already in `{ <level>_id, <level>_name }` shape. */
    loader?: ((query: Record<string, any>) => Promise<any>) | null;
    /** Endpoint for the built-in path. */
    url?: string | null;
    /** Shared HTTP service; otherwise the picker builds its own from `url`. */
    service?: HttpService | null;
    /** Ask for coordinates as well. */
    geocode?: boolean;
  } | null;
  /**
   * Optional loader that supplies optional Form sub-modules.
   *
   * Leave it `null` (default) and every feature keeps its built-in handler, so
   * existing forms are unaffected. An injected loader only replaces a feature
   * when the matching module is registered in it.
   */
  modules?: ModuleLoader<iFormModuleContext, any> | null;
}

export class FormBuilder extends Builder<FormElementType, iFormConfig> {
  readonly builderId: keyof iBuilderRegistry = "form";
  readonly name: keyof iBuilderRegistry = "form";
  readonly stylesheet: string = "./Form.css";

  private submitButtonId: string | undefined = undefined;

  #inputs: any[] = [];

  // 🌊 Engine kaskade: seluruh logika mount/unmount/gate hidup di Cascade.ts.
  // Form hanya berperan sebagai host (renderGroup, buttons-set, config).
  #cascade: FormCascade | null = null;

  // 🪜 Engine multistep: langkah ditahan sebagai placeholder dan baru
  // dilahirkan ke DOM saat tombol Next/Back menekannya (Multistep.ts).
  #multistep: FormMultistepHandler | null = null;

  // 🧾 Validasi terpusat (native + kaskade): emit + toast. Lihat Handlers/Validation.ts.
  #validation: FormValidationHandler | null = null;

  // Inisialisasi komponen (uploader, IdAddress, dsb.) untuk step yang baru
  // lahir — engine memanggil ini lewat host hook onStepMount.
  #onStepMounted: ((fieldset: HTMLElement) => void) | null = null;

  // 🧩 Loader modul: satu-satunya pemilik siklus hidup validation, cascade,
  // multistep, dan calculation. Form tidak meng-`new` handler apa pun.
  readonly #loader: ModuleLoader<iFormModuleContext, any>;

  // 🧩 Modul yang sudah dimuat pada siklus render berjalan. Form hanya memanggil
  // hook opsionalnya (mount/beforeSubmit/renderTable), tanpa tahu isinya.
  #features: iFormAdapter[] = [];

  constructor(config: Partial<iFormConfig> = {}) {
    super();

    const defaultSelectors = {
      "@container": { tagName: "div", className: "form-widget-wrapper" },
      "@form": { tagName: "form", className: "native form" },
      "@form>group": { tagName: "fieldset", className: "form-group" },
      "@form>group>legend": { tagName: "legend", className: "title" },
      "@form>group>desc": { tagName: "p", className: "desc" },
      // The form's own heading, above the first group.
      "@form>title": { tagName: "h2", className: "title" },
      "@form>desc": { tagName: "p", className: "desc" },
      // A row is layout, not a fieldset: fields + nested rows in a CSS grid.
      "@form>row": { tagName: "div", className: "field group" },
      "@form>row>title": { tagName: "p", className: "title" },
      "@form>actions": { tagName: "div", className: "form-actions" },
      "@form>actions>submit": { tagName: "button", className: "submit", type: "submit" as "submit" },
      "@form>actions>submit-group": { tagName: "button", className: "submit", type: "button" as "button" },
      "@form>footer": { tagName: "div", className: "form-footer" },
      "@form>buttons-set": { tagName: "div", className: "buttons set" }
    };

    const defaultConfig: Required<iFormConfig> = {
      id: "",
      name: "",
      title: "",
      description: "",
      method: "post",
      action: "submit",
      className: "",
      submitButton: true,
      buttonText: "Submit",
      buttonClass: "",
      resetOnSubmit: false,
      resetOnComplete: true,
      createEventListener: true,
      minHeight: "400px",
      footer: null,
      themeId: "default",
      selectors: defaultSelectors,
      multistep: false,
      cascading: false,
      cascadeMode: "template",
      autoDisableNextStep: false, // null = ikuti cascading && multistep
      onCascade: null,
      calculation: false,
      namespace: null,
      emit: null,
      onSubmit: (_data: any) => { },
      files: "ignore",
      excludeEmpty: false,
      address: null,
      modules: null,
    };
    this.config = this.resolveConfig(defaultConfig, config);

    // Step 1: Loader efektif — preset inti bila consumer tidak menyuntik loader sendiri.
    this.#loader = this.config.modules ?? new ModuleLoader<iFormModuleContext, any>("form", CORE_FORM_MODULES);
  }

  /**
   * REFACTOR TOTAL: Merakit Form menggunakan struktur iBasicNode[] murni
   */
  public prepare(inputs: Array<any | HTMLElement | string> | any, _config: Partial<iFormConfig> = {}): HTMLElement {
    // Unwrap builder wrapper: { builder: "form", content: [...] } → [...fields]
    // console.log("FORMS", inputs)
    // console.log("config", _config)
    if (inputs && typeof inputs === "object" && !Array.isArray(inputs) && inputs.content !== undefined) {
      inputs = inputs.content;
    }
    this.#inputs = Array.isArray(inputs) ? inputs : [inputs];

    // 🌊 Siklus hidup baru per prepare: seluruh modul dilepas lalu dimuat ulang.
    this.#loader.unloadAll();
    this.#features = [];
    this.#cascade = null;
    this.#multistep = null;
    this.#validation = null;
    this.#onStepMounted = null;

    // const wrapper = this.render("@container", inputs);

    const form = this.render("@form", inputs) as HTMLFormElement;
    const formId = form.id;
    const isCascading = this.config.cascading === true;

    // 📄 The form's own heading: `title`/`description` are part of `iFormConfig`, so they
    // render instead of being silently ignored. They sit above the first group.
    if (this.config.title) form.appendChild(this.render("@form>title", this.config.title)!);
    if (this.config.description) form.appendChild(this.render("@form>desc", this.config.description)!);
    // 🌊 Engine kaskade dibangun bila cascading aktif — ATAU bila gerbang
    // next diminta eksplisit (autoDisableNextStep:true, mis. untuk kondisi眼
    // manual pada group schema tanpa cascading), agar gate() tetap berjalan.

    // 🧩 Semua modul fase prepare dimuat lewat loader: definisi yang memutuskan
    // apakah ia aktif (cascading/autoDisableNextStep, multistep), bukan Form.
    const moduleContext = this._buildModuleContext(form, "prepare");
    this.#features = this.#loader.resolveAll(moduleContext);
    this.#validation = this.#loader.loaded(FORM_MODULE_IDS.validation);
    this.#cascade = this.#loader.loaded(FORM_MODULE_IDS.cascade);
    this.#multistep = this.#loader.loaded(FORM_MODULE_IDS.multistep);

    // Iterasi dan transformasikan setiap input secara murni
    for (const [index, input] of Object.entries(this.#inputs)) {

      if (input instanceof HTMLElement) {
        const btn = this.scanForSubmitButton(input, formId);
        if (btn) {
          this.submitButtonId = btn.id || this.submitButtonId;
          form.append(btn);
        } else {
          form.append(input);
        }
      }

      // ==========================================
      // KASUS B: Input berupa Raw HTML String
      // ==========================================
      else if (typeof input === "string") {
        const btn = this.scanForSubmitButton(input, formId);
        // console.log("founded!!!!!", foundId)
        if (btn) {
          this.submitButtonId = btn.id;
          form.appendChild(btn)
        } else {
          form.insertAdjacentHTML("beforeend", input as any);
        }
        // Masukkan langsung string HTML-nya agar di-parse alami oleh DOMRenderer
      }

      // ==========================================
      // KASUS C: Input berupa Group Node (<fieldset>)
      // ==========================================
      else if (input && typeof input === "object" && "group" in input) {
        // 🌊 CASCADE: group pembawa .condition ditahan — placeholder <template>
        // ditanam di posisinya, dibangun sungguhan saat kondisinya terpenuhi
        if (isCascading && this.#cascade?.isCascadeItem(input)) {
          this.#cascade?.hold(form, String(index), input);
          continue;
        }

        // 🪜 MULTISTEP: group pembawa langkah DITAHAN — placeholder <template>
        // ditanam di posisinya; fieldset sungguhan baru dibangun saat tombol
        // Next/Back menekannya (lihat FormMultistepHandler._mount).
        //
        // One source of truth: `this.config.multistep` (resolved in the constructor), not
        // the `_config` argument `create()` happens to pass — the same file already read
        // `this.config.multistep` everywhere else.
        if (this.config.multistep) {
          this.#multistep?.hold(form, Number(index), input);
          continue;
        }

        const fieldset = this.renderGroup(input, formId, isCascading ? String(index) : undefined);
        if (input.id) fieldset.id = input.id;
        if (input.className) fieldset.classList.add(...String(input.className).split(/\s+/).filter(Boolean));
        // console.log("group", fieldset, this.#inputs.length)
        form.appendChild(fieldset);
      }

      // ==========================================
      // KASUS B2: Row — container layout, bukan fieldset
      // ==========================================
      else if (input && typeof input === "object" && "row" in input) {
        // A row carries no field data, but its children may still be conditional.
        if (isCascading && this.#cascade?.isCascadeItem(input)) {
          this.#cascade?.hold(form, String(index), input);
          continue;
        }

        form.appendChild(this.renderRow(input, formId, isCascading ? String(index) : undefined));
      }

      // ==========================================
      // KASUS D: Input berupa Parameter Objek Basic Tunggal
      // ==========================================
      else {
        // 🌊 CASCADE: input tunggal pembawa .condition juga ditahan seperti group
        if (isCascading && this.#cascade?.isCascadeItem(input)) {
          this.#cascade?.hold(form, String(index), input);
          continue;
        }

        // InputBuilder.prepare() mengelola isRoot dan melahirkan <div class="field"> murni
        const inputEl = this._renderField(input, formId);
        form.append(inputEl as any);
      }

    };

    // 🌊 CASCADE: aktifkan engine — delegasi input/change, evaluasi kondisi awal,
    // dan gerbang tombol next langsung diset di sini. (Engine yang dibuat khusus
    // untuk autoDisableNextStep juga di-attach — tanpa attach, gate() tak pernah jalan.)
    if (isCascading || this.config.autoDisableNextStep === true) this.#cascade?.attach(form);

    if (!this.submitButtonId && this.config.submitButton && !this.config.multistep) {
      const defaultSubmitBtn = this.render("@form>actions>submit", { isGroupBtn: false, formId }) as HTMLButtonElement;
      this.submitButtonId = defaultSubmitBtn.id;
      form.append(defaultSubmitBtn)
    }

    if (this.config.footer) {
      if (this.config.footer instanceof HTMLElement) {
        form.appendChild(this.config.footer);
      } else {
        const footerEl = this.render("@form>footer", this.config.footer) as HTMLElement;
        form.appendChild(footerEl);
      }
    }

    // if (wrapper && form) wrapper.appendChild(form);

    // console.log(form)
    return form as HTMLElement;
  }

  /**
   * Recursively renders a group (fieldset) and its child inputs or sub-groups.
   * Param `cascade` opsional: saat aktif, anak-anak group yang membawa `.condition`
   * ditahan ke registry kaskade alih-alih langsung dirender.
   */
  private renderGroup(groupInput: any, formId: string, cascadePath?: string): HTMLElement {
    const fieldset = this.render("@form>group", groupInput) as HTMLElement;

    const cascadeActive = this.config.cascading === true && cascadePath !== undefined;

    if (groupInput.group && Array.isArray(groupInput.group)) {
      groupInput.group.forEach((innerInput: any, _index: number) => {
        // console.log(hasTable, index)

        // 🌊 CASCADE: item anak pembawa .condition ditahan — placeholder <template>
        // ditanam di posisinya (terdaftar otomatis di #nodes) lalu rendering dilewati
        if (cascadeActive && this.#cascade?.isCascadeItem(innerInput)) {
          this.#cascade?.hold(fieldset, `${cascadePath}.group.${_index}`, innerInput);
          return;
        }

        // Case 1: Raw HTML String
        if (typeof innerInput === "string") {
          const btn = this.scanForSubmitButton(innerInput, formId);
          // console.log("AAA", btn)
          if (btn) this.submitButtonId = btn.id;
          fieldset.insertAdjacentHTML("beforeend", innerInput as any);
          const s = fieldset.querySelector("[type='submit']")
          if (s) s.id = this.submitButtonId!;
        }
        // Case 2: Nested Row Object -> a layout grid inside the group, not a field.
        // Without this branch a `{ row: [...] }` child fell through to `_renderField`,
        // whose builder had no `type` and rendered one nameless text input.
        else if (innerInput && typeof innerInput === "object" && "row" in innerInput) {
          const nestedRow = this.renderRow(innerInput, formId, cascadeActive ? `${cascadePath}.group.${_index}` : undefined);
          if (innerInput.id) nestedRow.id = innerInput.id;
          fieldset.appendChild(nestedRow);
        }
        // Case 3: Nested Group Object -> RECURSE!
        else if (innerInput && typeof innerInput === "object" && "group" in innerInput) {
          const nestedFieldset = this.renderGroup(innerInput, formId, cascadeActive ? `${cascadePath}.group.${_index}` : undefined);
          if (innerInput.id) nestedFieldset.id = innerInput.id;
          if (innerInput.table !== undefined) {
            const groupSubmitBtn = this.render("@form>actions>submit", { isGroupBtn: false, groupId: innerInput.id }) as HTMLButtonElement;

            // 🧩 Modul pemilik tabel yang membangunnya dan menyambungkan tombol grup.
            for (const feature of this.#features) {
              const nodes = feature.renderTable?.(innerInput.table, {
                fieldset: nestedFieldset,
                submitButton: groupSubmitBtn,
                groupId: innerInput.id,
              });
              if (nodes && nodes.length) {
                nestedFieldset.append(groupSubmitBtn, ...nodes);
                break;
              }
            }
          }

          fieldset.appendChild(nestedFieldset);

        }
        // Case 3: Regular Input Item or DOM Element
        else {
          const inputEl = innerInput instanceof HTMLElement
            ? innerInput
            : this._renderField(innerInput, formId);

          const btn = this.scanForSubmitButton(inputEl, formId);
          if (btn) this.submitButtonId = btn.id;

          fieldset.append(inputEl as any);
        }
      });
    }

    // Handle submit button per group level if specified
    if (groupInput.submitButton) {
      const submitBtn = this.render("@form>actions>submit", { isGroupBtn: true, formId }) as HTMLButtonElement;
      this.submitButtonId = submitBtn.id;
      fieldset.appendChild(submitBtn);
    }

    // 🧩 A group can carry its own control set (add/edit/save/search). The form only
    // offers the fieldset; the controls module owns the buttons and what they do.
    this.#appendActions(fieldset, groupInput);

    return fieldset;
  }

  /**
   * Renders a row: fields side by side in a CSS grid.
   *
   * A row is **layout only** — it produces no legend, no fieldset and no field data, which
   * is why `group` (fieldset + legend) stays a separate word in the schema. Children wrap
   * on their own once the declared column count is exhausted; a child's width comes from
   * its `wide` hint (`50` → half, `"auto"` → full row) or an explicit `span`.
   *
   * Nesting works: a row inside a row is just another grid cell, so a stacked column is
   * `{ column: 1, wide: 50, row: [...] }`.
   *
   * @param rowInput - Row node (`{ label, column, row: [...] }`).
   * @param formId - Id of the owning form.
   * @param cascadePath - Path segment when cascade is active, so a conditional child can
   *   be held and mounted later with the same key the engine walks.
   * @returns The row container element.
   */
  private renderRow(rowInput: any, formId: string, cascadePath?: string): HTMLElement {
    const container = this.render("@form>row", rowInput) as HTMLElement;
    const columns = columnsOf(rowInput.column);

    applyRowColumns(container, columns);
    if (rowInput.id) container.id = rowInput.id;
    if (rowInput.className) container.classList.add(...String(rowInput.className).split(" ").filter(Boolean));

    // Heading and note span the whole row, like a fieldset legend would.
    if (rowInput.label) container.appendChild(this.render("@form>row>title", rowInput.label)!);
    if (rowInput.description) container.appendChild(this.render("@form>group>desc", rowInput.description)!);

    const cascadeActive = this.config.cascading === true && cascadePath !== undefined;
    const children: any[] = Array.isArray(rowInput.row) ? rowInput.row : [];

    children.forEach((child, index) => {
      const childPath = `${cascadePath}.row.${index}`;

      // Cascade: a conditional child is held in place and mounted when its rule passes.
      if (cascadeActive && this.#cascade?.isCascadeItem(child)) {
        this.#cascade?.hold(container, childPath, child);
        return;
      }

      let element: HTMLElement | null = null;

      if (typeof child === "string") {
        container.insertAdjacentHTML("beforeend", child);
        element = container.lastElementChild as HTMLElement | null;
      } else if (child instanceof HTMLElement) {
        element = child;
      } else if (child && typeof child === "object" && "row" in child) {
        element = this.renderRow(child, formId, cascadeActive ? childPath : undefined);
      } else if (child && typeof child === "object" && "group" in child) {
        element = this.renderGroup(child, formId, cascadeActive ? childPath : undefined);
      } else {
        element = this._renderField(child, formId) as HTMLElement;
      }

      if (!element) return;

      const submitBtn = this.scanForSubmitButton(element, formId);
      if (submitBtn) this.submitButtonId = submitBtn.id;

      applyRowSpan(element, childSpanOf(child, columns));
      container.appendChild(element);
    });

    // 🧩 A row is a scope too (it is a layout container, not a group, but its children can
    // be a record). Same offer as `renderGroup`: the controls module owns the buttons.
    this.#appendActions(container, rowInput);

    return container;
  }

  /**
   * Offers a group/row container to the loaded modules for a control set.
   *
   * @param container - `<fieldset>` or row `<div>` that declares `actions`.
   * @param node - Group/row schema node.
   *
   * @summary The first module that answers wins, exactly like `renderTable`: the form never
   * imports the controls builder, and a preset without it simply renders no buttons.
   */
  #appendActions(container: HTMLElement, node: any): void {
    const actions = node.actions ?? node.config?.actions;
    if (!actions) return;

    for (const feature of this.#features) {
      const nodes = feature.renderActions?.(container, {
        actions,
        position: node.actionsPosition ?? node.config?.position,
      });
      if (nodes && nodes.length) {
        container.append(...nodes);
        return;
      }
    }
  }

  /**
   * Renders one field through the loaded input module.
   *
   * @summary Keeps `InputBuilder` out of the builder: the module owns field
   * creation, the form only asks for an element.
   * @param input - Input schema or raw descriptor.
   * @param formId - Id of the owning form.
   * @returns The rendered field element.
   * @throws {Error} When no loaded module can render fields, meaning the `input`
   *   module is missing from the presets.
   */
  private _renderField(input: any, formId: string): HTMLElement {
    for (const feature of this.#features) {
      const element = feature.renderField?.(input, formId);
      if (element) return element;
    }

    throw new Error("[FormBuilder] No module rendered the field. Register the input module in the loader preset.");
  }

  // ==================================================================
  // 🧩 HOST MODULE — kontrak sempit untuk sub-modul Form. Sub-modul tidak
  // pernah menerima instance FormBuilder: hanya form element, emitter, host
  // pesan, dan config yang sudah diresolve.
  // ==================================================================
  private _buildModuleContext(form: HTMLFormElement, phase: FormModulePhase): iFormModuleContext {
    return {
      builder: String(this.builderId),
      form,
      inputs: this.#inputs,
      phase,
      emit: typeof this.config.emit === "function" ? (this.config.emit as (event: string, payload: any) => void) : null,
      builderConfig: {
        themeId: this.config.themeId,
        namespace: this.config.namespace,
        emit: typeof this.config.emit === "function" ? this.config.emit : null,
      },
      showMessage: (content) => this._notify(form, false, content),
      config: this.config,
      cascadeHost: () => this._buildCascadeHost(),
      multistepHost: () => this._buildMultistepHost(),
    };
  }

  // ==================================================================
  // 🌊 HOST CASCADE — Form hanya menyediakan "tangan" ke engine (Cascade.ts):
  // renderGroup untuk membangun fieldset, render buttons-set untuk step
  // multistep, dan refreshSteps untuk memperbaiki langkah aktif bila sebuah
  // step di-unmount oleh kaskade. Evaluasi/mount/unmount/gate ada di engine.
  // ==================================================================
  private _buildCascadeHost(): FormCascadeHost {
    return {
      builder: this.builderId,
      inputs: this.#inputs,
      multistep: this.config.multistep === true,
      cascadeMode: this.config.cascadeMode ?? "template",
      // Gerbang next: null/undefined = ikuti cascading; true = paksa kunci;
      // false = nonaktif. (Lihat iFormConfig.autoDisableNextStep)
      autoDisableNextStep: this.config.autoDisableNextStep ?? (this.config.cascading === true && this.config.multistep === true),
      onCascade: typeof this.config.onCascade === "function" ? this.config.onCascade : null,
      emit: typeof this.config.emit === "function" ? this.config.emit : null,
      renderGroup: (group, formId, path) => this.renderGroup(group, formId, path),
      renderRow: (row, formId, path) => this.renderRow(row, formId, path),
      // The engine builds conditional fields without knowing `InputBuilder`, and asks the
      // input adapters to mount the area it just created.
      renderField: (item, formId) => this._renderField(item, formId),
      mountInputs: (root) => {
        for (const feature of this.#features) feature.mount?.(root);
      },
      refreshSteps: (form) => this.#multistep?.refresh(form),
      // 🧾 Tombol next terkunci kondisi kaskade → jalur terpusat.
      reportCascadeBlocked: (info) => this.#validation?.reportCascadeBlocked(info),
    };
  }

  // ==================================================================
  // 🪜 HOST MULTISTEP — Form hanya menyediakan "tangan" ke engine
  // (Multistep.ts): renderGroup untuk melahirkan fieldset langkah saat
  // tombol Next/Back menekannya, dan render buttons-set untuk navigasi.
  // Penomoran langkah, status .active, dan gerbang validasi ada di engine.
  // ==================================================================
  private _buildMultistepHost(): FormMultistepHost {
    return {
      builder: this.builderId,
      inputs: this.#inputs,
      renderGroup: (group, formId, path) => this.renderGroup(group, formId, path),
      renderButtonsSet: (payload) => this.render("@form>buttons-set", payload)!,
      onStepMount: (fieldset) => this.#onStepMounted?.(fieldset),
      // 🌊 Setiap perpindahan langkah melahirkan set tombol navigasi yang baru —
      // engine kaskade perlu menilai ulang gerbang next yang baru tersebut.
      onStepChange: () => this.#cascade?.gate(),
      // 🧾 Next ditolak validasi native langkah → jalur terpusat.
      reportNativeInvalid: (form, step) => this.#validation?.reportNative(form, step),
    };
  }

  /** Set nilai field secara programatik — engine memantik evaluasi via event change */
  public setCascadeValue(field: string, value: any): void {
    this.#cascade?.setValue(field, value);
  }
  /**
   * 🪜 Multistep: posisi langkah aktif, gerbang validasi, dan pelahirkan
   * fieldset langkah kini sepenuhnya dikelola engine FormMultistepHandler
   * (Handlers/Multistep.ts) — lihat _buildMultistepHost().
   */

  public initialize(formElement: HTMLFormElement): void {
    if (formElement && this.config.createEventListener) {
      this.attachFormListener(formElement);
    }

    // 🧮 Fase initialize: modul yang membaca DOM final (calculation) baru layak dimuat
    // sekarang, setelah step multistep lahir dari attach() di atas.
    this.#features.push(...this.#loader.resolveAll(this._buildModuleContext(formElement, "initialize")));

    // console.log(`[Form Engine v2] Form ID "${formElement?.id}" successfully compiled with active listeners.`);
  }


  protected template(typeKey: FormElementType, el: HTMLElement, payload?: any): void {
    switch (typeKey) {
      case "@container":
        el.style.minHeight = this.config.minHeight;
        break;

      case "@form": {
        const form = el as HTMLFormElement;
        const randomSuffix = Math.random().toString(36).substring(7);

        form.id = this.config.id ? `form-${this.config.id}`.replace(/\s+/g, "-") : `form-${randomSuffix}`;

        // Class tokens are added one by one, never concatenated: string building appends a
        // second copy on every re-render and leaves double spaces behind.
        if (this.config.className) {
          form.classList.add(...String(this.config.className).split(/\s+/).filter(Boolean));
        }
        if (this.config.multistep) form.classList.add("multistep");

        form.method = this.config.method;
        if (this.config.action) form.action = this.config.action;
        // The form's own name, used by submit handlers and by `document.forms`.
        if (this.config.name) form.name = String(this.config.name);
        break;
      }

      case "@form>group": {
        if (payload?.class) el.className = `${el.className} ${payload.class}`.trim();

        const legendText = payload?.legend || payload?.title;
        if (legendText) {
          const legend = document.createElement("legend"); // Element internal pendukung kaku
          legend.className = "title";
          legend.textContent = String(legendText);
          el.appendChild(legend);
        }

        if (payload?.description) {
          const desc = document.createElement("p");
          desc.className = "desc";
          desc.textContent = String(payload.description);
          el.appendChild(desc);
        }

        if (payload?.infos) {
          const list = document.createElement("ul");
          list.className = "group-infos";
          if (Array.isArray(payload.infos)) {
            for (const i of payload.infos) {
              const item = document.createElement("li")
              item.className = "item"
              item.textContent = String(i);
              list.appendChild(item);
            }
          }
          el.appendChild(list);
        }
        break;
      }

      case "@form>row>title":
        el.textContent = typeof payload === "string" ? payload : String(payload?.label ?? "");
        break;

      case "@form>title":
      case "@form>desc":
        el.textContent = typeof payload === "string" ? payload : String(payload?.label ?? payload?.description ?? "");
        break;

      case "@form>group>desc":
        el.textContent = typeof payload === "string" ? payload : String(payload?.description ?? "");
        break;

      case "@form>actions>submit": {
        const btn = el as HTMLButtonElement;
        btn.className = `${this.config.buttonClass} ${btn.className || ""}`.trim();
        btn.type = "submit";
        btn.textContent = this.config.buttonText;

        const sIcon = document.createElement("i");
        sIcon.className = "icon checkmark";
        btn.appendChild(sIcon)

        if (payload?.isGroupBtn) {
          btn.id = payload.formId ? `btn-${payload.formId}` : `btn-group-${Math.random().toString(36).substring(7)}`;
        } else {
          btn.id = `btn-${payload?.formId || "default"}`;
          // btn.style.marginTop = "1rem";
          // btn.style.padding = "1rem";
          // btn.style.float = "right";
        }
        break;
      }

      case "@form>buttons-set": {

        const next = document.createElement("button");
        next.className = "next"
        next.type = "button";
        const nIcon = document.createElement("i");
        nIcon.className = "icon arrow right";
        next.textContent = "next";
        next.appendChild(nIcon);

        const back = document.createElement("button");
        back.className = "back"
        back.type = "button";
        const bIcon = document.createElement("i");
        bIcon.className = "icon arrow left";
        back.textContent = "back";
        back.prepend(bIcon);
        // console.log({ payload })
        if (Number(payload.index) === 0) {
          el.append(next);
        } else if (payload.isLast) {
          const submit = this.render("@form>actions>submit") as HTMLButtonElement;
          el.append(back, submit)
        } else {
          el.append(back, next)
        }
        break;
      }

      case "@form>footer":
        el.textContent = typeof payload === "string" ? payload : (payload?.text || "");
        break;
    }
  }


  public unmount(): void {
    // Loader memiliki siklus hidup modul: dispose/destroy dipanggil oleh definisi.
    this.#loader.unloadAll();
    this.#features = [];
    this.#validation = null;
    this.#cascade = null;
    this.#multistep = null;
    this.#onStepMounted = null;
    this.destroy();
  }

  /**
   * Listener submit/klik + orkestrasi hook kolaborator (mount, beforeSubmit).
   */

  /* 
  * // TODO 
  * // Tambahkan baris evakuasi ini di dalam CustomEvent formSubmit Anda:
  * detail: {
  *   formId: form.id,
  *   data: dataWithFiles,
  *   complete: (success: boolean, messageConfig: any, resetForm: boolean) => {
  *     toggleLoadingState(success);
  *     this.createMessage(form, success, messageConfig);
  *     if (resetForm || this.config.resetOnComplete) {
  *       form.reset();
  *       if (IdAddress && typeof IdAddress.destroy === "function") IdAddress.destroy();
  *       if (table && typeof table.destroy === "function") table.destroy();
  *     }
  *   },
  *   // Ketika fungsi reset dipanggil dari luar (misal saat unmount komponen)
  *   reset: () => {
  *     form.reset();
  *     if (IdAddress && typeof IdAddress.destroy === "function") IdAddress.destroy();
  *     if (table && typeof table.destroy === "function") table.destroy();
  *     
  *     // Laporkan ke Service Worker untuk hanguskan token secara instan demi keamanan multi-user
  *     if (navigator.serviceWorker.controller) {
  *       navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_TOKEN' });
  *     }
  *   }
  * }
  * 
  */
  private attachFormListener(form: HTMLFormElement): void {
    // 🧩 Kolaborator (uploader, IdAddress, tabel grup) dimuat sebagai modul; form
    // hanya memanggil hook mount/beforeSubmit/renderTable miliknya.

    const toggleLoadingState = (success: boolean) => {
      form.classList.remove("loading");
      form.querySelectorAll(".field").forEach((f) => f.classList.remove("error"));
      if (!success) form.querySelectorAll(".field").forEach((f) => f.classList.add("error"));
    };

    // 🧩 A control set can repeat a group or a row (`repeater`). The copy arrives with the
    // source's state — including conditional items that were visible. Engines re-evaluate
    // against the copy's own (empty) values instead of inheriting that state.
    form.addEventListener("scopeAdded", () => {
      this.#cascade?.sync();
      this.#multistep?.refresh(form);
    });

    // 🪜 Multistep: engine melahirkan langkah awal + memasang delegasi next/back.
    // Setiap fieldset step yang lahir (termasuk step 0) ditawarkan ke seluruh
    // modul kolaborator lewat hook mount, lalu kaskade mengevaluasi ulang.
    this.#onStepMounted = (fieldset: HTMLElement) => {
      // 🧩 Setiap area DOM yang baru lahir ditawarkan ke seluruh modul kolaborator.
      for (const feature of this.#features) feature.mount?.(fieldset);
      // 🌊 Kaskade: langkah yang baru lahir membawa placeholder anak
      // ber-condition (ditahan saat renderGroup) — evaluasi segera agar
      // yang kondisinya sudah terpenuhi langsung lahir, tanpa menunggu
      // event input/change berikutnya.
      this.#cascade?.sync();
    };
    this.#multistep?.attach(form);

    // � Form biasa (non-multistep): seluruh input sudah ada di DOM sejak prepare —
    // hook mount dijalankan sekali di sini. Pada form multistep, langkah masih
    // tertahan sebagai <template> sehingga mount-nya menyusul via onStepMount.
    for (const feature of this.#features) feature.mount?.(form);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      // 🧾 Gerbang validasi NATIVE sebelum memproses submit. (Khusus multistep,
      // langkah aktif sudah divalidasi engine saat menekan Next; ini jaring
      // pengaman untuk submit biasa / Enter / form.submit() programatik.)
      if (!form.checkValidity()) {
        this.#validation?.reportNative(form);
        return;
      }

      form.classList.add("loading");
      const data = collectFormValues(form, { excludeEmpty: this.config.excludeEmpty });

      // 🧩 Kolaborator menyumbang datanya (file, alamat, tabel) sebelum event rilis.
      for (const feature of this.#features) await feature.beforeSubmit?.(data);

      // `resetOnSubmit` clears the controls before the consumer answers — the payload is
      // already captured, so the visitor can start a second entry while the first uploads.
      if (this.config.resetOnSubmit) this.#resetForm(form);

      // `onSubmit` is the direct callback; `formSubmit` is the event. Both see the same
      // completed payload, and a throwing callback must not stop the event.
      if (typeof this.config.onSubmit === "function") {
        try {
          this.config.onSubmit(data);
        } catch (error) {
          console.error("[FormBuilder] onSubmit failed:", error);
        }
      }

      form.dispatchEvent(
        new CustomEvent("formSubmit", {
          bubbles: true,
          detail: {
            formId: form.id,
            data,
            complete: (success: boolean, messageConfig: any, resetForm: boolean) => {
              toggleLoadingState(success);
              this._notify(form, success, messageConfig);
              if (resetForm || this.config.resetOnComplete) this.#resetForm(form);
            },
            reset: () => this.#resetForm(form)
          }
        }));
    });

    // Delegasi klik submit di level form — tombol submit yang lahir setelah
    // initialize (dari step kaskade) tetap hidup, tak perlu re-bind manual.
    form.addEventListener("click", (event) => {
      const button = (event.target as HTMLElement)?.closest?.("button[type=submit], input[type=submit]") as HTMLButtonElement | null;
      if (!button) return;
      if (!form.contains(button) && button.getAttribute("form") !== form.id) return;
      event.preventDefault();

      // 🧾 Klik submit harus lolos validasi native dulu — bila tidak, laporkan
      // (emit + toast) dan jangan teruskan ke requestSubmit. requestSubmit juga
      // akan memblokir submit-event, jadinya tanpa pengecekan ini klik pada form
      // tak valid diam-diam tidak melakukan apa-apa.
      if (!form.checkValidity()) {
        this.#validation?.reportNative(form);
        return;
      }
      form.requestSubmit(button);
    });

  }

  /**
   * Presents a status message through the loaded message module.
   *
   * @summary `FormBuilder` owns no message renderer: the module that implements
   * `notify` decides how the message appears. Without such a module the builder
   * warns instead of failing, so plugging the module out never breaks rendering.
   * @param form - Form the message belongs to.
   * @param success - Whether the action that produced the message succeeded.
   * @param content - Message content, possibly already filled by the caller.
   * @returns Nothing.
   */
  private _notify(form: HTMLFormElement, success: boolean, content: iMessageContent): void {
    if (!content) return;

    for (const feature of this.#features) {
      if (!feature.notify) continue;
      feature.notify(content, { form, success });
      return;
    }

    console.warn("[FormBuilder] No module handles messages. Register the message module in the loader preset.");
  }

  /**
   * Resets the form and tells every adapter to drop its own state.
   *
   * @summary `form.reset()` restores controls the browser knows about; a preview table, an
   * uploader's file list or an address picker keep showing the old values unless their
   * module is told. The shell owns the controls, the modules own the rest.
   * @param form - Form to reset.
   */
  #resetForm(form: HTMLFormElement): void {
    form.reset();

    for (const feature of this.#features) {
      try {
        feature.reset?.(form);
      } catch (error) {
        console.warn("[FormBuilder] module reset failed:", error);
      }
    }
  }


  /**
   * Helper internal untuk memindai string HTML mentah atau element hidup 
   * guna mencari tombol submit yang sudah ada (untuk link ID)
   */
  private scanForSubmitButton(input: any, formId: string): HTMLButtonElement | null {
    if (!input) return null;
    let btn: HTMLButtonElement | null = null;

    if (input instanceof HTMLButtonElement) {
      btn = input.type === "submit" ? input : input.querySelector("button[type=submit], input[type=submit]");
    } else if (typeof input === "string") {
      const wrapper = document.createElement("div");
      wrapper.insertAdjacentHTML("beforeend", input.trim());
      btn = wrapper.querySelector("button[type=submit], input[type=submit]");
    }

    if (btn) {
      if (!btn.id) btn.id = `btn-${formId}`;
      btn.setAttribute("form", formId);
      return btn;
    }
    return null;
  }
}


