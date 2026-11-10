import type { iBuilderConfig, iBuilderRegistry } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base";
import type { ProductDetailElementType } from "./ProductDetail.kit";
/**
 * Product detail — the "detail" module of the product page.
 *
 * `ProductCard` is the list unit and `ProductGrid` the list module; this is the single
 * record view a card opens into. It renders media + body (eyebrow, title, description,
 * price, colours) + actions (back, add to cart) and stays declarative: it does not know
 * where it is mounted or how navigation happens — the page supplies `onBack`.
 */
export interface iProductColor {
    name?: string;
    value?: string;
    /** Per-colour artwork; falls back to the product image. */
    imageUrl?: string;
    src?: string;
}
export interface iProductRecord {
    uid?: string;
    name?: string;
    category?: string;
    title?: string;
    description?: string;
    price?: number | string;
    currency?: string;
    colors?: iProductColor[];
    artwork?: {
        src?: string;
    };
    imageUrl?: string;
    image?: string;
    src?: string;
}
export interface iProductDetailConfig extends iBuilderConfig<ProductDetailElementType> {
    buttonText?: string;
    backText?: string;
    /** Called when the shopper confirms the purchase. */
    onAddToCart?: (payload: {
        product: iProductRecord;
        color?: iProductColor;
    }) => void;
    /** Called when the shopper leaves the detail view. */
    onBack?: () => void;
}
export declare class ProductDetailBuilder extends Builder<ProductDetailElementType, iProductDetailConfig> {
    readonly builderId: keyof iBuilderRegistry;
    readonly name: keyof iBuilderRegistry;
    readonly stylesheet: string;
    config: Required<iProductDetailConfig>;
    private record;
    private selectedColor;
    constructor(config?: Partial<iProductDetailConfig>);
    prepare(data: any): HTMLElement;
    protected template(typeKey: ProductDetailElementType, el: HTMLElement, payload?: any): void;
    initialize(root?: HTMLElement): void;
    private handleClick;
    /** Swap the selected colour and re-point the media at that colour's artwork. */
    selectColor(index: number): void;
}
//# sourceMappingURL=ProductDetail.d.ts.map