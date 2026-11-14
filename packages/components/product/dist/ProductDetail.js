import { Builder } from "@aio-ui/base";
import { Skeleton } from "@aio-ui/skeleton";
import { DEFAULT_SELECTORS } from "./ProductDetail.kit.js";
import { formatPrice, imageOf, normalizeProduct } from "./ProductDetail.engine.js";
export class ProductDetailBuilder extends Builder {
    builderId = "product-detail";
    name = "product-detail";
    stylesheet = "./ProductDetail.css";
    config;
    record = {};
    selectedColor;
    /**
     * 🪶 LOADING MOCKUP — the detail column top to bottom: media, eyebrow, title, copy, price,
     * swatch row and checkout. Drawn with the mandatory `@aio-ui/skeleton` primitive, so it
     * never waits for `ProductDetail.css` (the sheet it is standing in for).
     */
    loading() {
        return Skeleton.create({
            shape: "stack",
            children: [
                { shape: "bone", aspect: "1 / 1" },
                { shape: "line", width: "25%" },
                { shape: "bone", width: "70%", height: "1.75rem" },
                { shape: "line", count: 2 },
                { shape: "bone", width: "30%", height: "1.4rem" },
                { shape: "row", gap: "0.5rem", children: [{ shape: "circle", width: "1.5rem", count: 4 }] },
                { shape: "bone", height: "2.75rem" },
            ],
        });
    }
    constructor(config = {}) {
        super();
        const defaultConfig = {
            themeId: "default",
            selectors: DEFAULT_SELECTORS,
            namespace: null,
            emit: () => { },
            buttonText: "Add to cart",
            backText: "Back to products",
            onAddToCart: () => { },
            onBack: () => { },
        };
        this.config = this.resolveConfig(defaultConfig, config);
    }
    prepare(data) {
        const record = normalizeProduct(data);
        this.record = record;
        const colors = Array.isArray(record.colors) ? record.colors : [];
        this.selectedColor = colors[0];
        const detail = this.render("@detail", record);
        const media = this.render("@detail>media", record);
        if (media) {
            const image = this.render("@detail>media>image", { ...record, src: imageOf(record, this.selectedColor) });
            if (image)
                media.appendChild(image);
            detail?.appendChild(media);
        }
        const body = this.render("@detail>body", record);
        if (body) {
            const eyebrowText = record.category || record.name;
            if (eyebrowText) {
                const eyebrow = this.render("@detail>body>eyebrow", record);
                if (eyebrow)
                    body.appendChild(eyebrow);
            }
            const title = this.render("@detail>body>title", record);
            if (title)
                body.appendChild(title);
            if (record.description) {
                const desc = this.render("@detail>body>desc", record);
                if (desc)
                    body.appendChild(desc);
            }
            const price = this.render("@detail>body>price", record);
            if (price)
                body.appendChild(price);
            if (colors.length) {
                const group = this.render("@detail>body>colors", record);
                if (group) {
                    colors.forEach((color, index) => {
                        const item = this.render("@detail>body>colors>item", { ...color, index, active: index === 0 });
                        if (item)
                            group.appendChild(item);
                    });
                    body.appendChild(group);
                }
            }
            const actions = this.render("@detail>body>actions", record);
            if (actions) {
                const back = this.render("@detail>body>actions>back", record);
                if (back)
                    actions.appendChild(back);
                const checkout = this.render("@detail>body>actions>checkout", record);
                if (checkout)
                    actions.appendChild(checkout);
                body.appendChild(actions);
            }
            detail?.appendChild(body);
        }
        return this.load("@detail");
    }
    template(typeKey, el, payload) {
        switch (typeKey) {
            case "@detail":
                if (payload?.uid)
                    el.dataset.uid = String(payload.uid);
                break;
            case "@detail>media>image": {
                const img = el;
                img.src = encodeURI(payload?.src ?? "");
                img.alt = payload?.title ?? payload?.name ?? "";
                img.loading = "lazy";
                img.decoding = "async";
                break;
            }
            case "@detail>body>eyebrow":
                el.textContent = payload?.category ?? payload?.name ?? "";
                break;
            case "@detail>body>title":
                el.textContent = payload?.title ?? payload?.name ?? "";
                break;
            case "@detail>body>desc":
                el.textContent = payload?.description ?? "";
                break;
            case "@detail>body>price":
                el.textContent = formatPrice(payload?.price, payload?.currency);
                break;
            case "@detail>body>colors>item": {
                const color = payload;
                el.setAttribute("type", "button");
                el.setAttribute("role", "radio");
                el.setAttribute("aria-checked", String(Boolean(color.active)));
                el.setAttribute("aria-label", color.name || color.value || "colour");
                el.title = color.name || color.value || "";
                el.dataset.index = String(color.index);
                el.classList.toggle("active", Boolean(color.active));
                if (color.value)
                    el.style.backgroundColor = color.value;
                break;
            }
            case "@detail>body>actions>back":
                el.setAttribute("type", "button");
                el.textContent = this.config.backText;
                break;
            case "@detail>body>actions>checkout":
                el.setAttribute("type", "button");
                el.textContent = this.config.buttonText;
                break;
            default:
                break;
        }
    }
    initialize(root) {
        const detail = root ?? this.load("@detail");
        if (!detail)
            return;
        detail.addEventListener("click", this.handleClick);
    }
    handleClick = (event) => {
        const target = event.target;
        const colorButton = target.closest(".product-detail-color");
        if (colorButton) {
            this.selectColor(Number(colorButton.dataset.index ?? 0));
            return;
        }
        if (target.closest(".product-detail-back")) {
            this.config.onBack();
            return;
        }
        if (target.closest(".product-detail-checkout")) {
            this.config.onAddToCart({ product: this.record, color: this.selectedColor });
        }
    };
    /** Swap the selected colour and re-point the media at that colour's artwork. */
    selectColor(index) {
        const colors = Array.isArray(this.record.colors) ? this.record.colors : [];
        const color = colors[index];
        if (!color)
            return;
        this.selectedColor = color;
        const detail = this.load("@detail");
        detail?.querySelectorAll(".product-detail-color").forEach((node, nodeIndex) => {
            const active = nodeIndex === index;
            node.classList.toggle("active", active);
            node.setAttribute("aria-checked", String(active));
        });
        const image = detail?.querySelector(".product-detail-image");
        if (image)
            image.src = encodeURI(imageOf(this.record, color));
    }
}
//# sourceMappingURL=ProductDetail.js.map