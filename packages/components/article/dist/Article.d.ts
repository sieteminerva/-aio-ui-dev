import type { iElementProperty, iBuilderConfig, iBuilderRegistry } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base";
export type ArticleElementType = "@container" | "@article>list" | "@article>pagination" | "@article>figure" | "@article>header" | "@article>header>title" | "@article>header>meta" | "@article>item" | "@article>item>caption" | "@article>aside" | "@article>aside>title" | "@article>aside>block" | "@article>aside>item" | "@article>controls" | "@article>controls>back" | "@article>controls>next" | "@article>controls>pagination" | "@article>controls>pagination>item" | "@article>controls>filter" | "@article>controls>view" | "@article>detail" | "@article>detail>header" | "@article>detail>body";
export interface iArticleSlotSpec {
    slot: string;
    view?: "list" | "card";
    count?: number;
    props?: Record<string, unknown>;
}
export interface iArticleConfig extends iBuilderConfig<ArticleElementType> {
    navigate: (slug: any, themeId: string) => void;
    slots?: iArticleSlotSpec[];
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
    private slotSpecs;
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
    private showDetail;
    /**
     * Bangun hash slug dengan format kanonik HashRouter:
     * #route/slug?theme=... — agar parseUrlHash() membacanya sebagai
     * fragment (bukan merusak query, seperti saat append mentah).
     */
    private buildSlugHash;
    /** Kembalikan ke list view. */
    private showList;
    protected template(typeKey: ArticleElementType, el: HTMLElement, payload?: any, _props?: iElementProperty): void;
    initialize(root?: HTMLElement, _payload?: any, _context?: any): void;
}
//# sourceMappingURL=Article.d.ts.map