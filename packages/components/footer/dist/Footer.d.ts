import type { iBuilderConfig, iBuilderRegistry } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base";
export type FooterElementType = "@footer" | "@footer>row" | "@footer>row>column" | "@footer>row>column>header" | "@footer>row>column>desc" | "@footer>row>column>list" | "@footer>row>column>list>item" | "@footer>copyright";
/**
 * Two rows, on purpose:
 *
 *   row 1 — `content.columns[]`, any number of columns (title / description / actions)
 *   row 2 — copyright line
 *
 * A column is free-form: it may carry only a title, only actions, or both. Optional
 * parts that are missing are simply not rendered, so `{ columns: [{ title }] }` is a
 * valid footer.
 */
export interface iFooterColumn {
    title?: string;
    description?: string;
    actions?: iFooterAction[];
}
export interface iFooterAction {
    label?: string;
    /** Link target. Emails and phone numbers get their `mailto:`/`tel:` scheme added. */
    href?: string;
    /** Displayed value. Falls back to `href`. */
    value?: string;
    id?: string;
    className?: string;
}
export interface iFooterContent {
    id?: string;
    className?: string;
    /** Used by the copyright line. */
    company?: string;
    /** Full override for the copyright line; `{year}` and `{company}` are substituted. */
    copyright?: string;
    columns?: iFooterColumn[];
    title?: string;
    description?: string;
    actions?: iFooterAction[];
}
export interface iFooterConfig extends iBuilderConfig<FooterElementType> {
    /** Render the top row of columns. */
    useInfo?: boolean;
    /** Render the copyright row. */
    useCopyright?: boolean;
}
export declare class FooterBuilder extends Builder<FooterElementType, iFooterConfig> {
    readonly builderId: keyof iBuilderRegistry;
    readonly name: keyof iBuilderRegistry;
    readonly stylesheet: string;
    config: Required<iFooterConfig>;
    constructor(config?: Partial<iFooterConfig>);
    prepare(data: any): HTMLElement;
    /**
     * 👑 THE SEPARATED HYDRATION VALVE (POS PENYIRAMAN DATA KEBAL XSS)
     * Mengunci pengisian nilai teks dan transformasi tag dinamis (Anchor) di RAM.
     */
    protected template(typeKey: FooterElementType, el: HTMLElement, payload?: any): void;
    initialize(): void;
}
//# sourceMappingURL=Footer.d.ts.map