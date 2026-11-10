/**
 * Carousel — kit.
 *
 * Attribute-key tables: the data-attribute spelling, its camelCase counterpart, and the
 * defaults a slide starts with.
 *
 * Not published: `index.ts` is the only entry and does not mention this file.
 */

export const AttrsConfigKeys = [
  "data-carousel",
  "data-show-control",
  "data-show-navigation",
  "data-autoplay",
  "data-vertical",
  "data-slides-per-view",
  "data-animation",
  "data-loop",
  "data-slide-height",
  "data-slide-width",
  "data-pause-on-hover",
] as const;

type CarouselAttrKeys = (typeof AttrsConfigKeys)[number];

export type iCarouselAttrsConfig = {
  [K in CarouselAttrKeys]: any;
};

export const AttrsConfigMap: iCarouselAttrsConfig = {
  "data-carousel": "carousel",
  "data-show-control": "showControl",
  "data-show-navigation": "showNavigation",
  "data-autoplay": "autoPlay",
  "data-vertical": "vertical",
  "data-slides-per-view": "slidesPerView",
  "data-animation": "animation",
  "data-loop": "loop",
  "data-slide-height": "slideHeight",
  "data-slide-width": "slideWidth",
  "data-pause-on-hover": "pauseOnHover",
}

export const dataAttrsConfig: iCarouselAttrsConfig = {
  "data-carousel": "",
  "data-show-control": true,
  "data-show-navigation": true,
  "data-autoplay": true,
  "data-vertical": true,
  "data-slides-per-view": 1,
  "data-animation": "slide-left",
  "data-loop": true,
  "data-slide-height": "",
  "data-slide-width": "",
  "data-pause-on-hover": true,
}
