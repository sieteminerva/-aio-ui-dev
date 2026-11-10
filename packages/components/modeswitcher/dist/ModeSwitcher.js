import { Builder } from "@aio-ui/base";
export class ModeSwitcherBuilder extends Builder {
    builderId = "mode-switcher";
    name = "mode-switcher";
    stylesheet = "./ModeSwitcher.css";
    mode = "light";
    config;
    constructor(config = {}) {
        super();
        // 💡 SINKRONISASI INITIAL STATE: Baca kondisi mode browser live semenjak detik pertama lahir!
        this.mode = this.getMode();
        const defaultSelectors = {
            "@mode-switcher": { tagName: "div", className: "mode-switcher" },
            "@mode-switcher>toggle": {
                tagName: "toggle",
                className: "toggle",
                attrs: { "data-theme-toggle": "", "aria-label": "Toggle theme" }
            },
            "@mode-switcher>track": { tagName: "span", className: "track" },
            "@mode-switcher>thumb": { tagName: "span", className: "thumb" },
            "@mode-switcher>label": { tagName: "span", className: "label" }
        };
        // Deep merge terisolasi agar selectors anak tidak hilang terpotong
        const defaultConfig = {
            themeId: "default",
            selectors: defaultSelectors,
            namespace: null,
            emit: () => { },
        };
        this.config = this.resolveConfig(defaultConfig, config);
    }
    prepare() {
        return this.render("@mode-switcher");
    }
    template(typeKey, el, _payload) {
        switch (typeKey) {
            case "@mode-switcher":
                const toggle = this.render("@mode-switcher>toggle");
                const thumb = this.render("@mode-switcher>thumb");
                const track = this.render("@mode-switcher>track");
                if (thumb && track)
                    track.appendChild(thumb);
                const label = this.render("@mode-switcher>label");
                if (toggle) {
                    if (track)
                        toggle.appendChild(track);
                    if (label)
                        toggle.appendChild(label);
                }
                if (toggle)
                    el.appendChild(toggle);
                break;
            case "@mode-switcher>toggle":
                el.type = "button";
                el?.classList.toggle('is-dark', this.mode === "dark");
                // Sinkronisasi kelas CSS awal mengikuti status mode ter-load
                break;
            case "@mode-switcher>thumb":
                break;
            case "@mode-switcher>track":
                break;
            case "@mode-switcher>label":
                // Sinkronisasi teks label pertama kali mengikuti kebenaran data di dokumen
                el.textContent = this.mode === "dark" ? "Light" : "Dark";
                break;
        }
    }
    initialize() {
        const toggleBtn = this.load("@mode-switcher>toggle");
        const label = this.load("@mode-switcher>label");
        if (toggleBtn && label) {
            toggleBtn.addEventListener("click", (e) => {
                e.preventDefault();
                this.mode = this.mode === "dark" ? "light" : "dark";
                document.documentElement.dataset.mode = this.mode;
                toggleBtn?.classList.toggle('is-dark', this.mode === "dark");
                label.textContent = this.mode === 'dark' ? 'Light' : 'Dark';
                // Light/dark is this component's own concern; the shell's `themeChanged` means
                // "the router reported a different theme id" (default, cyberpunk, …), so it must
                // not be reused here — a listener would see two unrelated payloads on one key.
                this.config.emit?.("modeChanged", {
                    mode: this.mode,
                    element: toggleBtn
                });
            });
            // console.log("[ModeSwitcher Lifecycle] Secure interactive toggle click bound successfully.");
        }
    }
    // ================
    // internal methods
    // ================
    normalizeMode(mode) {
        return mode?.toLowerCase() === 'dark' ? 'dark' : 'light';
    }
    getMode() {
        return this.normalizeMode(document.documentElement.dataset.mode);
    }
}
//# sourceMappingURL=ModeSwitcher.js.map