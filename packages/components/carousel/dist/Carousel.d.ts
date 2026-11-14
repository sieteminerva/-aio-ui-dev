import type { iBuilderConfig, iBuilderRegistry } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base";
export type CarouselElementType = "@container" | "@carousel" | "@carousel>control" | "@carousel>control>prev" | "@carousel>control>next" | "@carousel>navigations" | "@carousel>navigations>dot" | "@carousel>track" | "@carousel>track>slide" | "@carousel>track>slide>inner" | "@carousel>track>slide>caption" | "@carousel>track>slide>title" | "@carousel>track>slide>desc" | "@carousel>track>slide>image";
export interface iCarouselConfig extends iBuilderConfig<CarouselElementType> {
    container?: null | string | HTMLElement;
    showControl?: boolean | "auto";
    showNavigation?: boolean | "auto";
    autoPlay?: boolean | number;
    vertical?: boolean;
    slidesPerView?: number;
    animation?: iCarouselAnimation;
    loop?: boolean;
    slideHeight?: string;
    slideWidth?: string;
    pauseOnHover?: boolean;
}
type iCarouselAnimation = 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down';
export declare class CarouselBuilder extends Builder<CarouselElementType, iCarouselConfig> {
    readonly builderId: keyof iBuilderRegistry;
    readonly name: keyof iBuilderRegistry;
    readonly stylesheet: string;
    private currentIndex;
    private autoPlayTimer;
    private rConfig;
    private container;
    private track;
    private slides;
    private dots;
    private buttons;
    /**
     * 🪶 LOADING MOCKUP — one media box and its dot row, drawn with the mandatory
     * `@aio-ui/skeleton` primitive. The slide count is a payload detail: a picture of the
     * widget only needs the frame and the navigation rhythm.
     */
    protected loading(): HTMLElement;
    constructor(config?: Partial<iCarouselConfig>);
    prepare(data: any, _config?: Required<iCarouselConfig> | undefined): HTMLElement | Record<string, any | HTMLElement>;
    /** Accept `"#id"`, `".class"`, an element, or nothing. Nothing means "I am the root". */
    private resolveContainer;
    initialize(carousel: HTMLElement): void;
    private handleEnter;
    private handleLeave;
    protected template(typeKey: CarouselElementType, el: HTMLElement, payload?: any): void;
    /**
     * 👑 THE UNIVERSAL PROGRESSIVE BOOTSTRAPPER (THE FINAL HOLY GRAIL)
     * 100% Menggunakan logika cerdas Anda! Memanfaatkan render() resmi untuk meregistrasikan
     * elemen manual secara legal, aman, dan kebal dari pembatasan Private Fields #nodes!
     */
    run(el?: HTMLElement): void;
    /**
    * TERMINAL MODUL 1: Menghidupkan total penataan jalur mendatar (Horizontal)
    */
    private renderHorizontalMode;
    /**
     * TERMINAL MODUL 2: Menghidupkan total penataan jalur tegak lurus (Vertical)
     */
    private renderVerticalMode;
    /**
     * 🎢 PUSAT KENDALI PENGANIMASIAN MODULAR (ANTI-JUMPING GUARANTEED)
     */
    private animate;
    next: () => void;
    previous: () => void;
    _navigateTo(index: number, immediate?: boolean): void;
    private startAutoPlay;
    private stopAutoPlay;
    private resetAutoPlay;
    private renderDots;
    private attachControls;
    private attachNavigation;
    unmount(): void;
    /**
     * Releases instance state, then the DOM.
     *
     * `Base.destroy()` unhooks the root element only: the autoplay interval and the hover
     * listeners are state this class owns, so they are released here. Before this override a
     * destroyed carousel kept calling `next()` every `autoPlay` ms on a detached tree — one
     * interval per mount, `clearInterval` never called (see `docs/framework/APP-LIFECYCLE.md`).
     */
    destroy(typeKey?: CarouselElementType): void;
    private resolveRuntimeConfig;
}
export {};
//# sourceMappingURL=Carousel.d.ts.map