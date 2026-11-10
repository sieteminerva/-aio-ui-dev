/** Every node this component can render. Order is documentation, not behaviour. */
export const ELEMENT_KEYS = [
    "@container",
    "@badge",
    "@badge>item",
    "@badge>item>label",
    "@badge>item>desc",
];
/**
 * Default shape per key. Themes and callers override this through `config.selectors`,
 * which is why the tests lock it: the contract is checkable without a DOM.
 */
export const DEFAULT_SELECTORS = {
    "@container": { tagName: "div", className: "badge-widget" },
    "@badge": { tagName: "div", className: "badge" },
    "@badge>item": { tagName: "div", className: "badge-item" },
    "@badge>item>label": { tagName: "span", className: "badge-label" },
    "@badge>item>desc": { tagName: "p", className: "badge-desc" },
};
//# sourceMappingURL=Badge.kit.js.map