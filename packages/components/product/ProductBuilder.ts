/**
 * Product — the composition root of the `product` package.
 *
 * `product-card`, `product-card-grid` and `product-detail` are three builders that only
 * make sense together: a list without a detail view is a dead end, and a detail view
 * nobody opened is unused code. Rather than asking the host to register two words and wire
 * them to each other, this builder owns both as **sub-modules** and owns the swap:
 *
 * ```ts
 * registry.register("product", () => ({
 *   path: "@aio-ui/product",
 *   export: "ProductBuilder",
 *   modules: productModules(),
 * }));
 * ```
 *
 * Content decides what is shown first:
 *
 *   - `{ items: [...] }`, `[...]`      → the grid
 *   - `{ record: {...} }`             → straight to the detail view
 *
 * Opening a card replaces the grid with the detail view inside the same host, and
 * `onBack` returns. The host keeps what only it can know: where the data came from and
 * what "add to cart" means.
 */
import type { iBuilderConfig } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base";
import type { iBuilderRegistry } from "@aio-ui/core/interface";

import { DEFAULT_SELECTORS } from "./Product.kit";
import type { ProductElementType } from "./Product.kit";
import { ProductDetailBuilder } from "./ProductDetail";
import type { iProductDetailConfig, iProductRecord } from "./ProductDetail";
import { ProductGridBuilder } from "./ProductGrid";
import type { iProductGridConfig } from "./ProductGrid";

/** Which view of the catalog the composition starts on. */
export type ProductView = "grid" | "detail";

export interface iProductConfig extends iBuilderConfig<ProductElementType> {
  /** Starting view. Defaults to `grid`, unless the content carries a single record. */
  view?: ProductView;
  /** Forwarded to the grid: card shape, button text, per-card config. */
  grid?: Partial<iProductGridConfig>;
  /** Forwarded to the detail view: button/back text. */
  detail?: Partial<iProductDetailConfig>;
  /** Optional callback when leaving the component: shopper confirmed a purchase. */
  onAddToCart?: (payload: { product: iProductRecord; color?: { name?: string } }) => void;
  /** Optional notification callback when a card was opened (for routing/analytics). */
  onOpen?: (product: iProductRecord) => void;
  /** Optional notification callback when leaving detail view. */
  onBack?: () => void;
}

/** The sub-modules this component owns. Hosts pass this to `register`. */
export function productModules() {
  return [
    { id: "grid", scope: "grid", path: "@aio-ui/product", export: "ProductGridBuilder", stylesheet: "@aio-ui/product/ProductGrid.css" },
    { id: "detail", scope: "detail", path: "@aio-ui/product", export: "ProductDetailBuilder", stylesheet: "@aio-ui/product/ProductDetail.css" },
  ];
}

export class ProductBuilder extends Builder<ProductElementType, iProductConfig> {
  readonly builderId: keyof iBuilderRegistry = "product";
  readonly name: keyof iBuilderRegistry = "product";
  /** No sheet of its own: the wrapper is one class, and each view brings its stylesheet. */
  readonly stylesheet: string = "";

  /** The host that currently holds a view; `#show*` replaces its children. */
  #host: HTMLElement | null = null;
  /** The last list rendered, so coming back restores it instead of a single record. */
  #list: iProductRecord[] = [];

  constructor(config: Partial<iProductConfig> = {}) {
    super();

    const defaultConfig: Required<iProductConfig> = {
      themeId: "default",
      namespace: null,
      emit: () => { },
      selectors: DEFAULT_SELECTORS,
      view: "grid",
      grid: {},
      detail: {},
      onOpen: () => { },
      onBack: () => { },
      onAddToCart: () => { },
    };

    this.config = this.resolveConfig(defaultConfig, config);
  }

  public prepare(data: any): HTMLElement {
    const content = data?.content ?? data ?? {};
    const items = this.#items(content);
    const record = content?.record ?? content?.product ?? null;

    const host = this.render("@product", content);
    if (!host) throw new Error("[ProductBuilder] @product did not render; check the selector map.");

    this.#host = host;
    this.#list = items;

    if (this.config.view === "detail" || (!items.length && record)) this.#showDetail(host, record ?? items[0]);
    else this.#showGrid(host, items);

    return host;
  }

  /** The composition root renders no text of its own — the views do. */
  protected template(): void { }

  public initialize(): void { }

  /** Re-renders the list — a filter changed, or the shopper came back. */
  public showList(items: iProductRecord[]): void {
    if (!this.#host) return;
    this.#showGrid(this.#host, items);
  }

  /** Accepts an array, a named collection, or the raw `{ data: [...] }` envelope. */
  #items(content: any): iProductRecord[] {
    if (Array.isArray(content)) return content.filter(Boolean);
    for (const key of ["items", "products", "data", "content"]) {
      if (Array.isArray(content?.[key])) return content[key].filter(Boolean);
    }
    return [];
  }

  #showGrid(host: HTMLElement, items: iProductRecord[]): void {
    const Grid = this.module<typeof ProductGridBuilder>("grid") ?? ProductGridBuilder;

    const grid = new Grid({
      ...this.config.grid,
      themeId: this.config.themeId,
      namespace: this.config.namespace,
      emit: this.config.emit,
      onOpen: (product: iProductRecord) => {
        this.config.onOpen(product);
        this.#showDetail(host, product);
      },
    } as Partial<iProductGridConfig>);

    this.#list = items;
    const renderedGrid = grid.create({ content: { data: items } });
    if (this.host("grid")) {
      this.project("grid", renderedGrid);
    } else {
      host.replaceChildren(renderedGrid);
    }

    this.config.emit?.("elementChanged", {
      builder: this.builderId,
      type: "@product>grid",
      element: renderedGrid,
      data: { count: items.length },
    } as any);
  }

  #showDetail(host: HTMLElement, record: iProductRecord | null | undefined): void {
    const Detail = this.module<typeof ProductDetailBuilder>("detail") ?? ProductDetailBuilder;

    const detail = new Detail({
      ...this.config.detail,
      themeId: this.config.themeId,
      namespace: this.config.namespace,
      emit: this.config.emit,
      onBack: () => {
        this.config.onBack?.();
        // Back means "the list I came from", not "a list of one".
        this.showList(this.#list);
      },
      onAddToCart: (payload) => {
        this.config.onAddToCart?.(payload);
        this.config.emit?.("elementChanged", {
          builder: this.builderId,
          type: "@product>cart",
          element: host,
          data: payload,
        } as any);
      },
    } as Partial<iProductDetailConfig>);

    const renderedDetail = detail.create({ content: record });
    if (this.host("detail")) {
      this.project("detail", renderedDetail);
    } else {
      host.replaceChildren(renderedDetail);
    }

    this.config.emit?.("elementChanged", {
      builder: this.builderId,
      type: "@product>detail",
      element: renderedDetail,
      data: { record },
    } as any);
  }
}
