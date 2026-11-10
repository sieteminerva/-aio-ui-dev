import type { iBuilderConfig, iBuilderRegistry } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base";
export type ProductCardElementType = "@product" | "@product>display" | "@product>display>image" | "@product>options" | "@product>options>item" | "@product>caption" | "@product>caption>title" | "@product>caption>desc" | "@product>price" | "@product>checkout";
export interface iProductCardConfig extends iBuilderConfig<ProductCardElementType> {
    id: string;
    optionShape: "square" | "round";
    showCaption: boolean;
    animation: "fade" | "slide";
    duration: number;
    autoplay: boolean;
    pauseOnHover: boolean;
    buttonText: string;
    mode: "thumbnail" | "full" | "auto";
    onSelected: (data: any) => any;
    onCheckout: (data: any) => any;
}
export declare class ProductCardBuilder extends Builder<ProductCardElementType, iProductCardConfig> {
    #private;
    builderId: keyof iBuilderRegistry;
    name: keyof iBuilderRegistry;
    stylesheet: string;
    private currentDisplayIndex;
    private autoplayTimer;
    private _boundKeyDownHandler?;
    constructor(config?: Partial<iProductCardConfig>);
    /**
     * 👑 PINTU 1: THE PREPARE ENGINE (SILSILAH COMPOSITION RAJUTAN DOM LINEAR)
     */
    prepare(content: any, _config?: Required<iBuilderConfig<string>> | undefined): HTMLElement;
    /**
     * 👑 PINTU 2: THE TEMPLATE DRIVER (POS RIAS PENYUAPAN TEKS & TRIK CSS WARNA ANDA)
     */
    protected template(typeKey: string, el: HTMLElement, payload?: any): void;
    /**
     * 👑 PINTU 3: THE INITIALIZE DETONATOR (SUCI BERSIH SETIPIS SILET)
     */
    initialize(_el?: HTMLElement, _payload?: any, _context?: any): void;
    unmount(): void;
    navigate(index: number, productRoot: HTMLElement): void;
    private _handleKeyDown;
    private play;
    checkout(): void;
}
//# sourceMappingURL=ProductCard.d.ts.map