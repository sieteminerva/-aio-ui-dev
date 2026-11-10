/**
 * DOM and node contracts: what a page tree looks like and how nodes are recorded.
 */

import type { iElementProperty } from "./content";
import type { iBuilderRegistry } from "./registry";

export interface iMetadataContext {
  scopeId: string;         // Identitas wilayah domain pengenal (e.g. "home" atau "form-panel")
  parentKey: string | null; // Alamat penunjuk bapak sejati tempat elemen anak ini hinggap fisik
}

declare global {
  interface HTMLSelectElement {
    __nativeChangeHandler: (e: Event) => any;
  }
  interface HTMLElement {
    __outer: HTMLElement;
    __inner: HTMLElement;
    __payload: any;
    __index: number;
    __templateId: string;
    getMetadata: ((context: iMetadataContext) => any) | undefined | null;
    mount: (compositeOutput: iCompositeBuilderOutput | HTMLElement | null | any) => void;
  }
}

export interface iNodeRecords {
  records: iNodeRecordItem[]
}

export interface iNodeRecordItem<T = any> {
  key: string;
  element: HTMLElement,
  payload: T;
  relations?: iNodeRecordRelations;
  // proxy: any;
}

export interface iNodeRecordRelations {
  scope?: string;
  key?: string;
  template?: string;
  parent?: string | null; // "builderId:typeKey" milik bapak angkatnya
  children?: string[]     // Array [...builderId:typeKey] milik anak cucunya (RECORD keys — statis, dari selectorToTree)
  elements?: string[]     // 🧭 Inventory langsung: selector string ("tag#id.classes") elemen yang hidup DI DALAM key ini —
  //    berhenti di batas key lain (nested record tidak dituruni, tidak duplikat)
}

export interface iCompositeBuilderOutput {
  element: HTMLElement;
  metadata: iNodeRecords;
}

export interface iNodeLifecycleHooks {
  onCreated?: (element: HTMLElement) => void;
  onDestroy?: (element: HTMLElement) => void;
}

// ==========================================
// 4. ADVANCED MODE PATTERNS (String Selectors)
// ==========================================
export type DefaultSelectors = 'grid' | 'row' | 'column' | string;
export type ValidLayoutKey<S extends string> = S | `${S}${string}`;

// Rantai Rekursif Advanced Mode untuk Elemen HTML Standar
export interface iAdvancedStandardNode<S extends string = DefaultSelectors> extends iNodeLifecycleHooks {
  builder?: never;
  attrs?: Record<string, string>;
  content?: string | HTMLElement | iNodeContent<S> | iNodeContent<S>[];
  [childKey: string]: any;
}

// Rantai Rekursif Advanced Mode untuk Builder Komponen Kompleks (Mendukung Penyatuan Content)
export type iAdvancedBuilderNode<S extends string = DefaultSelectors> = {
  [K in keyof iBuilderRegistry]: iNodeLifecycleHooks & {
    builder: K;
    content: iBuilderRegistry[K]; // Mengunci content secara otomatis menjadi array item dari registry komponen tersebut!
    attrs?: Record<string, string>;
    [childKey: string]: iNodeContent<S> | any;
  }
}[keyof iBuilderRegistry];

// Kombinasi Utama untuk Item Node di Advanced Mode
export type iLayoutItemNode<S extends string = DefaultSelectors> =
  | iAdvancedStandardNode<S>
  | iAdvancedBuilderNode<S>;

export type iDOMStructure<S extends string = DefaultSelectors> = {
  [K in ValidLayoutKey<S>]?: iLayoutItemNode<S> | any;
};

export type iNodeContent<S extends string = DefaultSelectors> = iDOMStructure<S>;


// ==========================================
// 5. BASIC MODE PATTERNS (JSON Style / Ramah Pemula)
// ==========================================

// Rantai Rekursif Basic Mode untuk Elemen HTML Standar + Custom Attributes Support
export interface iBasicStandardNode extends iNodeLifecycleHooks {
  tagName?: string;
  id?: string;
  className?: string;
  builder?: never;
  isRoot?: boolean;
  content?: string | HTMLElement | iBasicNode | iBasicNode[] | iElementProperty;
  // 💡 INTERNAL SYSTEM TRACKING: Metadata penanda form admin dashboard Anda
  _field?: string;

  [customHtmlAttr: string]: any;
}

// Rantai Rekursif Basic Mode untuk Builder Komponen Kompleks (Mendukung Penyatuan Content)
export type iBasicBuilderNode = {
  [K in keyof iBuilderRegistry]: iNodeLifecycleHooks & {
    tagName?: string;
    id?: string;
    className?: string;
    builder: K;
    isRoot?: boolean;
    content: iBuilderRegistry[K]; // Mengunci content secara otomatis menjadi array item dari registry komponen tersebut!
    [customHtmlAttr: string]: any;
  }
}[keyof iBuilderRegistry];

export type iBasicNode = iBasicStandardNode | iBasicBuilderNode;
