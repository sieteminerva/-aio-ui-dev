/**
 * Product — the composition root of the `product` package.
 *
 * `product-card`, `product-card-grid` and `product-detail` are three builders that only
 * make sense together: a list without a detail view is a dead end, and a detail view
 * nobody opened is unused code. Rather than asking the host to register two words and wire
 * them to each other, this builder owns both as **sub-modules** and owns the swap:
 *
 * ```ts
 * registry.register("product", () => ({
 *   path: "@aio-ui/product",
 *   export: "ProductBuilder",
 *   modules: productModules(),
 * }));
 * ```
 *
 * Content decides what is shown first:
 *
 *   - `{ items: [...] }`, `[...]`      → the grid
 *   - `{ record: {...} }`             → straight to the detail view
 *
 * Opening a card replaces the grid with the detail view inside the same host, and
 * `onBack` returns. The host keeps what only it can know: where the data came from and
 * what "add to cart" means.
 */
import type { iBuilderConfig } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base";
import type { iBuilderRegistry } from "@aio-ui/core/interface";
import type { ProductElementType } from "./Product.kit";
import type { iProductDetailConfig, iProductRecord } from "./ProductDetail";
import type { iProductGridConfig } from "./ProductGrid";
/** Which view of the catalog the composition starts on. */
export type ProductView = "grid" | "detail";
export interface iProductConfig extends iBuilderConfig<ProductElementType> {
    /** Starting view. Defaults to `grid`, unless the content carries a single record. */
    view?: ProductView;
    /** Forwarded to the grid: card shape, button text, per-card config. */
    grid?: Partial<iProductGridConfig>;
    /** Forwarded to the detail view: button/back text. */
    detail?: Partial<iProductDetailConfig>;
    /** Optional callback when leaving the component: shopper confirmed a purchase. */
    onAddToCart?: (payload: {
        product: iProductRecord;
        color?: {
            name?: string;
        };
    }) => void;
    /** Optional notification callback when a card was opened (for routing/analytics). */
    onOpen?: (product: iProductRecord) => void;
    /** Optional notification callback when leaving detail view. */
    onBack?: () => void;
}
/** The sub-modules this component owns. Hosts pass this to `register`. */
export declare function productModules(): {
    id: string;
    scope: string;
    path: string;
    export: string;
    stylesheet: string;
}[];
export declare class ProductBuilder extends Builder<ProductElementType, iProductConfig> {
    #private;
    readonly builderId: keyof iBuilderRegistry;
    readonly name: keyof iBuilderRegistry;
    /** No sheet of its own: the wrapper is one class, and each view brings its stylesheet. */
    readonly stylesheet: string;
    constructor(config?: Partial<iProductConfig>);
    prepare(data: any): HTMLElement;
    /** The composition root renders no text of its own — the views do. */
    protected template(): void;
    initialize(): void;
    /** Re-renders the list — a filter changed, or the shopper came back. */
    showList(items: iProductRecord[]): void;
}
//# sourceMappingURL=ProductBuilder.d.ts.map