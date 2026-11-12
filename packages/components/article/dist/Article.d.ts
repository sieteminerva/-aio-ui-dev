import type { iElementProperty, iBuilderConfig, iBuilderRegistry } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base";
export type ArticleElementType = "@container" | "@article>list" | "@article>pagination" | "@article>figure" | "@article>header" | "@article>header>title" | "@article>header>meta" | "@article>item" | "@article>item>caption" | "@article>aside" | "@article>aside>title" | "@article>aside>block" | "@article>aside>item" | "@article>controls" | "@article>controls>back" | "@article>controls>next" | "@article>controls>pagination" | "@article>controls>pagination>item" | "@article>controls>filter" | "@article>controls>view" | "@article>detail" | "@article>detail>header" | "@article>detail>body";
export interface iArticleViewSpec {
    view: string;
    display?: "list" | "card";
    count?: number;
    props?: Record<string, unknown>;
}
export interface iArticleConfig extends iBuilderConfig<ArticleElementType> {
    /**
     * Navigation **intent** only. The builder never touches the URL: the host (or the
     * shell's router) decides what a slug means, which is what keeps a deep link, a modal
     * preview and an iframe on the same component.
     */
    navigate?: (slug: string) => void;
    /** Which parts this composition renders. Order is the render order. */
    views?: iArticleViewSpec[];
    /** Record to open in the detail view on the first paint — a deep link, not state. */
    initialSlug?: string;
    /** Force the first paint to a view. Defaults to the list, unless `initialSlug` is set. */
    initialView?: "list" | "detail";
    view?: "list" | "card";
    position?: "left" | "right";
    recommendation?: number | boolean;
    items?: number;
}
export declare class ArticleBuilder extends Builder<ArticleElementType, iArticleConfig> {
    readonly builderId: keyof iBuilderRegistry;
    readonly name: keyof iBuilderRegistry;
    stylesheet: string;
    private currentRawServerResponse;
    private viewSpecs;
    /** Simpan list view saat detail aktif, agar bisa dikembalikan via tombol back. */
    private listElement;
    /** Records by id (`slug`/`uid`), so cards only carry a key. */
    private records;
    constructor(config?: Partial<iArticleConfig>);
    /**
     * 👑 COMPOSITION — membangun kontainer modul dan seluruh slot:
     * controls (back + pagination) → list grid (item[]) → aside (rekomendasi).
     * Interaksi terpasang via bindInteractions().
     */
    prepare(content: any, _config?: Required<iArticleConfig>): HTMLElement;
    private handleClick;
    /** Tampilkan view detail untuk satu artikel (menggantikan list atau detail aktif). */
    /**
     * Show the detail view for one record.
     *
     * @param container - The composition root that hosts the views.
     * @param article - Record to show.
     * @param options - `navigate: false` when the host already knows this record (first
     *   paint of a deep link): announcing a navigation there would send the host back to
     *   the URL it just rendered from.
     */
    private showDetail;
    /** Kembalikan ke list view. */
    private showList;
    protected template(typeKey: ArticleElementType, el: HTMLElement, payload?: any, _props?: iElementProperty): void;
    initialize(root?: HTMLElement, _payload?: any, _context?: any): void;
}
//# sourceMappingURL=Article.d.ts.map