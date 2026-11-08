import type { iBuilderConfig, iBuilderRegistry, iBuilderSelectorsConfig } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base/Base";

/**
 * Product detail — the "detail" module of the product page.
 *
 * `ProductCard` is the list unit and `ProductGrid` the list module; this is the single
 * record view a card opens into. It renders media + body (eyebrow, title, description,
 * price, colours) + actions (back, add to cart) and stays declarative: it does not know
 * where it is mounted or how navigation happens — the page supplies `onBack`.
 */

export const ELEMENT_KEYS = [
  "@detail",
  "@detail>media",
  "@detail>media>image",
  "@detail>body",
  "@detail>body>eyebrow",
  "@detail>body>title",
  "@detail>body>desc",
  "@detail>body>price",
  "@detail>body>colors",
  "@detail>body>colors>item",
  "@detail>body>actions",
  "@detail>body>actions>back",
  "@detail>body>actions>checkout",
] as const;

export type ProductDetailElementType = (typeof ELEMENT_KEYS)[number];

export const DEFAULT_SELECTORS: iBuilderSelectorsConfig<ProductDetailElementType> = {
  "@detail": { tagName: "article", className: "product-detail" },
  "@detail>media": { tagName: "div", className: "product-detail-media" },
  "@detail>media>image": { tagName: "img", className: "product-detail-image" },
  "@detail>body": { tagName: "div", className: "product-detail-body" },
  "@detail>body>eyebrow": { tagName: "div", className: "product-detail-eyebrow" },
  "@detail>body>title": { tagName: "h2", className: "product-detail-title" },
  "@detail>body>desc": { tagName: "p", className: "product-detail-desc" },
  "@detail>body>price": { tagName: "div", className: "product-detail-price" },
  "@detail>body>colors": { tagName: "div", className: "product-detail-colors" },
  "@detail>body>colors>item": { tagName: "button", className: "product-detail-color" },
  "@detail>body>actions": { tagName: "div", className: "product-detail-actions" },
  "@detail>body>actions>back": { tagName: "button", className: "product-detail-back" },
  "@detail>body>actions>checkout": { tagName: "button", className: "button primary product-detail-checkout" },
};

export interface iProductColor {
  name?: string;
  value?: string;
  /** Per-colour artwork; falls back to the product image. */
  imageUrl?: string;
  src?: string;
}

export interface iProductRecord {
  uid?: string;
  name?: string;
  category?: string;
  title?: string;
  description?: string;
  price?: number | string;
  currency?: string;
  colors?: iProductColor[];
  artwork?: { src?: string };
  imageUrl?: string;
  image?: string;
  src?: string;
}

export interface iProductDetailConfig extends iBuilderConfig<ProductDetailElementType> {
  buttonText?: string;
  backText?: string;
  /** Called when the shopper confirms the purchase. */
  onAddToCart?: (payload: { product: iProductRecord; color?: iProductColor }) => void;
  /** Called when the shopper leaves the detail view. */
  onBack?: () => void;
}

/** One record, accepting the `artwork.src` shape from the Sheets data as well as `imageUrl`. */
export function normalizeProduct(data: any): iProductRecord {
  const record = data?.content ?? data;
  return record && typeof record === "object" ? record : {};
}

/** The image of a record: per-colour artwork wins, then the product artwork. */
export function imageOf(record: iProductRecord, color?: iProductColor): string {
  return (
    color?.imageUrl ??
    color?.src ??
    record.artwork?.src ??
    record.imageUrl ??
    record.image ??
    record.src ??
    ""
  );
}

/** `85000` → `Rp 85.000`; a string is passed through untouched. */
export function formatPrice(value: number | string | undefined, currency = "Rp"): string {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "string") return value;
  return `${currency} ${value.toLocaleString("id-ID")}`;
}

export class ProductDetailBuilder extends Builder<ProductDetailElementType, iProductDetailConfig> {
  readonly builderId: keyof iBuilderRegistry = "product-detail";
  readonly name: keyof iBuilderRegistry = "product-detail";
  readonly stylesheet: string = "./ProductDetail.css";
  public config: Required<iProductDetailConfig>;

  private record: iProductRecord = {};
  private selectedColor: iProductColor | undefined;

  constructor(config: Partial<iProductDetailConfig> = {}) {
    super();

    const defaultConfig: Required<iProductDetailConfig> = {
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

  public prepare(data: any): HTMLElement {
    const record = normalizeProduct(data);
    this.record = record;

    const colors = Array.isArray(record.colors) ? record.colors : [];
    this.selectedColor = colors[0];

    const detail = this.render("@detail", record);

    const media = this.render("@detail>media", record);
    if (media) {
      const image = this.render("@detail>media>image", { ...record, src: imageOf(record, this.selectedColor) });
      if (image) media.appendChild(image);
      detail?.appendChild(media);
    }

    const body = this.render("@detail>body", record);
    if (body) {
      const eyebrowText = record.category || record.name;
      if (eyebrowText) {
        const eyebrow = this.render("@detail>body>eyebrow", record);
        if (eyebrow) body.appendChild(eyebrow);
      }

      const title = this.render("@detail>body>title", record);
      if (title) body.appendChild(title);

      if (record.description) {
        const desc = this.render("@detail>body>desc", record);
        if (desc) body.appendChild(desc);
      }

      const price = this.render("@detail>body>price", record);
      if (price) body.appendChild(price);

      if (colors.length) {
        const group = this.render("@detail>body>colors", record);
        if (group) {
          colors.forEach((color, index) => {
            const item = this.render("@detail>body>colors>item", { ...color, index, active: index === 0 });
            if (item) group.appendChild(item);
          });
          body.appendChild(group);
        }
      }

      const actions = this.render("@detail>body>actions", record);
      if (actions) {
        const back = this.render("@detail>body>actions>back", record);
        if (back) actions.appendChild(back);
        const checkout = this.render("@detail>body>actions>checkout", record);
        if (checkout) actions.appendChild(checkout);
        body.appendChild(actions);
      }

      detail?.appendChild(body);
    }

    return this.load("@detail") as HTMLElement;
  }

  protected template(typeKey: ProductDetailElementType, el: HTMLElement, payload?: any): void {
    switch (typeKey) {
      case "@detail":
        if (payload?.uid) el.dataset.uid = String(payload.uid);
        break;

      case "@detail>media>image": {
        const img = el as HTMLImageElement;
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
        const color = payload as iProductColor & { index: number; active: boolean };
        el.setAttribute("type", "button");
        el.setAttribute("role", "radio");
        el.setAttribute("aria-checked", String(Boolean(color.active)));
        el.setAttribute("aria-label", color.name || color.value || "colour");
        el.title = color.name || color.value || "";
        el.dataset.index = String(color.index);
        el.classList.toggle("active", Boolean(color.active));
        if (color.value) el.style.backgroundColor = color.value;
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

  public initialize(root?: HTMLElement): void {
    const detail = root ?? (this.load("@detail") as HTMLElement);
    if (!detail) return;

    detail.addEventListener("click", this.handleClick);
  }

  private handleClick = (event: Event): void => {
    const target = event.target as HTMLElement;

    const colorButton = target.closest(".product-detail-color") as HTMLElement | null;
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
  public selectColor(index: number): void {
    const colors = Array.isArray(this.record.colors) ? this.record.colors : [];
    const color = colors[index];
    if (!color) return;

    this.selectedColor = color;

    const detail = this.load("@detail") as HTMLElement;
    detail?.querySelectorAll(".product-detail-color").forEach((node, nodeIndex) => {
      const active = nodeIndex === index;
      node.classList.toggle("active", active);
      node.setAttribute("aria-checked", String(active));
    });

    const image = detail?.querySelector(".product-detail-image") as HTMLImageElement | null;
    if (image) image.src = encodeURI(imageOf(this.record, color));
  }
}
