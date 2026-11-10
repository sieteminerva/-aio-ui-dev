/**
 * Renderer contracts and the global display-log switch.
 */

export const GLOBAL_DISPLAY_LOG = false//"DATA"

export interface iRendererLite {
  create: () => void;
  append: () => void;
  remove: () => void;
  replace: () => void;
  text: () => void;
  html: () => void;
  attr: () => void;
  class: () => void;
}


