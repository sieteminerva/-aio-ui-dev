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

/**
 * Events a builder reports while it assembles or mutates its own nodes.
 *
 * Only builder-level events live here. The shell-level ones (`ready`, `themeChanged`,
 * `error`) used to sit in this map too, left over from the old monolithic page builder —
 * they are declared once, with their real payloads, in `events.ts`. Keeping one copy is
 * what makes `iPageEvents extends iComponentEvents` legal instead of a collision.
 */
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
  /** The composed catalog: grid ⇄ detail, owned by `ProductBuilder`. */
  product: iBasicNode | iBuilderContent[];
  "product-card-grid": any;
  "product-detail": any;
  "input-controls": Array<iBasicInputNode>;
  table: any[];
  dropdown: iBasicInputNode;
  "color-theme": iBasicNode;
  "editor": iBasicNode;
  "form-editor": iBasicNode;
  badge: any;
  /** A dark panel for source text — payload `{ code, label?, language? } | { blocks }`. */
  "code-block": any;
  /** A Markdown document rendered to DOM — payload `{ source: string }`. */
  markdown: any;
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
