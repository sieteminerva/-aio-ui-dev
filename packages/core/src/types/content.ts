/**
 * Content item shapes.
 *
 * Data contracts for the item arrays that a component accepts. Kept in `core`
 * while `iBuilderRegistry` still declares every component by name; they move to
 * their owning component package once the registry becomes augmentable.
 */

/**
 * One entry of a selector map, and the single vocabulary for "properties of an element".
 *
 * This used to be two types — `iElementProperty` (structure) and `iActionProperty`
 * (structure + label/href/onClick) — that were the same shape in practice, so every
 * consumer wrote a union or `any` and the checker learned nothing. One type, superset of
 * both, is what the renderer actually accepts.
 */
export interface iElementProperty {
  /** Element identity. */
  id?: string;
  className?: string;
  tagName?: string;
  /** Raw HTML attributes. */
  attrs?: Record<string, string>;
  /** Same attributes in list form, for callers that build them dynamically. */
  attributes?: Array<{ name: string; value: string }>;
  isArray?: boolean;
  /** Wrapper chain, e.g. `.switch.control` or `div.col>span`. */
  wrapper?: string;
  icon?: string;
  textContent?: string;
  /** Content commonly carried by an action/CTA node. */
  label?: string;
  href?: string;
  src?: string;
  isActive?: boolean;
  isRoot?: boolean;
  type?: "button" | "submit" | "reset" | InputType | InputControlsType;
  onClick?: (event: MouseEvent) => void;
}
// ==========================================
// 1. INDIVIDUAL ATOM PROPERTIES & DESIGN TOKENS
// ==========================================
export interface iHeaderProperty extends iElementProperty {
  title?: string;
  eyebrow?: string;
  description?: string;
}


// Data Item khusus untuk builder bertipe 'section', 'carousel', 'masonry'
export interface iBuilderContent extends iElementProperty {
  title?: string;
  description?: string;
  image?: string;
  actions?: iElementProperty[];
  category?: string;
}

// Data Item khusus untuk builder bertipe 'pricing-table'
export interface iCardProperty extends iElementProperty {
  header: string;
  body: { name: string; className: string }[];
  action?: iElementProperty;
}

// Skema untuk Form Builder
export interface iFormGroupNode {
  legend?: string;
  title?: string;
  description?: string;
  className?: string;
  submitButton?: boolean;
  group: Array<iBasicInputNode | HTMLElement | string>;
}

// =========================================
// 2. INPUT & FORM
// =========================================
export type InputType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "dropdown"
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

export type InputControlsType =
  | "add"
  | "remove"
  | "edit"
  | "save"

export interface InputBuilderSelectorOption {
  value?: string;
  label?: string;
  icon?: string;
}

export interface InputBuilderConfigOptions {
  attributes?: Array<{ name: string; value: string }>;
  style?: string;
  field?: string;
  className?: string;
  options?: Array<string | InputBuilderSelectorOption>;
  position?: "left" | "right";
  icon?: string;
  content?: string | Record<string, unknown>;
  action?: { mode?: string } | null;
  wide?: number | null;
  useLabel?: boolean;
  view?: string;
  thumbnail?: boolean;
  maxUpload?: number;
  maxFileSize?: number;
  groupUnallowed?: boolean;
  createEventListener?: boolean;
  display?: "block" | "inline";
}

export interface iBasicInputNode {
  type?: InputType;
  id?: string;
  name?: string;
  title?: string;
  placeholder?: string;
  value?: string | number | boolean;
  rows?: number;
  cols?: number;
  multiple?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  checked?: boolean;
  range?: string;
  info?: string;
  accept?: string;
  config?: Partial<InputBuilderConfigOptions>;
  [key: string]: unknown;
}
