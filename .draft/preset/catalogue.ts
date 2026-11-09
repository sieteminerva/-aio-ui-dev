/**
 * PRESET CATALOGUE — the table `plan()` reads.
 *
 * Every entry maps a *builder word* (the `builder` key the content AST allows,
 * see `packages/core/src/types/registry.ts`) to the package that renders it and
 * the capability it provides. Nothing here is invented: specifiers match the
 * `exports` maps of the packages in `packages/*`.
 *
 * Why a table instead of `if`s: the same data drives
 *   1. derivation (content → assets),
 *   2. validation (unknown builder word → issue),
 *   3. the release manifest (specifier → URL),
 * so adding a component means adding one row.
 */
import type { PresetAsset } from "./types.ts";

export interface CatalogueEntry {
  /** Capability id reported in `PresetPlan.capabilities`. */
  capability: string;
  /** Module specifiers registered on the client. */
  modules: string[];
  /** Stylesheet specifiers owned by that package. */
  styles: string[];
  /**
   * `iComponentModuleRef.id` when this entry is a sub-module a builder must be
   * told about (form adapters, input modules, table/message bridges).
   * Omitted for components, which the registry names by builder word.
   */
  id?: string;
}

/**
 * Always present, whatever the model: the renderer, its stylesheet seam, the
 * utilities every builder imports, and the theme registry.
 */
export const BASE_ASSETS: PresetAsset[] = [
  // One door for core + base + app. The three roots below it are listed too,
  // because the kit's own `export * from "@aio-ui/core"` is a bare specifier the
  // browser must find in the import map (prefixes only cover subpaths).
  { specifier: "@aio-ui/frameworks", styles: [], package: "@aio-ui/frameworks" },
  { specifier: "@aio-ui/core", styles: [], package: "@aio-ui/core" },
  { specifier: "@aio-ui/base", styles: [], package: "@aio-ui/base" },
  { specifier: "@aio-ui/app", styles: [], package: "@aio-ui/app" },
  // The generated app always routes through the hash router, even for one page:
  // AioApp's route pipeline is what renders a page at all.
  { specifier: "@aio-ui/router", styles: [], package: "@aio-ui/router" },
  { specifier: "@aio-ui/theme", styles: [], package: "@aio-ui/theme" },
];

/**
 * Stylesheets every site links, independent of the components it uses.
 *
 * `@aio-ui/utilities` is deliberately absent from the base assets: it is a set of
 * named helpers with no single entry that every site needs, so components pull the
 * subpaths they want through the import-map prefixes.
 */
export const BASE_STYLES = ["@aio-ui/styles/index.css"];

/** Theme package per theme id. A preset names a theme; the plan resolves the package. */
export const THEME_ASSETS: Record<string, PresetAsset> = {
  default: { specifier: "@aio-ui/theme-default", styles: [], package: "@aio-ui/theme-default" },
  cyberpunk: { specifier: "@aio-ui/theme-cyberpunk", styles: [], package: "@aio-ui/theme-cyberpunk" },
  horizontal: { specifier: "@aio-ui/theme-horizontal", styles: [], package: "@aio-ui/theme-horizontal" },
};

/**
 * Builder word → packages.
 *
 * Keys are exactly the `iBuilderRegistry` keys. `form` and `input` are handled
 * with extra rules (`plan.ts`) because their requirements depend on config.
 */
export const BUILDER_CATALOGUE: Record<string, CatalogueEntry> = {
  carousel: { capability: "carousel", modules: ["@aio-ui/carousel"], styles: ["@aio-ui/carousel/Carousel.css"] },
  accordion: { capability: "accordion", modules: ["@aio-ui/accordion"], styles: ["@aio-ui/accordion/Accordion.css"] },
  "pricing-card": { capability: "pricing", modules: ["@aio-ui/pricingcard"], styles: ["@aio-ui/pricingcard/PricingCard.css"] },
  masonry: { capability: "masonry", modules: ["@aio-ui/masonry"], styles: ["@aio-ui/masonry/Masonry.css"] },
  section: { capability: "section", modules: ["@aio-ui/section"], styles: ["@aio-ui/section/Section.css"] },
  menu: { capability: "menu", modules: ["@aio-ui/menu"], styles: ["@aio-ui/menu/Menu.css"] },
  footer: { capability: "footer", modules: ["@aio-ui/footer"], styles: ["@aio-ui/footer/Footer.css"] },
  "fab-menu": { capability: "fabmenu", modules: ["@aio-ui/fabmenu"], styles: ["@aio-ui/fabmenu/FabMenu.css"] },
  modal: { capability: "modal", modules: ["@aio-ui/modal"], styles: ["@aio-ui/modal/Modal.css"] },
  "mode-switcher": { capability: "modeswitcher", modules: ["@aio-ui/modeswitcher"], styles: ["@aio-ui/modeswitcher/ModeSwitcher.css"] },
  message: { capability: "message", modules: ["@aio-ui/message"], styles: ["@aio-ui/message/Message.css"] },
  article: { capability: "article", modules: ["@aio-ui/article"], styles: ["@aio-ui/article/Article.css"] },
  tab: { capability: "tab", modules: ["@aio-ui/tab"], styles: ["@aio-ui/tab/Tab.css"] },
  badge: { capability: "badge", modules: ["@aio-ui/badge"], styles: ["@aio-ui/badge/Badge.css"] },
  rating: { capability: "rating", modules: ["@aio-ui/rating"], styles: ["@aio-ui/rating/Rating.css"] },
  "product-card": { capability: "product", modules: ["@aio-ui/product/ProductCard"], styles: ["@aio-ui/product/ProductCard.css"] },
  "product-card-grid": { capability: "product", modules: ["@aio-ui/product/ProductGrid"], styles: ["@aio-ui/product/ProductGrid.css"] },
  "product-detail": { capability: "product", modules: ["@aio-ui/product/ProductDetail"], styles: ["@aio-ui/product/ProductDetail.css"] },
  table: { capability: "table", modules: ["@aio-ui/table"], styles: ["@aio-ui/table/Table.css"] },
  form: { capability: "form", modules: ["@aio-ui/form"], styles: ["@aio-ui/form/Form.css"] },
  input: { capability: "input", modules: ["@aio-ui/input"], styles: ["@aio-ui/input/input.css"] },
  dropdown: { capability: "dropdown", modules: ["@aio-ui/input/dropdown/module"], styles: ["@aio-ui/input/dropdown.css"] },
  "input-controls": { capability: "controls", modules: ["@aio-ui/input/controls/module"], styles: ["@aio-ui/input/controls.css"] },
};

/**
 * Builder words the AST type allows but no package implements yet.
 *
 * They are reported as `UNKNOWN_BUILDER` instead of producing a broken site:
 * `color-theme`, `editor` and `form-editor` exist only as registry keys.
 */
export const UNIMPLEMENTED_BUILDERS = new Set(["color-theme", "editor", "form-editor"]);

/** Form adapters, keyed by the config flag that turns them on. */
export const FORM_ADAPTER_CATALOGUE: Record<string, CatalogueEntry> = {
  validation: { capability: "validation", modules: ["@aio-ui/form/validation-adapter"], styles: [], id: "validation" },
  cascade: { capability: "cascade", modules: ["@aio-ui/form/cascade-adapter"], styles: [], id: "cascade" },
  multistep: { capability: "multistep", modules: ["@aio-ui/form/multistep-adapter"], styles: [], id: "multistep" },
  calculation: { capability: "calculation", modules: ["@aio-ui/form/calculation-adapter"], styles: [], id: "calculation" },
  input: { capability: "input-adapter", modules: ["@aio-ui/form/Input.FormAdapter"], styles: [], id: "input" },
};

/** Input-side modules, keyed by the field type or config that needs them. */
export const INPUT_MODULE_CATALOGUE: Record<string, CatalogueEntry> = {
  dropdown: { capability: "dropdown", modules: ["@aio-ui/input/dropdown/module"], styles: ["@aio-ui/input/dropdown.css"], id: "dropdown" },
  file: { capability: "file-uploader", modules: ["@aio-ui/input/file-uploader/module"], styles: ["@aio-ui/input/file-uploader.css"], id: "file" },
  controls: { capability: "controls", modules: ["@aio-ui/input/controls/module"], styles: ["@aio-ui/input/controls.css"], id: "controls" },
  popover: { capability: "popover", modules: ["@aio-ui/input/popover/module"], styles: [], id: "popover" },
};

/** Packages that belong to a capability rather than to a builder word. */
export const CAPABILITY_CATALOGUE: Record<string, CatalogueEntry> = {
  router: { capability: "router", modules: ["@aio-ui/router"], styles: [] },
  http: { capability: "http-service", modules: ["@aio-ui/http-service"], styles: [] },
  events: { capability: "event-emitter", modules: ["@aio-ui/event-emitter"], styles: [] },
  animations: { capability: "animations", modules: ["@aio-ui/animations"], styles: ["@aio-ui/animations/Animations.css"] },
  "id-address": { capability: "id-address", modules: ["@aio-ui/id-address/form"], styles: ["@aio-ui/id-address/id-address.css"], id: "idAddress" },
  "form-message": { capability: "message-adapter", modules: ["@aio-ui/message/adapters/FormAdapter"], styles: [], id: "message" },
  "form-table": { capability: "table-adapter", modules: ["@aio-ui/table/adapters/FormAdapter"], styles: [], id: "table" },
};

/**
 * Field types the input layer renders without an extra module.
 *
 * The closed set mirrors `InputType` in `packages/components/input/Input.ts`;
 * anything outside it is a schema mistake the validator reports.
 */
export const NATIVE_FIELD_TYPES = new Set([
  "text",
  "textarea",
  "number",
  "checkbox",
  "radio",
  "range",
  "date",
  "time",
  "datetime-local",
  "color",
  "email",
  "password",
  "url",
  "tel",
  "hidden",
]);

/** Field types that pull in a module, keyed by the `type` value in a schema. */
export const FIELD_TYPE_MODULES: Record<string, keyof typeof INPUT_MODULE_CATALOGUE> = {
  select: "dropdown",
  dropdown: "dropdown",
  file: "file",
  actions: "controls",
};

/** Every field type the input layer accepts (native or via a module). */
export const SUPPORTED_FIELD_TYPES = new Set([
  ...NATIVE_FIELD_TYPES,
  ...Object.keys(FIELD_TYPE_MODULES),
]);
