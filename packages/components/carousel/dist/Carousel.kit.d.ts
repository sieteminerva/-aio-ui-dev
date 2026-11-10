/**
 * Carousel — kit.
 *
 * Attribute-key tables: the data-attribute spelling, its camelCase counterpart, and the
 * defaults a slide starts with.
 *
 * Not published: `index.ts` is the only entry and does not mention this file.
 */
export declare const AttrsConfigKeys: readonly ["data-carousel", "data-show-control", "data-show-navigation", "data-autoplay", "data-vertical", "data-slides-per-view", "data-animation", "data-loop", "data-slide-height", "data-slide-width", "data-pause-on-hover"];
type CarouselAttrKeys = (typeof AttrsConfigKeys)[number];
export type iCarouselAttrsConfig = {
    [K in CarouselAttrKeys]: any;
};
export declare const AttrsConfigMap: iCarouselAttrsConfig;
export declare const dataAttrsConfig: iCarouselAttrsConfig;
export {};
//# sourceMappingURL=Carousel.kit.d.ts.map