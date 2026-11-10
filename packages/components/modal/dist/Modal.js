import { Builder } from "@aio-ui/base";
export class ModalBuilder extends Builder {
    builderId = "modal";
    name = "modal";
    stylesheet = "./Modal.css";
    currentModal = null;
    /** True after `destroy()`; `open()`/`close()` refuse to pretend it still works. */
    #destroyed = false;
    /** Kept so teardown removes exactly the listener that was added. */
    closeBtn = null;
    handleCloseClick = () => this.close();
    handleBackdropClick = (event) => {
        if (event.target === this.currentModal)
            this.close();
    };
    constructor(config = {}) {
        super();
        const defaultSelectors = {
            "@container": { tagName: "div", className: "dialog hidden" },
            "@modal": { tagName: "div", className: "modal" },
            "@modal>header": { tagName: "div", className: "header" },
            "@modal>closeBtn": { tagName: "", className: "close" },
        };
        const defaultConfig = {
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
    prepare(contentPayload) {
        document.getElementById(this.config.id)?.remove();
        this.#destroyed = false;
        const overlay = this.render("@container", contentPayload);
        const modalBox = this.render("@modal", contentPayload);
        const header = this.render("@modal>header", contentPayload);
        const closeBtn = this.render("@modal>closeBtn", contentPayload);
        const bodyContent = this._compileContent(contentPayload);
        bodyContent.classList.add("body");
        if (header && closeBtn)
            header.appendChild(closeBtn);
        if (modalBox && header)
            modalBox.appendChild(header);
        if (modalBox && bodyContent)
            modalBox.appendChild(bodyContent);
        if (overlay && modalBox)
            overlay.appendChild(modalBox);
        this.currentModal = overlay;
        this.closeBtn = closeBtn ?? null;
        this.bind();
        this.config.onReady?.(this._getControlInterfaces());
        return overlay;
    }
    /** Attaches the two ways out, using references that teardown can remove. */
    bind() {
        this.closeBtn?.addEventListener("click", this.handleCloseClick);
        this.currentModal?.addEventListener("click", this.handleBackdropClick);
    }
    /** Removes exactly the listeners `bind()` added. */
    unbind() {
        this.closeBtn?.removeEventListener("click", this.handleCloseClick);
        this.currentModal?.removeEventListener("click", this.handleBackdropClick);
    }
    template(typeKey, el, _payload) {
        switch (typeKey) {
            case "@container":
                el.id = this.config.id;
                if (this.config.className)
                    el.classList.add(`${this.config.className}`.trim(), "hidden");
                break;
            case "@modal":
                if (this.config.modalClass)
                    el.classList.add("modal", ` ${this.config.modalClass}.trim()`);
                break;
            case "@modal>header": {
                const title = document.createElement("h2");
                title.className = "title";
                title.textContent = this.config.title || "Formulir Pesanan";
                el.appendChild(title);
                break;
            }
            case "@modal>closeBtn": {
                const btn = el;
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
    initialize(_el, _payload, _context) {
        return;
    }
    /** Id kept outside `config`, which is cleared by `Base.destroy()`. */
    #label() {
        return `#${this.config?.id ?? "modal"}`;
    }
    /** Whether this instance has been torn down. A destroyed modal cannot be reopened. */
    get isDestroyed() {
        return this.#destroyed;
    }
    open() {
        const overlay = this.currentModal;
        if (this.#destroyed || !overlay) {
            // `destroyOnClose: true` makes the modal single-use. Say it out loud instead of
            // leaving a caller with a handle that silently does nothing.
            // `this.config` is gone after destroy(), hence the optional access.
            console.warn(`[Modal] open() ignored: ${this.#label()} was destroyed. Rebuild it, or use destroyOnClose: false.`);
            return;
        }
        overlay.classList.remove("hidden");
        document.body.style.overflow = "hidden"; // Cegah double scrolling halaman belakang
        this.config.onOpen?.(overlay);
    }
    close() {
        const overlay = this.currentModal;
        if (this.#destroyed || !overlay)
            return;
        overlay.classList.add("hidden");
        document.body.style.overflow = ""; // Pulihkan scroll normal halaman belakang
        this.config.onClose?.(overlay);
        if (this.config.destroyOnClose)
            this.destroy();
    }
    _compileContent(content) {
        if (content instanceof HTMLElement)
            return content;
        if (typeof content === "string") {
            const wrapper = document.createElement("div");
            wrapper.innerHTML = content;
            return wrapper.firstElementChild instanceof HTMLElement ? wrapper.firstElementChild : wrapper;
        }
        if (typeof content === "function") {
            const renderedNode = content();
            if (renderedNode instanceof HTMLElement)
                return renderedNode;
        }
        const fallbackDiv = document.createElement("div");
        fallbackDiv.textContent = typeof content === "object" ? JSON.stringify(content) : String(content);
        return fallbackDiv;
    }
    _getControlInterfaces() {
        return {
            element: this.currentModal,
            open: () => this.open(),
            close: () => this.close(),
            unmount: () => this.destroy()
        };
    }
    /**
     * Releases everything this builder owns. Idempotent on purpose: it is called by
     * `close()` (when `destroyOnClose`), by a controller, and by route teardown.
     */
    destroy() {
        this.unbind();
        document.body.style.overflow = "";
        this.currentModal?.remove();
        this.currentModal = null;
        this.closeBtn = null;
        this.#destroyed = true;
        super.destroy();
    }
    /** Alias kept so existing callers keep working. */
    unmount() {
        this.destroy();
    }
}
//# sourceMappingURL=Modal.js.map