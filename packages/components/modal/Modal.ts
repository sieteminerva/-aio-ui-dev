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
  /**
   * Receives the control handles once the overlay exists.
   *
   * This is how a caller opens a modal: `build()` now returns the element, so the
   * handles have to arrive some other way than the return value.
   */
  onReady?: (controls: iModalControls) => void;
}

/** What a caller gets to drive an open modal. */
export interface iModalControls {
  element: HTMLElement;
  open: () => void;
  close: () => void;
  unmount: () => void;
}

export class ModalBuilder extends Builder<ModalElementType, iModalConfig> {
  readonly builderId: keyof iBuilderRegistry = "modal";
  readonly name: keyof iBuilderRegistry = "modal";
  readonly stylesheet: string = "./Modal.css";

  currentModal: HTMLElement | null = null;

  /** True after `destroy()`; `open()`/`close()` refuse to pretend it still works. */
  #destroyed = false;

  /** Kept so teardown removes exactly the listener that was added. */
  private closeBtn: HTMLElement | null = null;
  private readonly handleCloseClick = () => this.close();
  private readonly handleBackdropClick = (event: Event) => {
    if (event.target === this.currentModal) this.close();
  };

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
      onOpen: () => { },
      onReady: () => { }
    };
    // const randomSuffix = Math.random().toString(36).substring(7);
    this.config = this.resolveConfig(defaultConfig, config);
  }

  /**
   * Builds the overlay and returns it.
   *
   * Three things changed from the version that misbehaved:
   *
   * 1. it **returns the element** instead of control handles, so the registry can mount
   *    it (`build()` requires an element); the handles now arrive through `onReady`;
   * 2. it no longer appends itself to `document.body` — whoever renders it decides
   *    where it lives, which is what made overlays stack up before;
   * 3. a leftover node with the same id is **removed first**, so the id always has
   *    exactly one owner instead of silently reusing a stale element.
   */
  public prepare(contentPayload: any): HTMLElement {
    document.getElementById(this.config.id)?.remove();
    this.#destroyed = false;

    const overlay = this.render("@container", contentPayload) as HTMLElement;
    const modalBox = this.render("@modal", contentPayload);
    const header = this.render("@modal>header", contentPayload);
    const closeBtn = this.render("@modal>closeBtn", contentPayload);

    const bodyContent = this._compileContent(contentPayload);
    bodyContent.classList.add("body");

    if (header && closeBtn) header.appendChild(closeBtn);
    if (modalBox && header) modalBox.appendChild(header);
    if (modalBox && bodyContent) modalBox.appendChild(bodyContent);
    if (overlay && modalBox) overlay.appendChild(modalBox);

    this.currentModal = overlay;
    this.closeBtn = (closeBtn as HTMLElement) ?? null;
    this.bind();

    this.config.onReady?.(this._getControlInterfaces());

    return overlay;
  }

  /** Attaches the two ways out, using references that teardown can remove. */
  private bind(): void {
    this.closeBtn?.addEventListener("click", this.handleCloseClick);
    this.currentModal?.addEventListener("click", this.handleBackdropClick);
  }

  /** Removes exactly the listeners `bind()` added. */
  private unbind(): void {
    this.closeBtn?.removeEventListener("click", this.handleCloseClick);
    this.currentModal?.removeEventListener("click", this.handleBackdropClick);
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

  /**
   * Kept for compatibility: listeners are bound in `prepare()`, so nothing happens here.
   * Binding lazily is what made a reused element arrive without working listeners.
   */
  public initialize(_el?: HTMLElement, _payload?: any, _context?: any): void {
    return;
  }

  /** Id kept outside `config`, which is cleared by `Base.destroy()`. */
  #label(): string {
    return `#${(this.config as Partial<iModalConfig> | null)?.id ?? "modal"}`;
  }

  /** Whether this instance has been torn down. A destroyed modal cannot be reopened. */
  public get isDestroyed(): boolean {
    return this.#destroyed;
  }

  public open(): void {
    const overlay = this.currentModal;
    if (this.#destroyed || !overlay) {
      // `destroyOnClose: true` makes the modal single-use. Say it out loud instead of
      // leaving a caller with a handle that silently does nothing.
      // `this.config` is gone after destroy(), hence the optional access.
      console.warn(
        `[Modal] open() ignored: ${this.#label()} was destroyed. Rebuild it, or use destroyOnClose: false.`
      );
      return;
    }

    overlay.classList.remove("hidden");
    document.body.style.overflow = "hidden"; // Cegah double scrolling halaman belakang

    this.config.onOpen?.(overlay);
  }

  public close(): void {
    const overlay = this.currentModal;
    if (this.#destroyed || !overlay) return;

    overlay.classList.add("hidden");
    document.body.style.overflow = ""; // Pulihkan scroll normal halaman belakang

    this.config.onClose?.(overlay);

    if (this.config.destroyOnClose) this.destroy();
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

  private _getControlInterfaces(): iModalControls {
    return {
      element: this.currentModal as HTMLElement,
      open: () => this.open(),
      close: () => this.close(),
      unmount: () => this.destroy()
    };
  }

  /**
   * Releases everything this builder owns. Idempotent on purpose: it is called by
   * `close()` (when `destroyOnClose`), by a controller, and by route teardown.
   */
  public destroy(): void {
    this.unbind();

    document.body.style.overflow = "";
    this.currentModal?.remove();

    this.currentModal = null;
    this.closeBtn = null;
    this.#destroyed = true;

    super.destroy();
  }

  /** Alias kept so existing callers keep working. */
  public unmount(): void {
    this.destroy();
  }
}
