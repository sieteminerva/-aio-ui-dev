import type { iBasicNode, iBuilderConfig, iBuilderRegistry } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base";
export type MasonryElementType = "@container" | "@masonry" | "@masonry>filter" | "@masonry>filter>item" | "@masonry>filter>slider" | "@masonry>item" | "@masonry>item>image" | "@masonry>item>title" | "@masonry>item>desc" | "@masonry>item>actions" | "@masonry>modal" | "@masonry>modal>close" | "@masonry>modal>next" | "@masonry>modal>previous" | "@masonry>spinner" | "@masonry>trigger" | "@masonry>sentinel";
export interface iMasonryConfig extends iBuilderConfig<MasonryElementType> {
    container?: string | HTMLElement | null;
    column: number;
    lazyload: boolean;
    maxDisplayed: number;
    useLoadButton?: boolean;
    category: string | null;
    /**
     * Category highlighted on first render.
     *
     * `null` (default) shows everything — the "All" button is active. A name that is not
     * present in the current data falls back to `null` instead of rendering an empty grid.
     */
    defaultCategory?: string | null;
    loadFn?: null | ((page: number, category: string | null) => Promise<any[]>);
    onScrollEnd?: null | (() => void);
    onLoadTriggered?: null | ((page: number) => void);
}
export declare class MasonryBuilder extends Builder<MasonryElementType, iMasonryConfig> {
    #private;
    readonly builderId: keyof iBuilderRegistry;
    readonly name: keyof iBuilderRegistry;
    readonly stylesheet: string;
    private displayedCount;
    private selectedCategory;
    private currentPage;
    private isServerFetching;
    private modal;
    private observer?;
    constructor(config?: Partial<iMasonryConfig>);
    /**
     * SETTER: Tempat validasi pusat untuk mengamankan data sebelum masuk ke aplikasi
     */
    set items(newItems: (iBasicNode | HTMLElement)[]);
    /**
     * GETTER KATEGORI: Menghitung daftar gambar yang AKTIF dan SUDAH TER-RENDER di layar saat ini
     * (Menghilangkan celah bypass modal data secara instan)
     */
    private get currentVisibleImages();
    prepare(data: any, _config?: Partial<iMasonryConfig>): HTMLElement;
    protected template(typeKey: MasonryElementType, el: HTMLElement, payload?: any): void;
    initialize(): void;
    unmount(): void;
    private _initPaginationTrigger;
    private _handleNextBatchTrigger;
    private _loadNextBatch;
    private _syncColumnCount;
    private _killPaginationControls;
    private _renderFilterMenu;
    private _updateSlider;
    /**
     * Pengukur ulang slider dengan transisi dimatikan (untuk koreksi posisi saat init).
     * Dipisah dari _updateSlider agar panggilan berulang warnanya bersih tanpa animasi lompat.
     */
    private _measureSlider;
    private _handleCategoryChange;
    private _applyFilter;
    private _createSpinner;
    private _createItem;
    private _initModal;
}
//# sourceMappingURL=Masonry.d.ts.map