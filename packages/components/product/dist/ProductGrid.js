import { Builder } from "@aio-ui/base";
import { Skeleton } from "@aio-ui/skeleton";
import { ProductCardBuilder } from "./ProductCard.js";
import { normalizeProducts } from "./ProductGrid.engine.js";
export class ProductGridBuilder extends Builder {
    builderId = "product-card-grid";
    name = "product-card-grid";
    stylesheet = "./ProductGrid.css";
    config;
    /**
     * 🪶 LOADING MOCKUP — three cards of the grid's own aspect, drawn with the mandatory
     * `@aio-ui/skeleton` primitive. Counting the real products would be a second render;
     * three boards are enough to reserve the row.
     */
    loading() {
        return Skeleton.create({
            shape: "row",
            gap: "1rem",
            children: [{ shape: "bone", width: "30%", aspect: "3 / 4", count: 3 }],
        });
    }
    constructor(config = {}) {
        super();
        const defaultConfig = {
            themeId: "default",
            namespace: null,
            emit: () => { },
            selectors: {
                "@grid": { tagName: "section", className: "grid" },
                "@grid>container": { tagName: "div", className: "row full-width" },
            },
            card: {},
            onOpen: () => { },
            onCheckout: () => { },
        };
        this.config = this.resolveConfig(defaultConfig, config);
    }
    /**
     * 👑 PINTU PREPARE: Melumat array massal kiriman dari ProductController pusat
     */
    prepare(data) {
        const list = normalizeProducts(data);
        // 1. Lahirkan cangkang luar grid list
        const gridRoot = this.render("@grid", list);
        const container = this.render("@grid>container", list);
        // ====================================================
        // 🧱 COMPONENT INSTANTIATION LOOP (PARADE KELAHIRAN KARTU KAOS)
        // Memutar data array, memicu pembuatan instansi ProductCardBuilder segar,
        // lalu menancapkan fisiknya ke rahim kolom grid secara linear!
        // ====================================================
        list.forEach((productData) => {
            // Nyalakan instansi kartu produk kustom terisolasi bawaan resep kemarin malam
            const cardComponent = new ProductCardBuilder({
                optionShape: "round",
                autoplay: false,
                duration: 3500,
                mode: "auto",
                ...this.config.card,
            });
            const rawFabrics = Array.isArray(productData.colors) ? productData.colors : [];
            const baseImage = productData.imageUrl || productData.src || productData.artwork?.src || "";
            // Variants must carry BOTH keys: `imageUrl` is read on first paint
            // (`${BASE_URL}${imageUrl}`), `src` is read when navigating between colours.
            const mappedVariants = rawFabrics.map((color) => ({
                name: color.name,
                color: color.value,
                imageUrl: color.imageUrl || baseImage,
                src: color.imageUrl || baseImage,
            }));
            // Bungkus kembali ke dalam properti internal state
            const productItem = {
                id: productData.uid || `prod-${Math.random().toString(36).substring(7)}`,
                title: productData.title || productData.name || "T-Shirt",
                description: productData.description || "",
                imageUrl: baseImage,
                price: typeof productData.price === "number"
                    ? `Rp ${productData.price.toLocaleString("id-ID")}`
                    : String(productData.price ?? ""),
                variants: mappedVariants,
            };
            // Tembakkan pembuatan bodi fisik JIT membawa data pakaian
            const cardDOMElement = cardComponent.create(productItem);
            if (cardDOMElement instanceof HTMLElement && container) {
                cardDOMElement.dataset.uid = productItem.id;
                // Opening the detail is a list-level decision: the card stays reusable and
                // knows nothing about where it is mounted.
                cardDOMElement.addEventListener("click", () => this.config.onOpen(productData));
                container.appendChild(cardDOMElement);
            }
        });
        if (container && gridRoot) {
            gridRoot.appendChild(container);
        }
        return this.load("@grid");
    }
    template(_typeKey, _el, _payload) { }
    initialize() { }
}
//# sourceMappingURL=ProductGrid.js.map