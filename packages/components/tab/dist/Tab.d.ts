import type { iBasicNode, iBuilderConfig, iBuilderRegistry } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base";
export type TabElementType = "@container" | "@tab" | "@tab>menu" | "@tab>menu>item" | "@tab>menu>item>label" | "@tab>menu>item>title" | "@tab>body" | "@tab>panel" | "@tab>panel>content" | "@tab>panel>content>eyebrow" | "@tab>panel>content>title" | "@tab>panel>content>desc" | "@tab>footer" | "@tab>spinner";
export interface iTabConfig extends iBuilderConfig<TabElementType> {
    container?: string | HTMLElement | null;
    menuPosition: "top" | "left" | "bottom" | "right";
    lazyload: boolean;
    name: string;
    minHeight: string;
    /** 💣 Saat `true`, isi panel tab sebelumnya dihancurkan (diganti kosong) begitu pengguna
     *  berpindah ke tab lain — memaksa konten dimuat ulang segar saat kembali ke tab itu. */
    destroyPrevious: boolean;
}
export type iTabMenuProperty = {
    label: string;
    title: string;
    link?: string;
    id?: string;
    className?: string;
} | iBasicNode;
export type iTabItemContent = {
    title?: string;
    eyebrow?: string;
    description?: string;
} | iBasicNode;
export type iTabItemProperty = {
    id?: string;
    className?: string;
    content: iTabItemContent;
} | HTMLElement;
export type iTabFooterProperty = {
    id?: string;
    className?: string;
    text: string;
};
export interface iTabContent {
    menu?: HTMLElement[] | iTabMenuProperty[] | null;
    body: iTabItemProperty[] | HTMLElement[];
    footer?: HTMLElement | iTabFooterProperty | null;
}
export declare class TabBuilder extends Builder<TabElementType, iTabConfig> {
    #private;
    builderId: keyof iBuilderRegistry;
    readonly name: keyof iBuilderRegistry;
    readonly stylesheet: string;
    private currentTabIndex;
    private _listenersTabChanged;
    private _listenersContentLoaded;
    private _boundKeyDownHandler?;
    /**
     * 🪶 LOADING MOCKUP — the tab bar over an empty panel, drawn with the mandatory
     * `@aio-ui/skeleton` primitive. Tab count stays at three: the panel is what reserves the
     * vertical space, and it is geometry, not data.
     */
    protected loading(): HTMLElement;
    constructor(config?: Partial<iTabConfig>);
    private set items(value);
    /** Local DOM lookup for the tab root. Named `tabRoot` because `rootElement`
     *  is already the slot-host field declared by `Builder`. */
    private get tabRoot();
    prepare(data: any, _config?: Partial<iTabConfig>): HTMLElement;
    protected template(typeKey: TabElementType, el: HTMLElement, payload?: any): void;
    initialize(): void;
    /**
     * Mengisi dan merender konten item ke dalam tab panel fisik
     */
    private _renderPanelContent;
    navigateTo(target: number | string): void;
    private _handleChange;
    private _handleKeyDown;
    onTabChanged(callback: (detail: {
        index: number;
        label: string;
        title: string;
    }) => void): void;
    onContentLoaded(callback: (detail: {
        index: number;
        element: HTMLElement;
    }) => void): void;
    unmount(): void;
}
//# sourceMappingURL=Tab.d.ts.map