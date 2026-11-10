/**
 * Badge — kit.
 *
 * Constants and type complements the builder needs but never exposes: the key list, the
 * union derived from it, and the default shape per key. Nothing here branches, so nothing
 * here needs a test beyond "the keys and selectors still line up".
 *
 * Not published: `index.ts` is the only entry, and it does not mention this file.
 */
import type { iBuilderSelectorsConfig } from "@aio-ui/core/interface";

/** Every node this component can render. Order is documentation, not behaviour. */
export const ELEMENT_KEYS = [
  "@container",
  "@badge",
  "@badge>item",
  "@badge>item>label",
  "@badge>item>desc",
] as const;

export type BadgeElementType = (typeof ELEMENT_KEYS)[number];

/**
 * Default shape per key. Themes and callers override this through `config.selectors`,
 * which is why the tests lock it: the contract is checkable without a DOM.
 */
export const DEFAULT_SELECTORS: iBuilderSelectorsConfig<BadgeElementType> = {
  "@container": { tagName: "div", className: "badge-widget" },
  "@badge": { tagName: "div", className: "badge" },
  "@badge>item": { tagName: "div", className: "badge-item" },
  "@badge>item>label": { tagName: "span", className: "badge-label" },
  "@badge>item>desc": { tagName: "p", className: "badge-desc" },
};
