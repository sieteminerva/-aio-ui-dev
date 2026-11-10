import type { iBasicNode, iBuilderConfig } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base";
export type PricingCardElementType = "@container" | "@card" | "@card>header" | "@card>price" | "@card>divider" | "@card>body" | "@card>body>item" | "@card>actions";
interface iPricingCardConfig extends iBuilderConfig<PricingCardElementType> {
}
export declare class PricingCardBuilder extends Builder<PricingCardElementType, iPricingCardConfig> {
    readonly builderId = "pricing-card";
    readonly name = "pricing-card";
    readonly stylesheet = "./PricingCard.css";
    protected rawDataNode: any;
    constructor(config?: Partial<iPricingCardConfig>);
    prepare(data: iBasicNode, _config?: Partial<iBuilderConfig<PricingCardElementType>> | undefined): HTMLElement;
    /**
     * PHASE 5: Attaches dynamic event interactions securely onto computed DOM paths.
     */
    initialize(): void;
    protected template(typeKey: PricingCardElementType, el: HTMLElement, payload: any): void;
}
export {};
//# sourceMappingURL=PricingCard.d.ts.map