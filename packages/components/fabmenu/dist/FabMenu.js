import { Builder } from "@aio-ui/base";
export class FabMenuBuilder extends Builder {
    builderId = "fab-menu";
    name = "fab-menu";
    stylesheet = "./FabMenu.css";
    config;
    isMenuOpen = false;
    idleTimer;
    constructor(config = {}) {
        super();
        const defaultSelectors = {
            "@fab": { tagName: "div", className: "fab" },
            "@fab>panel": { tagName: "div", className: "panel" },
            "@fab>panel>title": { tagName: "span", className: "title" },
            "@fab>panel>item": { tagName: "button", className: "item option" },
            "@fab>panel>trigger": { tagName: "button", className: "trigger" },
        };
        const defaultConfig = {
            themeId: "default",
            container: null,
            position: "bottom-left",
            closeOnSelected: true,
            duration: 10000,
            closeIcon: "✕",
            displayIcon: "⚙️",
            selectors: defaultSelectors,
            namespace: null,
            emit: () => { }
        };
        this.config = this.resolveConfig(defaultConfig, config);
    }
    prepare(content, _config) {
        this._clearIdleTimer();
        this.isMenuOpen = false;
        const fab = this.render("@fab");
        const panel = this.render("@fab>panel", content.actions);
        const title = this.render("@fab>panel>title", content.title);
        if (title && panel)
            panel?.prepend(title);
        const trigger = this.render("@fab>panel>trigger", this.config);
        if (this.config.position.startsWith("bottom")) {
            if (panel)
                fab?.appendChild(panel);
            if (trigger)
                fab?.appendChild(trigger);
        }
        else {
            if (trigger)
                fab?.appendChild(trigger);
            if (panel)
                fab?.appendChild(panel);
        }
        return fab;
    }
    /**
     * 👑 THE SEPARATED HYDRATION VALVE
     */
    template(typeKey, el, payload, props) {
        switch (typeKey) {
            case "@fab":
                el.className = `fab ${this.config.position} ${props.className || ""}`.trim();
                break;
            case "@fab>panel":
                for (const p of payload) {
                    const item = this.render("@fab>panel>item", p);
                    el.appendChild(item);
                }
                break;
            case "@fab>panel>title":
                el.textContent = (payload || "MENU").toUpperCase();
                break;
            case "@fab>panel>item": {
                // console.log({ payload, props });
                el.type = payload.type || "button";
                el.textContent = payload.label || "Option";
                if (payload.id)
                    el.id = payload.id;
                if (payload.isActive)
                    el.classList.add("active");
                if (payload.className)
                    el.className = `${el.className} ${payload.className}`.trim();
                // Listener
                el.onclick = (e) => {
                    if (payload.onClick)
                        payload.onClick(e);
                    if (this.config.closeOnSelected) {
                        this.close();
                    }
                    else {
                        this._resetIdleTimer();
                    }
                };
                break;
            }
            case "@fab>panel>trigger": {
                el.title = "Click for switching options";
                el.textContent = payload.displayIcon;
                break;
            }
        }
    }
    initialize() {
        const triggerBtn = this.load("@fab>panel>trigger");
        if (triggerBtn) {
            triggerBtn.onclick = () => {
                if (this.isMenuOpen) {
                    this.close();
                }
                else {
                    this.open();
                }
            };
            // console.log("[FAB Lifecycle] Trigger button listener attached securely.");
        }
    }
    // ==============
    // Private Helper
    // ==============
    /**
     * 🔓 STATE MANAGEMENT: Membuka panel menu secara reaktif
     */
    open() {
        if (this.isMenuOpen)
            return;
        this.isMenuOpen = true;
        const panel = this.load("@fab>panel");
        const trigger = this.load("@fab>panel>trigger");
        if (panel)
            panel.classList.add("is-open");
        if (trigger)
            trigger.textContent = this.config.closeIcon;
        this._resetIdleTimer();
    }
    /**
     * 🔒 STATE MANAGEMENT: Menutup panel menu secara reaktif
     */
    close() {
        if (!this.isMenuOpen)
            return;
        this.isMenuOpen = false;
        const panel = this.load("@fab>panel");
        const trigger = this.load("@fab>panel>trigger");
        if (panel)
            panel.classList.remove("is-open");
        if (trigger)
            trigger.textContent = this.config.displayIcon;
        this._clearIdleTimer();
    }
    unmount() {
        this._clearIdleTimer();
        const trigger = this.load("@fab>panel>trigger");
        if (trigger)
            trigger.onclick = null;
        // Panggil fungsi utama pembersihan memori terpusat milik induk ksatria!
        this.destroy();
    }
    _resetIdleTimer() {
        this._clearIdleTimer();
        if (!this.config.duration || this.config.duration <= 0)
            return;
        this.idleTimer = window.setTimeout(() => {
            // Auto-close is a behaviour, not an event worth logging: a component that prints
            // on a timer fills the host's console on its own.
            if (this.isMenuOpen)
                this.close();
        }, this.config.duration);
    }
    _clearIdleTimer() {
        if (this.idleTimer) {
            window.clearTimeout(this.idleTimer);
            this.idleTimer = undefined;
        }
    }
}
//# sourceMappingURL=FabMenu.js.map