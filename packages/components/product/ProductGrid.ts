// Components/ProductGrid.ts — the list module: builds one card per record.
import type { iBuilderConfig } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base";
import { ProductCardBuilder } from "./ProductCard";
import type { iProductCardConfig } from "./ProductCard";
import type { ProductGridElementType } from "./ProductGrid.kit";
import { normalizeProducts } from "./ProductGrid.engine";

export interface iProductGridConfig extends iBuilderConfig<ProductGridElementType> {
  /** Forwarded to every card (shape, autoplay, button text…). */
  card?: Partial<iProductCardConfig>;
  /** A card was activated: open its detail view. */
  onOpen?: (product: any) => void;
  /** A card's checkout button was pressed. */
  onCheckout?: (payload: any) => void;
}

export class ProductGridBuilder extends Builder<ProductGridElementType, iProductGridConfig> {
  readonly builderId = "product-card-grid" as const;
  readonly name = "product-card-grid" as const;
  stylesheet: string = "./ProductGrid.css";
  public config: Required<iProductGridConfig>;

  constructor(config: Partial<iProductGridConfig> = {}) {
    super();

    const defaultConfig: Required<iProductGridConfig> = {
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
  public prepare(data: any): HTMLElement {
    const list = normalizeProducts(data);

    // 1. Lahirkan cangkang luar grid list
    const gridRoot = this.render("@grid", list);
    const container = this.render("@grid>container", list);

    // ====================================================
    // 🧱 COMPONENT INSTANTIATION LOOP (PARADE KELAHIRAN KARTU KAOS)
    // Memutar data array, memicu pembuatan instansi ProductCardBuilder segar,
    // lalu menancapkan fisiknya ke rahim kolom grid secara linear!
    // ====================================================

    list.forEach((productData: any) => {
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
      const mappedVariants = rawFabrics.map((color: any) => ({
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

    return this.load("@grid") as HTMLElement;
  }

  protected template(_typeKey: string, _el: HTMLElement, _payload?: any): void { }
  public initialize(): void { }
}
