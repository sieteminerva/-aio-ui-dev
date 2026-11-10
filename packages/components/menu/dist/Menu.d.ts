import type { iElementProperty, iBasicNode, iBuilderConfig } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base";
import type { MenuElementType } from "./Menu.kit";
export interface iMenuConfig extends iBuilderConfig<MenuElementType> {
    /**
     * TOTAL EXTRACTED SELECTORS (Semua elemen diekstrak utuh ke sini!)
     */
    type: "top" | "sidebar";
    selectors: Record<MenuElementType, iElementProperty>;
    /** Default route */
    defaultRoute?: string;
    /** Default route */
    themeId?: string;
    /** Valid application routes */
    routes?: string[];
    onNavigate?: (href?: string) => boolean;
}
export interface iMenuSplit {
    brand: iElementProperty;
    navigations: iElementProperty[];
    actions: iElementProperty[];
}
export declare class MenuBuilder extends Builder<MenuElementType, iMenuConfig> {
    readonly builderId = "menu";
    readonly name = "menu";
    readonly stylesheet = "./Menu.css";
    protected isMenuOpened: boolean;
    constructor(config?: Partial<iMenuConfig>);
    prepare(content: iBasicNode, _config?: Partial<iMenuConfig>): HTMLElement;
    /**
     * Maps one flat navigation list onto the keys `template()` expects. The splitting rule
     * itself lives in `splitMenuContent()` so it can be tested on its own.
     */
    protected resolvePayload(content: iBasicNode): Record<MenuElementType, any>;
    initialize(root?: HTMLElement): void;
    private hamburger;
    private navigations;
    private handleToggle;
    private setOpen;
    protected template(typeKey: MenuElementType, el: HTMLElement, payload: any, props: iElementProperty): void;
    navigate(href?: string): void;
    protected bindNavigation(element: HTMLAnchorElement, href?: string): void;
}
//# sourceMappingURL=Menu.d.ts.map