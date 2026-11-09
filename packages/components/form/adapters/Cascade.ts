// ======================================================================
// 🌊 CASCADE ENGINE — seluruh logika kaskade hidup di file ini.
// FormBuilder cukup: buat FormCascade(host), tanam placeholder via hold(),
// lalu attach(form) sekali. Evaluasi, mount/unmount, gerbang tombol next,
// dan delegasi listener berjalan di dalam engine, tanpa membebani Form.ts.
// ======================================================================

import type { iModuleDefinition } from "@aio-ui/module-loader";
import { FORM_MODULE_IDS } from "../FormModuleTypes";
import type {
  CascadeBlockedInfo,
  FormCascadeHost,
  FormCascadeMode,
  iCascadeEventDetail,
  iCascadeState,
  iFormCondition,
  iFormModuleContext,
} from "../FormModuleTypes";

/**
 * Cascade engine.
 *
 * @summary Owns every rule about when a conditional input or group may exist: hold,
 * evaluate, mount/unmount, the multistep gate, and the delegated listeners. It is a
 * `adapters/cascade-adapter` entry of the form package. It knows nothing about
 * `InputBuilder` or the input registry: the form offers what it needs through
 * {@link FormCascadeHost}.
 */
export class FormCascadeHandler {

  /** Objek skema pembawa .condition (bukan elemen DOM / string) */
  static isCascadeItem(item: any): boolean {
    return Boolean(item && typeof item === "object" && !(item instanceof Node) && item.condition != null);
  }

  /** Telusuri pohon skema; visit mengembalikan false untuk memangkas turunannya */
  static walkInputs(items: any[], prefix: string, visit: (item: any, path: string) => boolean | void): void {
    items?.forEach((item: any, i: number) => {
      if (!item || typeof item !== "object" || item instanceof Node) return;
      const path = `${prefix}${i}`;
      if (visit(item, path) === false) return;

      // Containers: a fieldset group and a layout row both hold children, and a
      // conditional child inside either one must be walked with the same path shape
      // `renderGroup`/`renderRow` used when they held it.
      if (Array.isArray(item.group)) this.walkInputs(item.group, `${path}.group.`, visit);
      if (Array.isArray(item.row)) this.walkInputs(item.row, `${path}.row.`, visit);
    });
  }

  /** Peta nama/id field → index langkah multistep di skema (aturan gerbang masuk) */
  static collectFieldSteps(inputs: any[]): Map<string, number> {
    const map = new Map<string, number>();
    const visit = (item: any, step: number): void => {
      if (!item || typeof item !== "object" || item instanceof Node) return;
      const key = item.name ?? item.id;
      if (key) map.set(String(key), step);
      if (Array.isArray(item.group)) item.group.forEach((child: string | HTMLElement | any) => visit(child, step));
      if (Array.isArray(item.row)) item.row.forEach((child: string | HTMLElement | any) => visit(child, step));
    };
    inputs.forEach((item, step) => visit(item, step));
    return map;
  }

  static normalizeCondition(raw: any): iFormCondition {
    if (typeof raw === "function") return { when: raw } as iFormCondition;
    return (raw && typeof raw === "object" ? raw : {}) as iFormCondition;
  }

  static isEmptyValue(value: any): boolean {
    return value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
  }

  /** Nilai kontrol DOM selalu string — samakan boolean/angka dengan koersi terkendali */
  static looseEqual(a: any, b: any): boolean {
    if (a === b) return true;
    const truthy = (v: any) => v === true || v === "true" || v === 1 || v === "1" || v === "on";
    if (truthy(a) && truthy(b)) return true;
    return a != null && b != null && String(a) === String(b);
  }

  static matchRule(condition: iFormCondition, value: any): boolean {
    if (condition.filled) return !this.isEmptyValue(value);
    if (condition.in !== undefined) return ([] as any[]).concat(condition.in as any).some((v) => this.looseEqual(v, value));
    if (condition.notIn !== undefined) return !([] as any[]).concat(condition.notIn as any).some((v) => this.looseEqual(v, value));
    if (condition.notEquals !== undefined) return !this.looseEqual(condition.notEquals, value);
    if (condition.equals !== undefined) return this.looseEqual(condition.equals, value);
    return !this.isEmptyValue(value); // default: field terisi
  }

  static conditionMet(condition: iFormCondition, resolve: (field: string) => any, values: Record<string, any>): boolean {
    try {
      if (typeof condition.when === "function") {
        const fields = condition.field ? ([] as any[]).concat(condition.field as any) : [];
        return Boolean(condition.when(fields.length ? resolve(String(fields[0])) : undefined, values));
      }
      const fields = condition.field ? ([] as any[]).concat(condition.field as any).map(String) : [];
      if (!fields.length) return false; // tanpa field/when tidak ada yang bisa dipenuhi
      return fields.every((field) => this.matchRule(condition, resolve(field)));
    } catch (error) {
      console.warn("[Form Cascade] condition evaluation failed:", error);
      return false;
    }
  }

  /** Kumpulkan snapshot nilai semua kontrol DOM di dalam form */
  static collectValues(form: HTMLFormElement): Record<string, any> {
    const values: Record<string, any> = {};
    form?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input[name], select[name], textarea[name]")
      .forEach((el) => { values[el.name || el.id] = this.readControlValue(form, el); });
    return values;
  }

  /** Baca nilai terkini sebuah kontrol (checkbox/radio/select-multiple/file disesuaikan) */
  static readControlValue(form: HTMLFormElement | null, el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): any {
    if (el instanceof HTMLInputElement) {
      if (el.type === "checkbox") return el.checked ? (el.value && el.value !== "on" ? el.value : true) : null;
      if (el.type === "radio") {
        const checked = form?.querySelector<HTMLInputElement>(`input[type="radio"][name="${CSS.escape(el.name)}"]:checked`);
        return checked ? checked.value : null;
      }
      if (el.type === "file") return el.files?.length || null;
      return el.value;
    }
    if (el instanceof HTMLSelectElement) {
      return el.multiple ? Array.from(el.selectedOptions).map((option) => option.value) : el.value;
    }
    return el.value;
  }

  /** Fallback terakhir: nilai preset dari descriptor skema */
  static findSchemaValue(items: any[], field: string): any {
    for (const item of items || []) {
      if (!item || typeof item !== "object" || item instanceof Node) continue;
      if ((item.name || item.id) === field) {
        if (item.type === "checkbox" || item.type === "radio") return item.checked ? (item.value ?? true) : null;
        return item.value;
      }
      const nested = this.findSchemaValue(item.group, field);
      if (nested !== undefined) return nested;
    }
    return undefined;
  }

  /**
   * Urutan lookup nilai: kontrol di dalam instance → kontrol form → descriptor skema.
   *
   * @param state - Form, schema inputs.
   * @param field - Field name the condition refers to.
   * @param scope - Element the condition lives in. A repeated group is its own instance,
   *   and its controls are suffixed (`sku` → `sku-1`), so the lookup starts there.
   */
  static resolveFieldValue(state: iCascadeState, field: string, scope?: Element | null): any {
    const control = this.findControl(scope, field) ?? this.findControl(state.form, field);
    if (control) return this.readControlValue(state.form, control);
    return this.findSchemaValue(state.inputs, field);
  }

  /**
   * Finds the control that stands for a schema field under a root.
   *
   * @param root - Element to search (instance first, then the form).
   * @param field - Field name or id.
   * @returns The control, or `null`.
   *
   * @summary Exact name/id first; then the clone form `field-<n>` that a repeated group
   * writes, so one copy's conditional field follows that copy's own value.
   */
  static findControl(root: Element | null | undefined, field: string): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null {
    if (!root) return null;

    const exact = root.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      `[name="${CSS.escape(field)}"], #${CSS.escape(field)}`
    );
    if (exact) return exact;

    const clonePattern = new RegExp(`^${field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-\\d+$`);
    const candidates = root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("[name], [id]");
    for (const candidate of Array.from(candidates)) {
      if (clonePattern.test(candidate.getAttribute("name") ?? "") || clonePattern.test(candidate.id)) return candidate;
    }
    return null;
  }

}

// 🌊 ENGINE KASKADE — satu instance per form yang cascading:true.
// Placeholders hidup di Map privat engine (bukan Builder.#nodes) dan semua
// listener memakai delegasi di level form, sehingga step yang baru lahir
// otomatis terpantau tanpa re-bind manual.
export class FormCascade {
  private host: FormCascadeHost;
  private form: HTMLFormElement | null = null;
  private placeholders = new Map<string, HTMLElement>();
  private onChange: ((event: Event) => void) | null = null;
  private onPress: ((event: PointerEvent) => void) | null = null;

  // Info gerbang kaskade SAAT INI yang terkunci. Disimpan agar bisa dilaporkan
  // (toast) tepat ketika tombol next yang DISABLED ditekan — bukan otomatis
  // tiap kali masuk langkah terkunci / status berubah.
  private lastBlockedInfo: CascadeBlockedInfo | null = null;

  /** How conditional items are held; see {@link FormCascadeMode}. */
  readonly #mode: FormCascadeMode;

  constructor(host: FormCascadeHost) {
    this.host = host;
    this.#mode = host.cascadeMode === "hidden" ? "hidden" : "template";
  }

  /**
   * Tells whether a schema item carries a cascade condition.
   *
   * @summary Delegates to {@link FormCascadeHandler.isCascadeItem} so hosts can
   * ask the loaded engine instead of importing the handler class themselves.
   * @param item - Schema item to inspect.
   * @returns `true` when the item carries a `condition`.
   */
  public isCascadeItem(item: any): boolean {
    return FormCascadeHandler.isCascadeItem(item);
  }

  /**
   * Keeps a not-yet-met conditional item in place (called by prepare/renderGroup).
   *
   * In `template` mode this plants a `<template>` placeholder and the real element is
   * built when the condition passes. In `hidden` mode the element is built **now** and
   * toggled with the `hidden` attribute, so a module that needs to inject data into it
   * (an address picker filling the next select) has a live element to work with.
   *
   * @param parent - Container the item belongs to.
   * @param path - Cascade path key for this item.
   * @param item - Schema item; required by `hidden` mode to build it immediately.
   */
  hold(parent: HTMLElement, path: string, item?: any): void {
    if (this.#mode === "hidden" && item) {
      const formId = parent.closest("form")?.id ?? "";
      const element = this.#build(item, formId, path);
      element.dataset.cascade = path;
      // `hidden` is the semantic flag; `data-cascade-hidden` is the layout switch, because
      // Form.css keeps `[hidden]` fields in the flow (visibility) to avoid jumping.
      element.hidden = true;
      element.setAttribute("data-cascade-hidden", "");
      parent.appendChild(element);
      this.hiddenItems.set(path, element);
      return;
    }

    const placeholder = document.createElement("template");
    placeholder.dataset.cascade = path;
    this.placeholders.set(path, placeholder);
    parent.appendChild(placeholder);
  }

  /** Elements held by the `hidden` mode: path → live element. */
  private hiddenItems = new Map<string, HTMLElement>();

  /**
   * Every live, non-template node stamped with a cascade path.
   *
   * @param form - Form the engine is attached to.
   * @param path - Cascade path key.
   * @returns The instances, in document order (a repeated group has more than one).
   */
  #instances(form: HTMLFormElement, path: string): HTMLElement[] {
    return this.#cascadeNodes(form, path).filter((node) => !(node instanceof HTMLTemplateElement)) as HTMLElement[];
  }

  /** Every node — placeholders included — stamped with a cascade path. */
  #cascadeNodes(form: HTMLFormElement, path: string): Element[] {
    return Array.from(form.querySelectorAll(`[data-cascade="${CSS.escape(path)}"]`));
  }

  /** A fresh placeholder for an item that is being held again. */
  #placeholderFor(path: string): HTMLTemplateElement {
    const placeholder = document.createElement("template");
    placeholder.dataset.cascade = path;
    this.placeholders.set(path, placeholder);
    return placeholder;
  }

  /**
   * Builds a conditional item for the copy of a repeated group.
   *
   * @param item - Schema item to build.
   * @param formId - Owning form id.
   * @param path - Cascade path key.
   * @param instance - Repeated scope the item belongs to, when there is one.
   * @returns The built element, with the copy's id/name suffix applied.
   *
   * @summary `#build` renders from the schema, so a field built inside a copy would get
   * the original's id (`note`) and collide with it. The copy's own suffix (`-1`) is
   * applied the same way duplication does it.
   */
  #buildForInstance(item: any, formId: string, path: string, instance: HTMLElement | null): HTMLElement {
    const element = this.#build(item, formId, path);
    const suffix = instance ? /(-\d+)$/.exec(instance.id)?.[1] ?? "" : "";
    if (!suffix) return element;

    if (element.id) element.id += suffix;
    element.querySelectorAll<HTMLElement>("[id]").forEach((child) => { child.id += suffix; });
    element.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea")
      .forEach((control) => { if (control.name) control.name += suffix; });
    return element;
  }

  /**
   * Builds the real element for a conditional item.
   *
   * @param item - Schema item (group or field).
   * @param formId - Owning form id.
   * @param path - Cascade path key.
   * @returns The built element, already stamped with `data-cascade`.
   */
  #build(item: any, formId: string, path: string): HTMLElement {
    let el: HTMLElement | null = null;

    if (item && typeof item === "object" && "group" in item) {
      el = this.host.renderGroup(item, formId, path);
      if (el) {
        if (item.id) el.id = item.id;
        if (item.className) el.classList.add(...String(item.className).split(/\s+/).filter(Boolean));
        // A freshly born multistep step only carries its step number — the navigation
        // buttons live at form level as one shared set.
        if (this.host.multistep && !path.includes(".")) el.dataset.index = path;
        // Wake the input adapters in the new area, including raw HTML fields.
        this.host.mountInputs?.(el);
      }
    } else if (item && typeof item === "object" && "row" in item) {
      el = this.#buildRow(item, formId, path);
    } else {
      el = this.host.renderField(item, formId);
    }

    if (!el) {
      const label = item && (item.id || item.name || item.type);
      throw new Error(
        `[Form Cascade] Gagal membangun elemen kaskade pada path "${path}"` +
        (label ? ` untuk "${label}"` : "") +
        ". Pastikan selektor '@form>group' terkonfigurasi & host.renderField mengembalikan elemen yang valid."
      );
    }

    el.dataset.cascade = path;
    return el;
  }

  /**
   * Builds a layout row through the host, so a conditional row keeps its grid.
   *
   * @param item - Row node.
   * @param formId - Owning form id.
   * @param path - Cascade path key.
   * @returns The row container.
   */
  #buildRow(item: any, formId: string, path: string): HTMLElement {
    return this.host.renderRow(item, formId, path);
  }

  /** Aktifkan engine: delegasi input/change + sync + gate awal */
  attach(form: HTMLFormElement): void {
    this.form = form;
    this.onChange = () => this.sync();
    form.addEventListener("input", this.onChange);
    form.addEventListener("change", this.onChange);

    // 🧾 Deteksi penekanan tombol next yang DISABLED (terkunci kondisi).
    // Tombol disabled menelan event click, tapi pointerdown tetap meledak —
    // jadi di sini kita tangkap & laporkan gerbangnya. Ini titik TEPAT untuk
    // memunculkan toast, bukan setiap kali masuk langkah terkunci.
    this.onPress = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest?.("button.next") as HTMLButtonElement | null;
      if (!button || !button.disabled) return;
      this.reportBlocked(form);
    };
    form.addEventListener("pointerdown", this.onPress as EventListener);

    this.sync();
  }

  /** Laporkan gerbang terkunci SEKARANG (dipicu penekanan tombol disabled). */
  reportBlocked(form?: HTMLFormElement): void {
    const target = form ?? this.form;
    if (!target || !this.lastBlockedInfo) return;
    this.lastBlockedInfo = { ...this.lastBlockedInfo, form: target };
    try {
      this.host.reportCascadeBlocked?.(this.lastBlockedInfo);
    } catch (error) {
      console.warn("[Form Cascade] reportCascadeBlocked failed:", error);
    }
  }

  /** Set nilai programatik lalu picu evaluasi via event change */
  setValue(field: string, value: any): void {
    const form = this.form;
    if (!form) return;
    const control = form.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      `[name="${CSS.escape(field)}"], #${CSS.escape(field)}`
    );
    if (!control) return;
    control.value = String(value);
    control.dispatchEvent(new Event("change", { bubbles: true }));
  }

  /**
   * Evaluates every condition, transitions the items it owns, then refreshes the gate.
   *
   * Two modes, one rule: `hidden` toggles visibility of elements that already exist,
   * `template` swaps a placeholder for a freshly built element (and back).
   */
  sync(): void {
    const form = this.form;
    if (!form) return;
    const values = FormCascadeHandler.collectValues(form);
    // A repeated group is its own instance: its condition reads its own controls.
    const resolveIn = (scope: Element | null | undefined, field: string) =>
      FormCascadeHandler.resolveFieldValue({ form, inputs: this.host.inputs }, field, scope);

    // Hidden mode: elements are live from the start, so this only flips `hidden`. Nothing
    // is rebuilt — which is what lets an address picker keep the options it injected into
    // the next select while that select is still out of view.
    if (this.#mode === "hidden") {
      let pass = 0;
      let toggled = 0;

      do {
        toggled = 0;
        FormCascadeHandler.walkInputs(this.host.inputs, "", (item, path) => {
          if (!FormCascadeHandler.isCascadeItem(item)) return;

          // Every live instance of this item, not just the one the map remembers: a
          // repeated group carries a clone with the same path, and it follows the same
          // condition as the original.
          const elements = this.#instances(form, path);
          if (!elements.length) return false;

          const condition = FormCascadeHandler.normalizeCondition(item.condition);

          for (const element of elements) {
            const scope = element.closest("[data-instance]") ?? element.parentElement;
            const met = FormCascadeHandler.conditionMet(condition, (field) => resolveIn(scope, field), values);
            if (met === !element.hidden) continue;
            element.hidden = !met;
            element.toggleAttribute("data-cascade-hidden", !met);
            toggled++;
            this.emit(form, met ? "mount" : "unmount", element, item, path);
          }

          return true;
        });
        pass++;
      } while (toggled && pass < 10);

      if (this.host.multistep) this.host.refreshSteps?.(form);
      this.gate(form);
      return;
    }

    // Template mode: a placeholder is planted where the element would be; the real element
    // is built only while the condition holds. Also per instance: with a repeated group
    // each copy has its own placeholder, and `querySelector` would only ever see the first.
    let changed = false;
    let pass = 0;
    do {
      changed = false;
      FormCascadeHandler.walkInputs(this.host.inputs, "", (item, path) => {
        if (!FormCascadeHandler.isCascadeItem(item)) return; // bukan kandidat → turuni anaknya

        const nodes = this.#cascadeNodes(form, path);
        if (!nodes.length) return false; // group di atasnya masih ditahan

        const placeholders = nodes.filter((node) => node instanceof HTMLTemplateElement) as HTMLTemplateElement[];
        const mounted = nodes.filter((node) => !(node instanceof HTMLTemplateElement)) as HTMLElement[];
        const condition = FormCascadeHandler.normalizeCondition(item.condition);

        for (const placeholder of placeholders) {
          const instance = placeholder.closest("[data-instance]") as HTMLElement | null;
          const met = FormCascadeHandler.conditionMet(condition, (field) => resolveIn(instance ?? placeholder.parentElement, field), values);
          if (!met) continue;

          // A build failure throws — it is not swallowed. The copy keeps its own ids.
          const el = this.#buildForInstance(item, form.id, path, instance);
          placeholder.replaceWith(el);
          changed = true;
          this.emit(form, "mount", el, item, path);
        }

        for (const element of mounted) {
          const scope = element.parentElement as HTMLElement | null;
          const met = FormCascadeHandler.conditionMet(condition, (field) => resolveIn(scope, field), values);
          if (met) continue;

          element.replaceWith(this.#placeholderFor(path));
          changed = true;
          this.emit(form, "unmount", element, item, path);
        }

        // A group cascade is only descended into while it is mounted.
        return mounted.length > 0;
      });
      pass++;
    } while (changed && pass < 10); // ulang sebentar untuk kaskade berantai

    // Multistep: bila langkah aktif hilang karena unmount, kembali ke langkah terdekat
    if (this.host.multistep && changed) this.host.refreshSteps?.(form);

    // Gerbang next: tombol disabled bila langkah berikutnya masih terkunci kondisi
    this.gate(form);
  }


  /**
   * Gerbang kaskade (multistep) — dikendalikan `autoDisableNextStep`:
   * tombol "next" sebuah langkah dinonaktifkan selama masih ada kondisi kaskade
   * yang belum terpenuhi — baik kondisi manual pada group langkah itu sendiri,
   * maupun kondisi anak input di dalamnya (rantai fill-in).
   *
   * Aturan gerbang masuk: sebuah kondisi HANYA mengunci tombol next bila
   * field sumbernya berada di langkah ini ATAU sebelumnya (≤ langkah tempat
   * tombol itu berada). Kondisi yang seluruh field sumbernya masih di langkah
   * berikutnya BUKAN gerbang masuk — isian itu justru dikerjakan SETELAH
   * masuk ke langkah tersebut; ia akan mengunci tombol next langkah itu
   * sendiri nanti (sesuai aturan yang sama).
   */
  gate(form?: HTMLFormElement): void {
    const target = form ?? this.form;
    if (!target || !this.host.multistep) return;

    // Tombol next kini HIDUP DI LEVEL FORM — satu set bersama milik engine
    // multistep yang ditukar pada setiap perpindahan langkah. Gerbang cukup
    // mengunci/membuka set milik langkah AKTIF (fieldset.active).
    const nextButton = target.querySelector<HTMLButtonElement>(":scope > .buttons.set > button.next");
    if (!nextButton) return;

    const apply = (disabled: boolean, guidance: string): void => {
      nextButton.disabled = disabled;
      if (disabled) nextButton.title = guidance;
      else nextButton.removeAttribute("title");
    };

    if (!this.host.autoDisableNextStep) {
      // Mode nonaktif: pastikan tombol next aktif kembali (mis. saat runtime toggle)
      apply(false, "");
      return;
    }

    // Langkah aktif menentukan kondisi mana yang berhak mengunci next
    const activeFieldset = target.querySelector<HTMLFieldSetElement>("fieldset[data-index].active");
    if (!activeFieldset) return;
    const currentIndex = Number(activeFieldset.dataset.index);

    const values = FormCascadeHandler.collectValues(target);
    const resolve = (field: string) => FormCascadeHandler.resolveFieldValue({ form: target, inputs: this.host.inputs }, field);
    const fieldSteps = FormCascadeHandler.collectFieldSteps(this.host.inputs);
    // Cabang kaskade yang sedang terpasang → syarat telah dipenuhi satu di antaranya
    const branchChosen = !!target.querySelector("[data-cascade]:not(template)");

    let blocked = false;
    let guidance = "";
    let blockedCondition: iFormCondition | null = null;
    let blockedPath = "";

    // Telusuri skema dari langkah 0 s/d langkah berikutnya (N+1):
    // langkah yang sudah lewat ikut diperiksa — misalnya pengguna mengosongkan
    // isian lama, kondisi turunannya ikut mengunci lagi.
    FormCascadeHandler.walkInputs(
      this.host.inputs.slice(0, currentIndex + 2),
      "",
      (item, path) => {
        if (!FormCascadeHandler.isCascadeItem(item)) return; // bukan kandidat → turuni anaknya
        if (blocked) return false; // sudah terkunci → hentikan telusuran

        // "Gerbang masuk": lewati kondisi yang SELURUH field sumbernya masih
        // di langkah berikutnya (N+1) — isian itu dikerjakan di sana.
        const sourceFields = ([] as any[]).concat(item.condition?.field ?? []);
        const sourceSteps = sourceFields.map((f: any) => fieldSteps.get(String(f)) ?? -1);
        if (sourceSteps.length > 0 && sourceSteps.every((s) => s > currentIndex)) return; // bukan gerbang masuk; lanjut ke anaknya

        const met = FormCascadeHandler.conditionMet(FormCascadeHandler.normalizeCondition(item.condition), resolve, values);
        if (met) return; // terpenuhi → lanjut

        // Kondisi manual pada level group langkah: dilonggarkan bila cabang
        // saudara sudah terpilih (branchChosen) — perilaku multi-cabang asli
        // engine kaskade dipertahankan.
        if (Array.isArray(item.group) && branchChosen) return; // relaksasi cabang saudara

        blocked = true;
        blockedCondition = FormCascadeHandler.normalizeCondition(item.condition);
        blockedPath = path;
        guidance = typeof item.condition?.message === "string"
          ? item.condition.message
          : "Lengkapi isian sebelumnya untuk membuka langkah berikutnya.";
        return false;
      }
    );

    apply(blocked, guidance);

    // 🧾 Simpan info gerbang TERKUNCI agar bisa dilaporkan tepat saat tombol
    // next (disabled) DITEKAN — lihat attach()/reportBlocked(). TIDAK lagi
    // memancarkan toast otomatis setiap kali masuk langkah terkunci.
    if (blocked) {
      this.lastBlockedInfo = {
        form: target,
        guidance,
        condition: blockedCondition,
        step: currentIndex,
        path: blockedPath,
      };
    } else {
      this.lastBlockedInfo = null;
    }
  }

  private emit(form: HTMLFormElement, action: iCascadeEventDetail["action"], element: HTMLElement | null, item: any, path: string): void {
    const detail: iCascadeEventDetail = {
      action,
      key: path,
      element,
      descriptor: item ?? null,
      condition: FormCascadeHandler.normalizeCondition(item?.condition ?? {}),
      state: FormCascadeHandler.collectValues(form),
    };
    if (typeof this.host.onCascade === "function") {
      try { this.host.onCascade(detail); } catch (error) { console.warn("[Form Cascade] onCascade listener error:", error); }
    }
    if (typeof this.host.emit === "function") {
      try { this.host.emit("elementChanged", { builder: this.host.builder, type: "@form", element, data: detail }); } catch { /* emit opsional */ }
    }
    form.dispatchEvent(new CustomEvent("formCascade", { bubbles: true, detail }));
  }

  /** Lepas semua jejak: listener delegasi + placeholder */
  dispose(): void {
    if (this.form) {
      if (this.onChange) {
        this.form.removeEventListener("input", this.onChange);
        this.form.removeEventListener("change", this.onChange);
      }
      if (this.onPress) {
        this.form.removeEventListener("pointerdown", this.onPress as EventListener);
      }
    }
    this.form = null;
    this.onChange = null;
    this.onPress = null;
    this.lastBlockedInfo = null;
    this.placeholders.clear();
  }
}

/**
 * Form module definition for the cascade engine.
 *
 * @summary Active when the form declares `cascading` or pins the next button with
 * `autoDisableNextStep`. Requires `validation`, because the cascade host reports a
 * blocked next step through the validation feature.
 *
 * @example
 * // registered by FORM_ADAPTER_DEFINITIONS; no manual wiring needed
 */
export const cascadeFormAdapter: iModuleDefinition<iFormModuleContext, FormCascade> = {
  id: FORM_MODULE_IDS.cascade,

  requires: [FORM_MODULE_IDS.validation],

  /**
   * Cascade only runs when the schema uses conditions or the next button is gated.
   *
   * @param context - Host context.
   * @returns `true` when the cascade engine should load.
   */
  matches: (context) => context.config.cascading === true || context.config.autoDisableNextStep === true,

  /**
   * Builds the cascade engine around the host contract.
   *
   * @param context - Host context.
   * @returns The live cascade engine.
   */
  load: (context) => new FormCascade(context.cascadeHost()),

  /**
   * Detaches cascade listeners and drops held placeholders.
   *
   * @param cascade - The engine returned by `load()`.
   * @returns Nothing.
   */
  destroy: (cascade) => cascade.dispose(),
};
