import { Builder } from "@aio-ui/base";
export class MessageBuilder extends Builder {
    builderId = "message";
    name = "message";
    stylesheet = "./Message.css";
    config;
    _activeTimers = new Map();
    constructor(config = {}) {
        super();
        const defaultSelectors = {
            "@message": { tagName: "div", className: "toast" },
            "@message>close": { tagName: "i", className: "close circle icon", wrapper: "button.close" },
            "@message>content": { tagName: "div", className: "content" },
            "@message>content>header": { tagName: "h2", className: "header" },
            "@message>content>desc": { tagName: "p", className: "message" },
            "@message>content>icon": { tagName: "i" } // "error", "success", "info", "warning"
        };
        const defaultConfig = {
            themeId: "default",
            id: "global-status-message",
            element: document.body,
            duration: 3000,
            selectors: defaultSelectors,
            persist: false,
            namespace: null,
            emit: () => { },
            onOpen: () => { },
            onClose: () => { }
        };
        this.config = this.resolveConfig(defaultConfig, config);
    }
    prepare(content, _config = {}) {
        if (_config)
            this.config = this.resolveConfig(this.config, _config);
        const defaultContent = {
            header: "Congrats!",
            icon: "bell icon",
            type: "info",
            message: "",
        };
        const messageContent = { ...defaultContent, ...content };
        // ====================================================
        // 🧙‍♂️ THE DESTROY-AND-RECREATE ENGINE (IDE RADIKAL JENIUS ANDA!)
        // Jika notifikasi lama masih nangkring di bodi halaman web, eksekusi mati detik ini juga!
        // Mematikan total kebutuhan mengetik querySelector pembaruan teks secara kotor!
        // ====================================================
        const existingDOMElement = document.getElementById(this.config.id);
        if (existingDOMElement) {
            // console.log(`[Message Engine] Active notification #${this.config.id} detected. Executing instant unmount bypass...`);
            this.unmount(this.config.id, this.config.onClose);
        }
        // 1. Lahirkan Cangkang Makro Terluar Boks Notifikasi (@message)
        const messageElement = this.render("@message", messageContent);
        // 5. Cari kontainer penempelan (document.body vs custom element ID)
        let containerElement = null;
        if (typeof this.config.element === "string") {
            containerElement = document.getElementById(this.config.element);
        }
        else {
            containerElement = this.config.element;
        }
        if (!containerElement)
            containerElement = document.body;
        // Masukkan ke posisi baris teratas kontainer terarah
        containerElement.prepend(messageElement);
        this.config.onOpen(messageElement);
        this._startTimeoutCounter(this.config.id, this.config.duration, messageElement, this.config.onClose);
        return this.load("@message");
    }
    template(typeKey, el, payload) {
        if (!payload)
            return;
        switch (typeKey) {
            case "@message":
                el.id = this.config.id;
                // Suntikkan kelas jenis notifikasi secara dinamis (e.g., "message visible success icon")
                el.className = `visible ${payload.type || "info"} ${payload.icon ? "icon" : ""} ${el.className || ""}`.trim();
                el.style.boxShadow = "0 1px 2px 0 rgba(34, 36, 38, .15)";
                // 2. Lahirkan Tombol Silang Penutup JIT
                const closeIcon = this.render("@message>close").__outer;
                // 3. Lahirkan Ikon Penuntun Utama Kiri
                const msgContainer = this.render("@message>content");
                const icon = this.render("@message>content>icon", payload.icon);
                // 4. Lahirkan Boks Konten Kanan beserta Judul & Paragraf Deskripsi
                const header = this.render("@message>content>header", payload.header);
                const message = this.render("@message>content>desc", payload.message);
                // ====================================================
                // 🎢 THE PERFECT VANILLA WEAVING (JAHIT STRUKTUR DOM)
                // ====================================================
                if (header && payload.header)
                    msgContainer?.appendChild(header);
                if (message)
                    msgContainer?.appendChild(message);
                if (closeIcon && !this.config.persist)
                    el.appendChild(closeIcon);
                if (icon && payload.icon)
                    el.appendChild(icon);
                if (msgContainer)
                    el.appendChild(msgContainer);
                break;
            case "@message>close":
                el.style.cursor = "pointer";
                break;
            case "@message>content>icon":
                // Tempelkan kelas ikon ikon standard (e.g., "check circle icon") hantaran Sheets
                if (payload)
                    el.className = payload || "notification icon";
                break;
            case "@message>content>header":
                // 🔒 SUPER AMAN DARI XSS: Ganti innerHTML kaku menjadi textContent suci!
                el.textContent = payload || "";
                break;
            case "@message>content>desc":
                el.textContent = payload || "";
                break;
        }
    }
    initialize() {
        const closeIcon = this.load("@message>close");
        if (closeIcon) {
            closeIcon.addEventListener("click", () => {
                this.unmount(this.config.id, this.config.onClose);
            });
            // console.log("[Message Lifecycle] Toast close button attached securely.");
        }
    }
    unmount(id, onCloseCallback) {
        const activeTimer = this._activeTimers.get(id);
        if (activeTimer) {
            window.clearTimeout(activeTimer);
            this._activeTimers.delete(id);
        }
        const targetElement = this.load("@message") ?? document.getElementById(id);
        if (targetElement) {
            if (typeof onCloseCallback === "function") {
                onCloseCallback(targetElement);
            }
            targetElement.remove(); // Penggal dari live DOM Tree bodi web
            // 🔒 LIQUIDASI TOTAL: Kuras saku Map Map agar RAM bersih 0B leak!
            console.log(`[Message Engine] Instance #${id} wiped out from DOM and memory stacks successfully.`);
        }
    }
    _startTimeoutCounter(id, duration, el, onCloseCallback) {
        if (el) {
            const activeTimer = this._activeTimers.get(id);
            if (activeTimer) {
                window.clearTimeout(activeTimer);
                this._activeTimers.delete(id);
            }
            if (duration && duration > 0 && !this.config.persist) {
                const newTimer = window.setTimeout(() => {
                    this.unmount(id, onCloseCallback);
                }, duration);
                this._activeTimers.set(id, newTimer);
            }
        }
    }
}
//# sourceMappingURL=Message.js.map