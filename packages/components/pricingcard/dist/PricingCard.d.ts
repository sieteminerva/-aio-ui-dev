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
    /**
     * 🪶 LOADING MOCKUP — plan name, price, feature list and the action row, drawn with the
     * mandatory `@aio-ui/skeleton` primitive. One card only: the mockup is a picture of the
     * box, not a loop over the plans the payload happens to carry.
     */
    protected loading(): HTMLElement;
    constructor(config?: Partial<iPricingCardConfig>);
    prepare(data: iBasicNode, _config?: Partial<iBuilderConfig<PricingCardElementType>> | undefined): HTMLElement;
    /**
     * Nothing to hydrate here: a card group repeats `@card>actions` under one selector key, so
     * `load()` would only ever answer for the last card. The click handler is bound inside
     * `template()` on the node that actually renders the button.
     */
    initialize(): void;
    protected template(typeKey: PricingCardElementType, el: HTMLElement, payload: any): void;
}
export {};
//# sourceMappingURL=PricingCard.d.ts.map