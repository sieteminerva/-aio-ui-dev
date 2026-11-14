import type { iBasicNode, iBuilderConfig } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base";
export type AccordionElementType = "@accordion" | "@accordion>section" | "@accordion>section>title" | "@accordion>section>content";
export interface iAccordionConfig extends iBuilderConfig<AccordionElementType> {
}
export declare class AccordionBuilder extends Builder<AccordionElementType, iAccordionConfig> {
    readonly builderId = "accordion";
    readonly name = "accordion";
    readonly stylesheet = "./Accordion.css";
    /**
     * 🪶 LOADING MOCKUP — one open panel between two closed headers, drawn with the mandatory
     * `@aio-ui/skeleton` primitive. `Accordion.css` is the sheet that is still on its way, so
     * the skin cannot come from it; the rhythm comes from the spec instead.
     */
    protected loading(): HTMLElement;
    constructor(config?: Partial<iAccordionConfig>);
    prepare(data: iBasicNode, _config?: Partial<iAccordionConfig>): HTMLElement;
    initialize(): void;
    protected template(typeKey: AccordionElementType, el: HTMLElement, payload?: any): void;
}
//# sourceMappingURL=Accordion.d.ts.map