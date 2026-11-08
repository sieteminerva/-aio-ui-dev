/**
 * Registry contracts: the component map and the builder function shape.
 */

import type { iBasicNode } from "./node";
import type {
  iBasicInputNode,
  iBuilderContent,
  iCardProperty,
  iFormGroupNode,
  iHeaderProperty,
} from "./content";

export interface iComponentEvents<T extends string = string> {
  elementChanged: {
    builder?: keyof iBuilderRegistry;
    type?: T | string; // 💡 Tipe sub-organ menangkap token dinamis dari T secara kaku!
    element: HTMLElement | null;
    data?: any;
  };
  elementAdded: {
    builder?: keyof iBuilderRegistry;
    type?: T; // 💡 Tipe sub-organ menangkap token dinamis dari T secara kaku!
    element: HTMLElement;
    parent?: HTMLElement;
    data?: any;
  };
  elementRemoved: {
    element?: HTMLElement;
    builder?: keyof iBuilderRegistry;
    data?: any
  };
  themeChanged: { themeId: string; shell: HTMLElement };
  ready: { shell: HTMLElement; elements: Map<string, HTMLElement>, context?: any };
  error: { message: string; error: Error; context?: string };
}

export interface iBuilderRegistry {
  carousel: iBuilderContent[];
  accordion: iHeaderProperty[];
  "pricing-card": iCardProperty[];
  masonry: iBuilderContent[];
  section: iBuilderContent[];
  form: Array<iBasicInputNode | iFormGroupNode | HTMLElement | string>;
  menu: iBasicNode;
  footer: iBasicNode;
  "fab-menu": iBasicNode;
  modal: iBasicNode | HTMLElement;
  "mode-switcher": iBasicNode;
  message: iBasicNode;
  rating: any;
  article: any;
  tab: any;
  input: iBasicInputNode;
  "product-card": iBasicNode;
  "product-card-grid": any;
  "input-controls": Array<iBasicInputNode>;
  table: any[];
  dropdown: iBasicInputNode;
  "color-theme": iBasicNode;
  "editor": iBasicNode;
  "form-editor": iBasicNode;
  badge: any;
  // Untuk komponen baru nanti, cukup daftarkan jenis array atomnya di sini:
  // stats: iStatsProperty[];
}

// Function signature constraint for allowed builders
export type ComponentBuilderFn<Args = any> = (content: Args) => HTMLElement | null;

// Registry map type contract tracking all active builder functions
export type BuilderFunctionsMap = {
  [K in keyof iBuilderRegistry]: ComponentBuilderFn<iBuilderRegistry[K]>;
};


/**
 * 
 */

export interface iComponentMeta {
  active: boolean;
  container: string;       // Selector CSS unik tempat dia bersarang (misal: "div#carousel-container")
  count: number;           // Jumlah komponen sejenis di halaman tersebut
  instances: any[];        // Salinan referensi payload data internalnya
}

export interface iPageMetaReport {
  isArray: boolean;
  totalSections: number;
  hasComponent: {
    [K in keyof iBuilderRegistry]?: iComponentMeta;
  };
  // Tambahan info taktis: Daftar seluruh ID seksi dan label nama seksi untuk timeline
  timelinePaths: Array<{ id: string; name: string; type: string }>;
  graphRelationsBlueprint?: any
}
