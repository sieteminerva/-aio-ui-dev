/**
 * Content item shapes.
 *
 * Data contracts for the item arrays that a component accepts. Kept in `core`
 * while `iBuilderRegistry` still declares every component by name; they move to
 * their owning component package once the registry becomes augmentable.
 */

export interface iElementProperty {
  id?: string;
  className?: string;
  tagName?: string;
  attrs?: Record<string, string>;
  isArray?: boolean;
  wrapper?: string;
  icon?: string;
  textContent?: string;
}
// ==========================================
// 1. INDIVIDUAL ATOM PROPERTIES & DESIGN TOKENS
// ==========================================
export interface iHeaderProperty extends iElementProperty {
  title?: string;
  eyebrow?: string;
  description?: string;
}

export interface iActionProperty extends iElementProperty {
  label?: string;
  href?: string;
  src?: string;
  isActive?: boolean;
  isRoot?: boolean;
  icon?: string;
  type?: 'button' | 'submit' | 'reset' | InputType | InputControlsType;
  onClick?: (event: MouseEvent) => void;
}

// Data Item khusus untuk builder bertipe 'section', 'carousel', 'masonry'
export interface iBuilderContent extends iElementProperty {
  title?: string;
  description?: string;
  image?: string;
  actions?: iActionProperty[];
  category?: string;
}

// Data Item khusus untuk builder bertipe 'pricing-table'
export interface iCardProperty extends iElementProperty {
  header: string;
  body: { name: string; className: string }[];
  action?: iActionProperty;
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
  actionMode?: string;
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
