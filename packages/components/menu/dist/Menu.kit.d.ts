/**
 * Menu — kit.
 *
 * key list, element-type union, default selectors.
 *
 * Not published: `index.ts` is the only entry and does not mention this file.
 */
import type { iElementProperty } from "@aio-ui/core/interface";
export declare const ELEMENT_KEYS: readonly ["@container", "@menu", "@menu>brand", "@menu>hamburger", "@menu>navigations", "@menu>navigations>item", "@menu>actions", "@menu>item>link", "@menu>item>icon"];
export type MenuElementType = (typeof ELEMENT_KEYS)[number];
export declare const DEFAULT_MENU_SELECTORS: Record<MenuElementType, iElementProperty>;
//# sourceMappingURL=Menu.kit.d.ts.map