export const ELEMENT_KEYS = [
    "@container",
    "@menu",
    "@menu>brand",
    "@menu>hamburger",
    "@menu>navigations",
    "@menu>navigations>item",
    "@menu>actions",
    "@menu>item>link",
    "@menu>item>icon",
];
export const DEFAULT_MENU_SELECTORS = {
    "@container": { tagName: "aside", className: "sidebar" },
    "@menu": { tagName: "nav", className: "nav" },
    "@menu>brand": { tagName: "div", className: "brand", attrs: { src: "" } },
    "@menu>hamburger": { tagName: "button", className: "hamburger-btn", attrs: { "aria-label": "Toggle menu" } },
    "@menu>navigations": { tagName: "ul", className: "navigations" },
    "@menu>navigations>item": { tagName: "li", className: "item" },
    "@menu>actions": { tagName: "div", className: "actions" },
    "@menu>item>link": { tagName: "a" },
    "@menu>item>icon": { tagName: "i", className: "icon" },
};
//# sourceMappingURL=Menu.kit.js.map