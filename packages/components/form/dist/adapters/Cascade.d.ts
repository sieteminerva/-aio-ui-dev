import type { iModuleDefinition } from "@aio-ui/module-loader";
import type { FormCascadeHost, iCascadeState, iFormCondition, iFormModuleContext } from "../FormModuleTypes";
/**
 * Cascade engine.
 *
 * @summary Owns every rule about when a conditional input or group may exist: hold,
 * evaluate, mount/unmount, the multistep gate, and the delegated listeners. It is a
 * `adapters/cascade-adapter` entry of the form package. It knows nothing about
 * `InputBuilder` or the input registry: the form offers what it needs through
 * {@link FormCascadeHost}.
 */
export declare class FormCascadeHandler {
    /** Objek skema pembawa .condition (bukan elemen DOM / string) */
    static isCascadeItem(item: any): boolean;
    /** Telusuri pohon skema; visit mengembalikan false untuk memangkas turunannya */
    static walkInputs(items: any[], prefix: string, visit: (item: any, path: string) => boolean | void): void;
    /** Peta nama/id field → index langkah multistep di skema (aturan gerbang masuk) */
    static collectFieldSteps(inputs: any[]): Map<string, number>;
    static normalizeCondition(raw: any): iFormCondition;
    static isEmptyValue(value: any): boolean;
    /** Nilai kontrol DOM selalu string — samakan boolean/angka dengan koersi terkendali */
    static looseEqual(a: any, b: any): boolean;
    static matchRule(condition: iFormCondition, value: any): boolean;
    static conditionMet(condition: iFormCondition, resolve: (field: string) => any, values: Record<string, any>): boolean;
    /** Kumpulkan snapshot nilai semua kontrol DOM di dalam form */
    static collectValues(form: HTMLFormElement): Record<string, any>;
    /** Baca nilai terkini sebuah kontrol (checkbox/radio/select-multiple/file disesuaikan) */
    static readControlValue(form: HTMLFormElement | null, el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): any;
    /** Fallback terakhir: nilai preset dari descriptor skema */
    static findSchemaValue(items: any[], field: string): any;
    /**
     * Urutan lookup nilai: kontrol di dalam instance → kontrol form → descriptor skema.
     *
     * @param state - Form, schema inputs.
     * @param field - Field name the condition refers to.
     * @param scope - Element the condition lives in. A repeated group is its own instance,
     *   and its controls are suffixed (`sku` → `sku-1`), so the lookup starts there.
     */
    static resolveFieldValue(state: iCascadeState, field: string, scope?: Element | null): any;
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
    static findControl(root: Element | null | undefined, field: string): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
}
export declare class FormCascade {
    #private;
    private host;
    private form;
    private placeholders;
    private onChange;
    private onPress;
    private lastBlockedInfo;
    constructor(host: FormCascadeHost);
    /**
     * Tells whether a schema item carries a cascade condition.
     *
     * @summary Delegates to {@link FormCascadeHandler.isCascadeItem} so hosts can
     * ask the loaded engine instead of importing the handler class themselves.
     * @param item - Schema item to inspect.
     * @returns `true` when the item carries a `condition`.
     */
    isCascadeItem(item: any): boolean;
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
    hold(parent: HTMLElement, path: string, item?: any): void;
    /** Elements held by the `hidden` mode: path → live element. */
    private hiddenItems;
    /** Aktifkan engine: delegasi input/change + sync + gate awal */
    attach(form: HTMLFormElement): void;
    /** Laporkan gerbang terkunci SEKARANG (dipicu penekanan tombol disabled). */
    reportBlocked(form?: HTMLFormElement): void;
    /** Set nilai programatik lalu picu evaluasi via event change */
    setValue(field: string, value: any): void;
    /**
     * Evaluates every condition, transitions the items it owns, then refreshes the gate.
     *
     * Two modes, one rule: `hidden` toggles visibility of elements that already exist,
     * `template` swaps a placeholder for a freshly built element (and back).
     */
    sync(): void;
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
    gate(form?: HTMLFormElement): void;
    private emit;
    /** Lepas semua jejak: listener delegasi + placeholder */
    dispose(): void;
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
export declare const cascadeFormAdapter: iModuleDefinition<iFormModuleContext, FormCascade>;
//# sourceMappingURL=Cascade.d.ts.map