// Components/ProductCardBuilder.ts (The Purely Integrated Polymorphic Product Card Specification)
import type { iActionProperty, iBuilderConfig, iBuilderRegistry } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base/Base";

// No stylesheet import here on purpose: the registry loads `ProductCard.css` from the
// manifest (or derives it from the script path) and injects it as a real <style> node.
// Importing it again would be a second, untracked copy of the same sheet.

export type ProductCardElementType =
  | "@product"
  | "@product>display"
  | "@product>display>image"
  | "@product>options"
  | "@product>options>item"
  | "@product>caption"
  | "@product>caption>title"
  | "@product>caption>desc"
  | "@product>price"
  | "@product>checkout";

export interface iProductCardConfig extends iBuilderConfig<ProductCardElementType> {
  id: string, // Sediakan opsi ID bawaan di level config
  optionShape: "square" | "round";
  showCaption: boolean;
  animation: "fade" | "slide";
  duration: number;
  autoplay: boolean;
  pauseOnHover: boolean;
  buttonText: string;
  mode: "thumbnail" | "full" | "auto";
  onSelected: (data: any) => any;
  onCheckout: (data: any) => any;
}

export class ProductCardBuilder extends Builder<ProductCardElementType, iProductCardConfig> {
  builderId: keyof iBuilderRegistry = "product-card";
  name: keyof iBuilderRegistry = "product-card";
  stylesheet: string = "./ProductCard.css";

  private currentDisplayIndex: number = 0;
  private autoplayTimer: number | undefined;
  private _boundKeyDownHandler?: (e: KeyboardEvent) => void;

  #item: any = {};

  constructor(config: Partial<iProductCardConfig> = {}) {
    super();

    // 💡 SINKRONISASI ATOMIK PREFIX: Tambahkan sub-token image dan checkout ksatria
    const defaultSelectors: Record<ProductCardElementType, iActionProperty> = {
      "@product": { tagName: "div", className: "product" },
      "@product>display": { tagName: "div", className: "display" },
      "@product>display>image": { tagName: "img", className: "img-fluid product-shadow-blend" },
      "@product>options": { tagName: "div", className: "option" },
      "@product>options>item": { tagName: "div", className: "item" },
      "@product>price": { tagName: "div", className: "price" },
      "@product>caption": { tagName: "div", className: "caption" },
      "@product>caption>title": { tagName: "div", className: "title" },
      "@product>caption>desc": { tagName: "div", className: "desc" },
      "@product>checkout": { tagName: "button", className: "button primary btn-checkout" }
    }

    const defaultConfig: Required<iProductCardConfig> = {
      id: "", // Sediakan opsi ID bawaan di level config
      optionShape: "round",
      showCaption: true,
      animation: "fade",
      autoplay: true,
      duration: 3000,
      pauseOnHover: true,
      mode: "auto",
      buttonText: "Add To Card",
      themeId: "default",
      selectors: defaultSelectors,
      onSelected: () => { },
      onCheckout: () => { },
      namespace: null,
      emit: () => { }
    }

    this.config = this.resolveConfig(defaultConfig, config)
  }

  /**
   * 👑 PINTU 1: THE PREPARE ENGINE (SILSILAH COMPOSITION RAJUTAN DOM LINEAR)
   */
  public prepare(content: any, _config?: Required<iBuilderConfig<string>> | undefined): HTMLElement {
    // ====================================================
    // 🧙‍♂️ THE FABRICS DATA ADAPTER LAYER (PENYELARAS SCHEMA DATA ANDA!)
    // Ubah struktur data 'fabrics' dan 'artwork' dari Sheets menjadi
    // format variants hibrida Carousel + Tab secara JIT di RAM memori!
    // ====================================================
    const rawItem = content?.content || content || {};

    this.currentDisplayIndex = 0;
    this.#item = rawItem;

    // Seluruh pohon DOM kartu produk (display, gambar, opsi varian, caption,
    // harga & tombol checkout) dirakit oleh template() secara rekursif — pola Accordion.
    return this.render("@product", rawItem) as HTMLElement;
  }

  /**
   * 👑 PINTU 2: THE TEMPLATE DRIVER (POS RIAS PENYUAPAN TEKS & TRIK CSS WARNA ANDA)
   */
  protected template(typeKey: string, el: HTMLElement, payload?: any): void {
    // 🧱 SELURUH LOGIKA PEMBANGUNAN DOM TERKONSENTRASI DI SINI (pola Accordion).
    // render() pusat menganugerahi setiap balok bersih, lalu template() merakit
    // keturunannya secara rekursif & menanamkan konten/data aktifnya.
    switch (typeKey) {
      case "@product": {
        el.classList.add(`mode-${this.config.mode}`.trim());
        const item = payload || {};

        // 2. Lahirkan Layar Monitor Display Visual Atas (+ gambar variant awal)
        const displayWrapper = this.render("@product>display", item);
        const displayImage = this.render("@product>display>image", item);
        if (displayImage && displayWrapper) displayWrapper.appendChild(displayImage);
        if (displayWrapper) el.appendChild(displayWrapper);

        // 3. Lahirkan Barisan Menu Tombol Option Varian Warna (Looping Multiple)
        // Wiring klik diteruskan via payload.onSelect dengan menangkap `el` (productRoot)
        const variants: any[] = Array.isArray(item.variants) ? item.variants : [];
        if (variants.length > 0) {
          const optionsContainer = this.render("@product>options", {
            variants,
            onSelect: (idx: number) => { this.navigate(idx, el); }
          });
          if (optionsContainer) el.appendChild(optionsContainer);
        }

        // 4. Lahirkan Blok Penampung Caption Teks Informasional
        if (this.config.showCaption) {
          const captionContainer = this.render("@product>caption", item);
          if (captionContainer) el.appendChild(captionContainer);
        }

        // 5. Lahirkan Label Tag Harga
        const priceTag = this.render("@product>price", item);
        if (priceTag) el.appendChild(priceTag);

        // 6. Lahirkan Tombol Sakral Aksi Eksekusi Checkout Belanja
        const checkoutBtn = this.render("@product>checkout", item);
        if (checkoutBtn) {
          (checkoutBtn as HTMLButtonElement).onclick = (e) => { e.stopPropagation(); this.checkout(); };
          el.appendChild(checkoutBtn);
        }
        break;
      }

      case "@product>display":
        // Atur agar transisi perpindahan antar animasi berjalan sehalus sutra
        el.style.transition = `background-color ${this.config.duration * 0.15}ms ease`;
        break;

      case "@product>display>image": {
        const img = el as HTMLImageElement;
        // Pada milidetik pertama, suapkan asset gambar variant indeks ke-0
        const initialVariant = payload?.variants?.[0];
        const src = `${import.meta.env.BASE_URL}${(initialVariant?.imageUrl || payload?.imageUrl || "")}`
        img.src = src;
        img.alt = payload?.title || "product-thumbnail";
        break;
      }

      case "@product>options": {
        const variants: any[] = Array.isArray(payload?.variants) ? payload.variants : [];
        variants.forEach((variantObj, idx) => {
          const itemBtn = this.render("@product>options>item", {
            ...variantObj,
            index: idx,
            onSelect: payload?.onSelect
          });
          if (itemBtn) el.appendChild(itemBtn);
        });
        break;
      }

      case "@product>options>item":
        el.setAttribute("role", "radio");
        el.setAttribute("aria-checked", payload?.index === 0 ? "true" : "false");
        el.setAttribute("tabindex", payload?.index === 0 ? "0" : "-1");
        // Wiring klik varian (dilewatkan dari @product>options)
        if (typeof payload?.onSelect === "function") {
          el.onclick = (e: MouseEvent) => { e.stopPropagation(); payload.onSelect(payload.index); };
        }
        // 🔮 TRIK MEWAH ANDA: Siram background warna variant kustom langsung ke tubuh tombol bulatnya!
        if (payload?.color) {
          el.style.backgroundColor = payload.color;
          el.setAttribute("title", payload.name || payload.color);
        }
        el.className = `option-bubble shape-${this.config.optionShape} ${el.className || ""}`.trim();
        break;

      case "@product>caption": {
        const title = this.render("@product>caption>title", payload);
        const desc = this.render("@product>caption>desc", payload);
        if (title) el.appendChild(title);
        if (desc) el.appendChild(desc);
        break;
      }

      case "@product>caption>title": el.textContent = payload?.title || ""; break;

      case "@product>caption>desc": el.textContent = payload?.description || payload?.desc || ""; break;

      case "@product>price":
        el.textContent = typeof payload === "object" ? (payload.price || "Rp 0") : String(payload);
        break;

      case "@product>checkout":
        el.textContent = this.config.buttonText || "Add to Cart";
        break;
    }
  }

  /**
   * 👑 PINTU 3: THE INITIALIZE DETONATOR (SUCI BERSIH SETIPIS SILET)
   */
  public initialize(_el?: HTMLElement, _payload?: any, _context?: any): void {
    const productRoot = _el || this.load("@product") as HTMLElement;
    const optionsWrapper = this.load("@product>options") as HTMLElement;

    if (!productRoot) return;

    // 1. Amankan jembatan keyboard navigation arrow keys
    if (optionsWrapper) {
      this._boundKeyDownHandler = (e: KeyboardEvent) => this._handleKeyDown(e, _el!);
      optionsWrapper.addEventListener("keydown", this._boundKeyDownHandler);
    }

    // 2. Jalankan sinkronisasi navigasi awal ke indeks ke-0 secara JIT
    this.navigate(0, _el!);

    // 3. Detonasi mesin autoplay pemutar varian warna otomatis jika diaktifkan kaku
    if (this.config.autoplay) {
      this.play(_el!);

      // Pasang pelindung sensor hover anti-double slide
      if (this.config.pauseOnHover) {
        productRoot.addEventListener("mouseenter", () => {
          if (this.autoplayTimer) { window.clearInterval(this.autoplayTimer); this.autoplayTimer = undefined; }
        });
        productRoot.addEventListener("mouseleave", () => { this.play(); });
      }
    }
    // console.log(`[ProductCard v2] Interaction system and background-blend pipeline activated successfully.`);
  }

  public unmount(): void {
    if (this.autoplayTimer) {
      window.clearInterval(this.autoplayTimer);
      this.autoplayTimer = undefined;
    }
    const optionsWrapper = this.load("@product>options") as HTMLElement;
    if (optionsWrapper && this._boundKeyDownHandler) {
      optionsWrapper.removeEventListener("keydown", this._boundKeyDownHandler);
    }
    this.destroy(); // Likuidasi RAM total dari rahim Map privat!
  }

  // ====================================================
  // 🎢 HIGH-UTILITY INTERACTION METHODS (MUTATOR CAROUSEL + TAB HYBRID ANDA)
  // ====================================================

  public navigate(index: number, productRoot: HTMLElement) {
    const variants = this.#item.variants || [];
    if (!variants.length) return;

    // Kunci nomor indeks aktif langsung di tubuh fisik bapaknya
    const targetIndex = (index + variants.length) % variants.length;
    (productRoot as any)._currentDisplayIndex = targetIndex;
    this.currentDisplayIndex = targetIndex

    // Jalankan mutasi visual primitif murni membidik sub-elemen internal milik dirinya sendiri!
    const displayBox = productRoot.querySelector(".display") as HTMLElement;
    const displayImg = productRoot.querySelector(".img-fluid") as HTMLImageElement;
    const buttons = productRoot.querySelectorAll(".option-bubble");
    const activeVariant = variants[targetIndex];

    if (!activeVariant) return;

    // A. Segarkan kelas aktif tombol bulatan warna internal
    buttons.forEach((btn, idx) => {
      btn.classList.toggle("active", idx === targetIndex);
    });

    // B. Siram warna background bapak display terisolasi sehalus sutra!
    if (displayBox && displayImg) {
      displayImg.style.opacity = "0.3";
      setTimeout(() => {
        if (activeVariant.color) displayBox.style.backgroundColor = activeVariant.color;
        if (activeVariant.src) displayImg.src = encodeURI(activeVariant.src);
        displayImg.style.opacity = "1";
      }, 80);
    }

    // C. Kabari pemanggil varian mana yang aktif. `onSelected` was documented but never
    // called, so a card could not report its colour to the grid or the page.
    if (typeof this.config.onSelected === "function") this.config.onSelected(activeVariant);
  }

  private _handleKeyDown(e: KeyboardEvent, el: HTMLElement): void {
    // const buttons = this.load("@product>options>item", "all") as HTMLElement[];
    const buttons = el.querySelectorAll(".option-bubble");
    if (!buttons || !buttons.length) return;
    let nextIndex = this.currentDisplayIndex;
    if (e.key === "ArrowRight") nextIndex = (this.currentDisplayIndex + 1) % buttons.length;
    else if (e.key === "ArrowLeft") nextIndex = (this.currentDisplayIndex - 1 + buttons.length) % buttons.length;
    else if (e.key === "Home") nextIndex = 0; else if (e.key === "End") nextIndex = buttons.length - 1;
    // Kondisi orientasi menu vertikal (left / right)
    else if (e.key === "ArrowDown") nextIndex = (this.currentDisplayIndex + 1) % buttons.length;
    else if (e.key === "ArrowUp") nextIndex = (this.currentDisplayIndex - 1 + buttons.length) % buttons.length;
    else if (e.key === "Home") nextIndex = 0; else if (e.key === "End") nextIndex = buttons.length - 1;
    else return;

    e.preventDefault();
    // Paksa fokus keyboard melompat ke elemen tombol aktif yang baru
    (buttons[nextIndex] as HTMLElement).focus();
    // console.log("_handleKeyDown", buttons[nextIndex].parentElement?.parentElement!)
    this.navigate(nextIndex, el);
  }

  private play(el?: HTMLElement) {
    const variants = this.#item.variants || [];
    if (!variants || variants.length <= 1) return;
    if (this.autoplayTimer) window.clearInterval(this.autoplayTimer);
    this.autoplayTimer = window.setInterval(() => {
      this.navigate(this.currentDisplayIndex + 1, el!);
    }, this.config.duration);
  }

  public checkout() {
    const variants = this.#item.variants || [];
    const selectedVariant = variants[this.currentDisplayIndex] || {};
    const checkoutPackagePayload = {
      productId: this.#item.id,
      productTitle: this.#item.title,
      selectedVariant: selectedVariant,
      price: this.#item.price
    };
    if (typeof this.config.onCheckout === "function") {
      this.config.onCheckout(checkoutPackagePayload);
    }
    if (this.config.emit && typeof this.config.emit === "function") {
      this.config.emit("elementChanged", {
        builder: this.builderId, type: "@product:checkout",
        element: this.load("@product>checkout") as HTMLElement,
        data: checkoutPackagePayload
      });
    }
  }

}