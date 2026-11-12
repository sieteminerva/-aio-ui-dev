import { Builder } from "@aio-ui/base";
import { DEFAULT_SELECTORS } from "./Product.kit.js";
import { ProductDetailBuilder } from "./ProductDetail.js";
import { ProductGridBuilder } from "./ProductGrid.js";
/** The sub-modules this component owns. Hosts pass this to `register`. */
export function productModules() {
    return [
        { id: "grid", scope: "grid", path: "@aio-ui/product", export: "ProductGridBuilder", stylesheet: "@aio-ui/product/ProductGrid.css" },
        { id: "detail", scope: "detail", path: "@aio-ui/product", export: "ProductDetailBuilder", stylesheet: "@aio-ui/product/ProductDetail.css" },
    ];
}
export class ProductBuilder extends Builder {
    builderId = "product";
    name = "product";
    /** No sheet of its own: the wrapper is one class, and each view brings its stylesheet. */
    stylesheet = "";
    /** The host that currently holds a view; `#show*` replaces its children. */
    #host = null;
    /** The last list rendered, so coming back restores it instead of a single record. */
    #list = [];
    constructor(config = {}) {
        super();
        const defaultConfig = {
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
    prepare(data) {
        const content = data?.content ?? data ?? {};
        const items = this.#items(content);
        const record = content?.record ?? content?.product ?? null;
        const host = this.render("@product", content);
        if (!host)
            throw new Error("[ProductBuilder] @product did not render; check the selector map.");
        this.#host = host;
        this.#list = items;
        if (this.config.view === "detail" || (!items.length && record))
            this.#showDetail(host, record ?? items[0]);
        else
            this.#showGrid(host, items);
        return host;
    }
    /** The composition root renders no text of its own — the views do. */
    template() { }
    initialize() { }
    /** Re-renders the list — a filter changed, or the shopper came back. */
    showList(items) {
        if (!this.#host)
            return;
        this.#showGrid(this.#host, items);
    }
    /** Accepts an array, a named collection, or the raw `{ data: [...] }` envelope. */
    #items(content) {
        if (Array.isArray(content))
            return content.filter(Boolean);
        for (const key of ["items", "products", "data", "content"]) {
            if (Array.isArray(content?.[key]))
                return content[key].filter(Boolean);
        }
        return [];
    }
    #showGrid(host, items) {
        const Grid = this.module("grid") ?? ProductGridBuilder;
        const grid = new Grid({
            ...this.config.grid,
            themeId: this.config.themeId,
            namespace: this.config.namespace,
            emit: this.config.emit,
            onOpen: (product) => {
                this.config.onOpen(product);
                this.#showDetail(host, product);
            },
        });
        this.#list = items;
        const renderedGrid = grid.create({ content: { data: items } });
        if (this.host("grid")) {
            this.project("grid", renderedGrid);
        }
        else {
            host.replaceChildren(renderedGrid);
        }
        this.config.emit?.("elementChanged", {
            builder: this.builderId,
            type: "@product>grid",
            element: renderedGrid,
            data: { count: items.length },
        });
    }
    #showDetail(host, record) {
        const Detail = this.module("detail") ?? ProductDetailBuilder;
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
                });
            },
        });
        const renderedDetail = detail.create({ content: record });
        if (this.host("detail")) {
            this.project("detail", renderedDetail);
        }
        else {
            host.replaceChildren(renderedDetail);
        }
        this.config.emit?.("elementChanged", {
            builder: this.builderId,
            type: "@product>detail",
            element: renderedDetail,
            data: { record },
        });
    }
}
//# sourceMappingURL=ProductBuilder.js.map