import type { iModuleDefinition } from "@aio-ui/module-loader";
import type { iFormModuleContext } from "../FormModuleTypes";
/** Kontrak minimal yang wajib dipenuhi host (FormBuilder) agar engine bekerja */
export interface FormMultistepHost {
    builder: string;
    /** Daftar skema input penuh — penentu isLast untuk tombol navigasi */
    inputs: any[];
    /** Bangun <fieldset> dari deskriptor group (termasuk menahan anak ber-condition) */
    renderGroup(group: any, formId: string, path?: string): HTMLElement;
    /** Bangun tombol navigasi multistep untuk step yang baru dilahirkan */
    renderButtonsSet?(payload: {
        index: number;
        isLast: boolean;
        formId: string;
    }): HTMLElement | null;
    /** Beri tahu host saat fieldset step baru lahir ke DOM (lazy mount) —
     *  kesempatan menghidupkan uploader/IdAddress pada area yang baru lahir */
    onStepMount?(fieldset: HTMLElement): void;
    /** Beri tahu host setiap kali langkah aktif BERPINDAH (next/back/attach) —
     *  kesempatan engine kaskade menilai ulang gerbang tombol next yang baru */
    onStepChange?(index: number): void;
    /** Laporkan validasi native gagal saat menekan Next pada langkah `step` */
    reportNativeInvalid?(form: HTMLFormElement, step: number): void;
}
export declare class FormMultistepHandler {
    #private;
    private host;
    private form;
    private currentStep;
    /** Step yang masih tertahan sebagai <template data-step> — belum lahir ke DOM */
    private pending;
    private onClick;
    /** Set tombol navigasi bersama yang saat ini menempel di level form */
    private navBar;
    constructor(host: FormMultistepHost);
    /** Tanam placeholder <template data-step> di posisi skema (dipanggil prepare) */
    hold(parent: HTMLElement, index: number, item: any): void;
    /** Aktifkan engine: lahirkan langkah awal + delegasi klik next/back di level form */
    attach(form: HTMLFormElement): void;
    private _handleClick;
    /**
     * Kandidat langkah = fieldset yang sudah terpasang di DOM + langkah yang
     * masih tertahan sebagai placeholder. Langkah kaskade yang sedang ditahan
     * syaratnya (belum terpasang) otomatis bukan kandidat — persis paritas
     * dengan perilaku lama yang hanya melihat fieldset di DOM.
     */
    private _candidateIndexes;
    /**
     * Lahirkan fieldset langkah dari placeholder — SEKALI saja, lalu tetap
     * tinggal di DOM (class .active yang dipindah-pindah). Bila langkah sudah
     * terpasang (atau dipasang kaskade lebih dulu), kembalikan yang ada.
     */
    private _mount;
    /** Aktifkan satu langkah: bangun bila masih placeholder, lalu set status aktif */
    goTo(index: number): void;
    /**
     * Tukar set tombol navigasi bersama yang HIDUP DI LEVEL FORM — dipanggil di
     * setiap perpindahan langkah (goTo/refresh), bukan hanya saat fieldset baru
     * lahir, agar arah navigasi (next/back/submit) selalu cocok dengan langkah.
     * Set membawa attribute paritas dengan fieldset langkah terkait (data-index
     * + animate) supaya bisa dianimasikan sinkron lewat CSS.
     */
    private _syncButtons;
    /**
     * Selaraskan class .active + arah animasi antar langkah yang terpasang.
     * Bila langkah aktif sedang di-unmount kaskade, gandol ke langkah terdekat
     * yang masih ada di DOM (dipanggil via host.refreshSteps dari Cascade).
     */
    refresh(form?: HTMLFormElement): void;
    private _syncActive;
    /** Fieldset langkah utama yang terpasang, terurut berdasarkan nomor langkah */
    private _mountedSteps;
    private _mountedFieldset;
    /** Lepas semua jejak: listener delegasi + daftar langkah tertahan */
    dispose(): void;
}
/**
 * Form module definition for the multistep engine.
 *
 * @summary Active when the form declares `multistep`. Steps are held as
 * `<template data-step>` placeholders and mounted on demand.
 *
 * @example
 * // registered by FORM_ADAPTER_DEFINITIONS; no manual wiring needed
 */
export declare const multistepFormAdapter: iModuleDefinition<iFormModuleContext, FormMultistepHandler>;
//# sourceMappingURL=Multistep.d.ts.map