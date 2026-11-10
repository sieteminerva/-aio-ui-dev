import type { iBuilderConfig, iBuilderRegistry } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base";
export type RatingVisualType = "star" | "round-bar" | "line-bar" | "count-up";
export type RatingElementType = "@container" | "@rating" | "@rating>track" | "@rating>fill" | "@rating>label" | "@rating>stars-group" | "@rating>stars-item";
export interface iRatingConfig extends iBuilderConfig<RatingElementType> {
    type: RatingVisualType;
    max: number;
    animate: boolean;
}
export declare class RatingBuilder extends Builder<RatingElementType, iRatingConfig> {
    readonly builderId: keyof iBuilderRegistry;
    readonly name: keyof iBuilderRegistry;
    readonly stylesheet: string;
    config: Required<iRatingConfig>;
    constructor(config?: Partial<iRatingConfig>);
    /**
     * 👑 THE POLYMORPHIC RATING COMPILER
     * Membaca properti config.type JIT untuk merakit organ tubuh secara otonom!
     */
    prepare(data: any): HTMLElement;
    /**
     * 👑 ULTRA-CLEAN HYDRATION VALVE
     * 0% Teks XML Markup! Murni hanya bertugas mengelola status kelas logika (Class State Driver).
     */
    protected template(typeKey: RatingElementType, el: HTMLElement, payload?: any): void;
    /**
     * 👑 THE ENCAPSULATED INTERACTIVE EVENT BINDINGS
     * Mengatur detonasi jiwa interaksi, seperti efek animasi Count-Up angka persentase secara live.
     */
    initialize(): void;
}
//# sourceMappingURL=Rating.d.ts.map