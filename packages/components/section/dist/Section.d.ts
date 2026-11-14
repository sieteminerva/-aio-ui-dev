import type { iBuilderConfig } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base";
import type { SectionElementType } from "./Section.kit";
/**
 * Section — one row of 2–3 content columns.
 *
 * ```ts
 * { content: [ { className?, content: [ { eyebrow, title, description, imageUrl, actions } ] }, … ] }
 * ```
 *
 * A column is either a wrapper of blocks (`content: [...]`) or a block itself, so both the
 * nested shape above and a flat `content: [{ title, imageUrl }]` render. Each block
 * contributes, in this order: image → eyebrow → header → description → actions.
 */
export interface iSectionAction {
    label?: string;
    href?: string;
    type?: "button" | "submit" | "reset";
    onClick?: (event: MouseEvent) => void;
}
export interface iSectionBlock {
    image?: string;
    imageUrl?: string;
    /** Accessible description for the image; falls back to `title`. */
    alt?: string;
    eyebrow?: string;
    title?: string;
    description?: string;
    actions?: iSectionAction[];
}
export interface iSectionColumn extends iSectionBlock {
    className?: string;
    content?: iSectionBlock[] | HTMLElement;
}
export interface iSectionConfig extends iBuilderConfig<SectionElementType> {
    /** Wrapper class appended to the root, e.g. `"container"`. */
    className?: string;
}
export declare class SectionBuilder extends Builder<SectionElementType, iSectionConfig> {
    readonly builderId = "section";
    readonly name = "section";
    readonly stylesheet: string;
    config: Required<iSectionConfig>;
    /**
     * 🪶 LOADING MOCKUP — eyebrow, header, copy and the action row, drawn with the mandatory
     * `@aio-ui/skeleton` primitive. Column count is a payload detail; one column is the
     * layout the sheet will stack first anyway.
     */
    protected loading(): HTMLElement;
    constructor(config?: Partial<iSectionConfig>);
    prepare(data: any): HTMLElement;
    protected template(typeKey: SectionElementType, el: HTMLElement, payload?: any): void;
    initialize(): void;
}
//# sourceMappingURL=Section.d.ts.map