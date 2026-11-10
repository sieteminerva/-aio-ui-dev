import type { iBuilderConfig } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base";
import type { iProductCardConfig } from "./ProductCard";
import type { ProductGridElementType } from "./ProductGrid.kit";
export interface iProductGridConfig extends iBuilderConfig<ProductGridElementType> {
    /** Forwarded to every card (shape, autoplay, button text…). */
    card?: Partial<iProductCardConfig>;
    /** A card was activated: open its detail view. */
    onOpen?: (product: any) => void;
    /** A card's checkout button was pressed. */
    onCheckout?: (payload: any) => void;
}
export declare class ProductGridBuilder extends Builder<ProductGridElementType, iProductGridConfig> {
    readonly builderId: "product-card-grid";
    readonly name: "product-card-grid";
    stylesheet: string;
    config: Required<iProductGridConfig>;
    constructor(config?: Partial<iProductGridConfig>);
    /**
     * 👑 PINTU PREPARE: Melumat array massal kiriman dari ProductController pusat
     */
    prepare(data: any): HTMLElement;
    protected template(_typeKey: string, _el: HTMLElement, _payload?: any): void;
    initialize(): void;
}
//# sourceMappingURL=ProductGrid.d.ts.map