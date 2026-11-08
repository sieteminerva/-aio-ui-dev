/**
 * Loader map for the demo.
 *
 * Written as explicit entries because Vite needs static specifiers to create chunks —
 * a computed `import(entry.path)` would silently produce nothing. The demo table drives
 * the registry names; this file only says where each one lives.
 */
export const componentAssets = {
  modules: {
    "@aio-ui/accordion/Accordion": () => import("@aio-ui/accordion/Accordion"),
    "@aio-ui/badge/Badge": () => import("@aio-ui/badge/Badge"),
    "@aio-ui/carousel/Carousel": () => import("@aio-ui/carousel/Carousel"),
    "@aio-ui/fabmenu/FabMenu": () => import("@aio-ui/fabmenu/FabMenu"),
    "@aio-ui/footer/Footer": () => import("@aio-ui/footer/Footer"),
    "@aio-ui/menu/Menu": () => import("@aio-ui/menu/Menu"),
    "@aio-ui/modal/Modal": () => import("@aio-ui/modal/Modal"),
    "@aio-ui/modeswitcher/ModeSwitcher": () => import("@aio-ui/modeswitcher/ModeSwitcher"),
    "@aio-ui/pricingcard/PricingCard": () => import("@aio-ui/pricingcard/PricingCard"),
    "@aio-ui/product/ProductCard": () => import("@aio-ui/product/ProductCard"),
    "@aio-ui/product/ProductDetail": () => import("@aio-ui/product/ProductDetail"),
    "@aio-ui/product/ProductGrid": () => import("@aio-ui/product/ProductGrid"),
    "@aio-ui/section/Section": () => import("@aio-ui/section/Section"),
    "@aio-ui/tab/Tab": () => import("@aio-ui/tab/Tab"),
  } as Record<string, () => Promise<unknown>>,
  styles: {
    "@aio-ui/accordion/Accordion.css": () => import("@aio-ui/accordion/Accordion.css?inline"),
    "@aio-ui/badge/Badge.css": () => import("@aio-ui/badge/Badge.css?inline"),
    "@aio-ui/carousel/Carousel.css": () => import("@aio-ui/carousel/Carousel.css?inline"),
    "@aio-ui/fabmenu/FabMenu.css": () => import("@aio-ui/fabmenu/FabMenu.css?inline"),
    "@aio-ui/footer/Footer.css": () => import("@aio-ui/footer/Footer.css?inline"),
    "@aio-ui/menu/Menu.css": () => import("@aio-ui/menu/Menu.css?inline"),
    "@aio-ui/modal/Modal.css": () => import("@aio-ui/modal/Modal.css?inline"),
    "@aio-ui/modeswitcher/ModeSwitcher.css": () => import("@aio-ui/modeswitcher/ModeSwitcher.css?inline"),
    "@aio-ui/pricingcard/PricingCard.css": () => import("@aio-ui/pricingcard/PricingCard.css?inline"),
    "@aio-ui/product/ProductCard.css": () => import("@aio-ui/product/ProductCard.css?inline"),
    "@aio-ui/tab/Tab.css": () => import("@aio-ui/tab/Tab.css?inline"),
  } as Record<string, () => Promise<unknown>>,
};
