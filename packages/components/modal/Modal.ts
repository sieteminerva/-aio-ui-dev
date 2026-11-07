import type { iBuilderConfig, iBuilderRegistry } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base/Base";
// import "./Modal.css";

export type ModalElementType =
  | "@container"
  | "@modal"
  | "@modal>header"
  | "@modal>closeBtn";

export interface iModalConfig extends iBuilderConfig<ModalElementType> {
  id: string;                  // Kunci pelacakan instansiasi tunggal di DOM agar anti-kembung
  title?: string;              // Judul modal bawaan halaman preset default
  destroyOnClose: boolean;     // True = hancur total saat tutup, False = sembunyikan saja di DOM
  className?: string;          // Kelas kustom tambahan untuk backdrop luar
  modalClass?: string;         // Kelas kustom tambahan untuk kotak modal dalam
  onOpen?: (el: HTMLElement) => void;  // Callback siklus hidup saat modal meletup terbuka
  onClose?: (el: HTMLElement) => void; // Callback siklus hidup saat modal padam ditutup
}

export class ModalBuilder extends Builder<ModalElementType, iModalConfig> {
  readonly builderId: keyof iBuilderRegistry = "modal";
  readonly name: keyof iBuilderRegistry = "modal";
  readonly stylesheet: string = "./Modal.css";

  currentModal: HTMLElement | null = null;

  constructor(config: Partial<iModalConfig> = {}) {
    super();
    const defaultSelectors = {
      "@container": { tagName: "div", className: "dialog hidden" },
      "@modal": { tagName: "div", className: "modal" },
      "@modal>header": { tagName: "div", className: "header" },
      "@modal>closeBtn": { tagName: "", className: "close" },
    };
    const defaultConfig: Required<iModalConfig> = {
      themeId: "default",
      id: "modal-default",
      className: "",
      title: "Notification",
      modalClass: "",
      destroyOnClose: true,
      selectors: defaultSelectors,
      namespace: null,
      emit: () => { },
      onClose: () => { },
      onOpen: () => { }
    };
    // const randomSuffix = Math.random().toString(36).substring(7);
    this.config = this.resolveConfig(defaultConfig, config);
  }

  /**
   * 🏛️ SYSTEM PRESET PAGE DEFAULT BUILDER
   * Mengatur daur hidup pembuatan elemen dan menahan duplikasi fisik di DOM browser
   */
  public prepare(contentPayload: any): { open: () => void; close: () => void; unmount: () => void; element: HTMLElement } {
    // 💡 POTENSI ANTI-KEMBUNG: Ambil dari live DOM jika mode reuse aktif
    // console.log(contentPayload)
    const existingDOMElement = document.getElementById(this.config.id);
    if (existingDOMElement && !this.config.destroyOnClose) {
      console.log(`[Universal Modal] Re-using active memory pointer for #${this.config.id}`);

      // Sinkronisasikan saku internal Map agar tetap konsisten memegang elemen aktif
      // this.nodes().set("@container", existingDOMElement, contentPayload, false); //<= akan fix the issue
      // this.load("@container", contentPayload) as HTMLElement; // <= tidak, sementara yang dilakukan sama
      this.currentModal = existingDOMElement;
      return this._getControlInterfaces();
    }

    // 1. Lahirkan Cangkang Makro Terluar (Outer Overlay Backdrop)
    const overlay = this.render("@container", contentPayload) as HTMLElement;

    this.currentModal = overlay;

    // 2. Lahirkan Kotak Dialog Modal Dalam (Inner Box)
    const modalBox = this.render("@modal", contentPayload);

    // 3. Lahirkan Header & Tombol Silang JIT
    const header = this.render("@modal>header", contentPayload);
    const closeBtn = this.render("@modal>closeBtn", contentPayload);

    // 4. Proses kompilasi konten polimorfik murni vanilla pilihan cerdas Anda
    const bodyContent = this._compileContent(contentPayload);
    bodyContent.classList.add("body");

    // ====================================================
    // 🧙‍♂️ THE PERFECT VANILLA WEAVING (JAHIT STRUKTUR DOM)
    // ====================================================
    if (header && closeBtn) header.appendChild(closeBtn);
    if (modalBox && header) modalBox.appendChild(header);
    if (modalBox && bodyContent) modalBox.appendChild(bodyContent);
    if (overlay && modalBox) overlay.appendChild(modalBox);

    // Injeksi fisik modal langsung di bawah bodi kulit terluar dokumen HTML
    if (overlay) document.body.appendChild(overlay);

    return this._getControlInterfaces();
  }

  protected template(typeKey: ModalElementType, el: HTMLElement, _payload?: any): void {
    switch (typeKey) {
      case "@container":
        el.id = this.config.id;
        if (this.config.className) el.classList.add(`${this.config.className}`.trim(), "hidden");
        break;

      case "@modal":
        if (this.config.modalClass) el.classList.add("modal", ` ${this.config.modalClass}.trim()`);
        break;

      case "@modal>header": {
        const title = document.createElement("h2");
        title.className = "title";
        title.textContent = this.config.title || "Formulir Pesanan";
        el.appendChild(title);
        break;
      }

      case "@modal>closeBtn": {
        const btn = el as HTMLButtonElement;
        btn.type = "button";
        btn.innerHTML = "&times;"; // Simbol silang perkasa
        break;
      }
    }
  }

  public initialize(_el?: HTMLElement, payload?: any, _context?: any): void {
    // console.log("initialize", _el)
    const overlay = (this.load("@container") || this.render("@container", payload)) as HTMLElement || this.currentModal;
    // console.log("initialize overlay", overlay)
    const closeBtn = this.load("@modal>closeBtn") as HTMLElement;

    if (closeBtn && overlay) {
      // Klik tombol silang memicu penutupan modal
      closeBtn.addEventListener("click", () => this.close());

      // Tutup safely jika area kosong backdrop luar hitam diketuk oleh user
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
          this.close();
        }
      });

      // console.log(`[Modal Lifecycle] Event interaksi untuk #${this.config.id} sukses terikat.`);
    }
  }

  public open(): void {
    const overlay = this.currentModal || this.load("@container") as HTMLElement;
    console.log("open", overlay) //<= overlay element ada
    if (!overlay) return;

    overlay.classList.remove("hidden");
    document.body.style.overflow = "hidden"; // Cegah double scrolling halaman belakang

    if (typeof this.config.onOpen === "function") {
      this.config.onOpen(overlay);
    }
  }

  public close(): void {
    const overlay = this.currentModal || this.load("@container") as HTMLElement;

    console.log("close", overlay) //<= overlay element ada
    if (!overlay) return;

    overlay.classList.add("hidden");
    document.body.style.overflow = ""; // Pulihkan scroll normal halaman belakang

    if (typeof this.config.onClose === "function") {
      this.config.onClose(overlay);
    }

    if (this.config.destroyOnClose) {
      this.unmount();
    }
  }

  private _compileContent(content: any): HTMLElement {
    if (content instanceof HTMLElement) return content;

    if (typeof content === "string") {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = content;
      return wrapper.firstElementChild instanceof HTMLElement ? wrapper.firstElementChild : wrapper;
    }

    if (typeof content === "function") {
      const renderedNode = content();
      if (renderedNode instanceof HTMLElement) return renderedNode;
    }

    const fallbackDiv = document.createElement("div");
    fallbackDiv.textContent = typeof content === "object" ? JSON.stringify(content) : String(content);
    return fallbackDiv;
  }

  private _getControlInterfaces(_currentModal?: HTMLElement) {
    // console.log("same element:", currentModal?.isEqualNode(this.currentModal)) // ❌ hasilnya false padahal sama 
    const overlay = this.currentModal;
    return {
      element: overlay as HTMLElement,
      open: () => this.open(),
      close: () => this.close(),
      unmount: () => this.unmount()
    };
  }

  public unmount() {
    const overlay = this.load("@container") as HTMLElement
    const closeBtn = this.load("@modal>closeBtn") as HTMLElement;
    if (overlay && closeBtn) {
      closeBtn.removeEventListener("click", this.close);
      overlay.removeEventListener("click", this.close);
      const modal = document.getElementById(this.config.id)
      modal?.remove()
      this.destroy();
    }
  }
}
