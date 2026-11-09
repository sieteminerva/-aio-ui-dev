/**
 * Loader map for the demo.
 *
 * Written as explicit entries because Vite needs static specifiers to create chunks —
 * a computed `import(entry.path)` would silently produce nothing. The demo table drives
 * the registry names; this file only says where each one lives.
 */
export const componentAssets = {
  modules: {
    "@aio-ui/accordion": () => import("@aio-ui/accordion"),
    "@aio-ui/article": () => import("@aio-ui/article"),
    "@aio-ui/badge": () => import("@aio-ui/badge"),
    "@aio-ui/carousel": () => import("@aio-ui/carousel"),
    "@aio-ui/fabmenu": () => import("@aio-ui/fabmenu"),
    "@aio-ui/footer": () => import("@aio-ui/footer"),
    "@aio-ui/form": () => import("@aio-ui/form"),
    "@aio-ui/menu": () => import("@aio-ui/menu"),
    "@aio-ui/modal": () => import("@aio-ui/modal"),
    "@aio-ui/modeswitcher": () => import("@aio-ui/modeswitcher"),
    "@aio-ui/pricingcard": () => import("@aio-ui/pricingcard"),
    "@aio-ui/product": () => import("@aio-ui/product"),
    "@aio-ui/product": () => import("@aio-ui/product"),
    "@aio-ui/section": () => import("@aio-ui/section"),
    "@aio-ui/tab": () => import("@aio-ui/tab"),
    "@aio-ui/table": () => import("@aio-ui/table"),

    // Sub-modules declared by a manifest (`FORM_ADAPTER_MANIFEST`). Each one is its own
    // chunk: the registry fetches an entry only when a manifest asks for that id.
    "@aio-ui/form/validation-adapter": () => import("@aio-ui/form/validation-adapter"),
    "@aio-ui/form/cascade-adapter": () => import("@aio-ui/form/cascade-adapter"),
    "@aio-ui/form/multistep-adapter": () => import("@aio-ui/form/multistep-adapter"),
    "@aio-ui/form/calculation-adapter": () => import("@aio-ui/form/calculation-adapter"),
    "@aio-ui/form/Input.FormAdapter": () => import("@aio-ui/form/Input.FormAdapter"),
    "@aio-ui/input/dropdown/module": () => import("@aio-ui/input/dropdown/module"),
    "@aio-ui/input/file-uploader/module": () => import("@aio-ui/input/file-uploader/module"),
    "@aio-ui/input/controls/module": () => import("@aio-ui/input/controls/module"),
    "@aio-ui/input/popover/module": () => import("@aio-ui/input/popover/module"),
    // Adapters owned by other packages: the form never imports them, the host declares them.
    "@aio-ui/id-address/form": () => import("@aio-ui/id-address/form"),
    "@aio-ui/table/adapters/FormAdapter": () => import("@aio-ui/table/adapters/FormAdapter"),
    "@aio-ui/message/adapters/FormAdapter": () => import("@aio-ui/message/adapters/FormAdapter"),
  } as Record<string, () => Promise<unknown>>,
  styles: {
    "@aio-ui/accordion/Accordion.css": () => import("@aio-ui/accordion/Accordion.css?inline"),
    "@aio-ui/article/Article.css": () => import("@aio-ui/article/Article.css?inline"),
    "@aio-ui/badge/Badge.css": () => import("@aio-ui/badge/Badge.css?inline"),
    "@aio-ui/carousel/Carousel.css": () => import("@aio-ui/carousel/Carousel.css?inline"),
    "@aio-ui/fabmenu/FabMenu.css": () => import("@aio-ui/fabmenu/FabMenu.css?inline"),
    "@aio-ui/footer/Footer.css": () => import("@aio-ui/footer/Footer.css?inline"),
    "@aio-ui/form/Form.css": () => import("@aio-ui/form/Form.css?inline"),
    // Nested builders (dropdown, uploader, controls, toast) declare their own sheet and
    // reach it through this map — no component imports its own CSS.
    "@aio-ui/input/input.css": () => import("@aio-ui/input/input.css?inline"),
    "@aio-ui/input/dropdown.css": () => import("@aio-ui/input/dropdown.css?inline"),
    "@aio-ui/input/file-uploader.css": () => import("@aio-ui/input/file-uploader.css?inline"),
    "@aio-ui/input/controls.css": () => import("@aio-ui/input/controls.css?inline"),
    "@aio-ui/message/Message.css": () => import("@aio-ui/message/Message.css?inline"),
    "@aio-ui/id-address/id-address.css": () => import("@aio-ui/id-address/id-address.css?inline"),
    "@aio-ui/menu/Menu.css": () => import("@aio-ui/menu/Menu.css?inline"),
    "@aio-ui/modal/Modal.css": () => import("@aio-ui/modal/Modal.css?inline"),
    "@aio-ui/modeswitcher/ModeSwitcher.css": () => import("@aio-ui/modeswitcher/ModeSwitcher.css?inline"),
    "@aio-ui/pricingcard/PricingCard.css": () => import("@aio-ui/pricingcard/PricingCard.css?inline"),
    "@aio-ui/product/ProductDetail.css": () => import("@aio-ui/product/ProductDetail.css?inline"),
    "@aio-ui/product/ProductGrid.css": () => import("@aio-ui/product/ProductGrid.css?inline"),
    "@aio-ui/section/Section.css": () => import("@aio-ui/section/Section.css?inline"),
    "@aio-ui/tab/Tab.css": () => import("@aio-ui/tab/Tab.css?inline"),
    "@aio-ui/table/Table.css": () => import("@aio-ui/table/Table.css?inline"),
  } as Record<string, () => Promise<unknown>>,
};
