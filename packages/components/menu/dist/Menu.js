import { Builder } from "@aio-ui/base";
import { DEFAULT_MENU_SELECTORS } from "./Menu.kit.js";
import { splitMenuContent } from "./Menu.engine.js";
export class MenuBuilder extends Builder {
    builderId = "menu";
    name = "menu";
    stylesheet = "./Menu.css";
    isMenuOpened = false;
    constructor(config = {}) {
        super(); // Wajib mengetuk pintu rahim induk BuilderBase
        const defaultSelectors = DEFAULT_MENU_SELECTORS;
        const defaultConfig = {
            type: "top",
            themeId: "default",
            defaultRoute: "home",
            routes: ["home", "package", "gallery", "dashboard", "wizard"],
            emit: () => { },
            onNavigate(href) { return href ? true : false; },
            namespace: null,
            ...config,
            // 🛡️ MERGE SELECTORS TERPISAH: Jangan biarkan `...config` menggantikan seluruh
            // defaultSelectors dengan selectors parsial (mis. createSidebar hanya mengirim
            // `{ "@menu": { id } }`). Gabungkan override di ATAS default yang utuh.
            selectors: {
                ...defaultSelectors,
                ...(config?.selectors || {})
            }
        };
        this.config = this.resolveConfig(defaultConfig, config);
    }
    prepare(content, _config) {
        // Accepts `{ content: { navigations } }` and `{ navigations }`: the registry unwraps
        // `node.content`, but a manifest `schema` hands the whole record over.
        const source = content?.content ?? content;
        const payload = this.resolvePayload(source);
        const nav = this.render("@menu", payload["@menu"]);
        const brand = this.render("@menu>brand", payload["@menu>brand"]);
        const hamburger = this.render("@menu>hamburger", payload["@menu>hamburger"]);
        const navigations = this.render("@menu>navigations", payload["@menu>navigations"]);
        const actions = this.render("@menu>actions", payload["@menu>actions"]);
        if (brand)
            nav.appendChild(brand);
        if (hamburger)
            nav.appendChild(hamburger);
        if (navigations) {
            // The toggle needs a target to point at, and both sides must agree on the id.
            navigations.id = "primary-navigations";
            nav.appendChild(navigations);
            hamburger?.setAttribute("aria-controls", navigations.id);
        }
        if (actions)
            nav.appendChild(actions);
        // `type` decides the shell, not the content: a sidebar is the same nav in a wrapper.
        if (this.config.type === "sidebar") {
            nav.classList.add("vertical");
            const sidebar = this.render("@container", source);
            sidebar.appendChild(nav);
            return sidebar;
        }
        return nav;
    }
    // ====================================================
    // 🧙‍♂️ OVERRIDE 1: ABSTRAKSI PETA DATA (MURNI KHUSUS UNTUK DATA MENU)
    // ====================================================
    /**
     * Maps one flat navigation list onto the keys `template()` expects. The splitting rule
     * itself lives in `splitMenuContent()` so it can be tested on its own.
     */
    resolvePayload(content) {
        const { brand, navigations, actions } = splitMenuContent(content);
        return {
            "@menu": content,
            "@menu>brand": brand,
            "@menu>hamburger": {},
            "@menu>navigations": navigations,
            "@menu>navigations>item": null,
            "@menu>actions": actions,
        };
    }
    initialize(root) {
        const nav = root ?? this.load("@menu");
        if (!nav)
            return;
        const hamburger = nav.querySelector(".hamburger-btn");
        const navigations = nav.querySelector(".navigations");
        // A menu without a toggle is a valid menu (desktop-only, or a sidebar). No warning.
        if (!hamburger || !navigations)
            return;
        this.hamburger = hamburger;
        this.navigations = navigations;
        hamburger.removeEventListener("click", this.handleToggle);
        hamburger.addEventListener("click", this.handleToggle);
        // Reflect the current state on first paint, so `aria-expanded` is never a lie.
        this.setOpen(this.isMenuOpened);
    }
    hamburger = null;
    navigations = null;
    handleToggle = () => {
        this.isMenuOpened = !this.isMenuOpened;
        let isDefaultPrevented = false;
        this.config.emit?.("builder:menu-toggle", {
            opened: this.isMenuOpened,
            element: this.hamburger,
            preventDefault: () => { isDefaultPrevented = true; },
        });
        if (isDefaultPrevented) {
            // The listener already answered: keep internal state where the host expects it.
            this.isMenuOpened = !this.isMenuOpened;
            return;
        }
        this.setOpen(this.isMenuOpened);
    };
    setOpen(open) {
        this.navigations?.classList.toggle("open", open);
        this.hamburger?.classList.toggle("active", open);
        this.hamburger?.setAttribute("aria-expanded", open ? "true" : "false");
    }
    // ====================================================
    // 🧙‍♂️ OVERRIDE 2: PERAKIT STRUKTUR CONTENT DEFAULT FALLBACK KOMPONEN MENU
    // ====================================================
    template(typeKey, el, payload, props) {
        // if (!payload) return;
        switch (typeKey) {
            case "@container":
                // console.log({ payload })
                if (payload.id)
                    el.id = payload.id;
                break;
            case "@menu":
                break;
            case "@menu>brand":
                // The brand is a link like any other: one key, no bespoke anchor.
                const brandLink = this.render("@menu>item>link", payload);
                if (brandLink)
                    el.appendChild(brandLink);
                break;
            case "@menu>navigations":
                for (const p of payload) {
                    const item = this.render("@menu>navigations>item", p);
                    el.appendChild(item);
                }
                break;
            case "@menu>navigations>item":
                const a = this.render("@menu>item>link", payload);
                el.appendChild(a);
                break;
            case "@menu>item>link": {
                if (payload?.className) {
                    for (const token of String(payload.className).split(/\s+/).filter(Boolean)) {
                        el.classList.add(token);
                    }
                }
                if (payload?.src) {
                    const img = document.createElement("img");
                    img.src = payload.src;
                    img.alt = payload.label || "logo";
                    img.className = "brand-image";
                    el.appendChild(img);
                }
                else if (payload?.label) {
                    el.textContent = payload.label;
                }
                if (payload?.icon) {
                    const icon = this.render("@menu>item>icon", payload.icon);
                    el.appendChild(icon);
                }
                if (payload?.attrs) {
                    for (const key in payload.attrs) {
                        if (!Object.hasOwn(payload.attrs, key))
                            continue;
                        const value = payload.attrs[key];
                        el.setAttribute(key, value);
                    }
                }
                if (payload?.onClick && typeof payload.onClick === "function") {
                    el.addEventListener("click", payload.onClick);
                }
                else {
                    this.bindNavigation(el, payload?.href);
                }
                break;
            }
            case "@menu>item>icon":
                // console.log({ el, payload })
                el.className = payload;
                break;
            case "@menu>actions": {
                // One link per action, flat: `div.actions` is not a list, so nesting `li` in it
                // (the previous behaviour) produced invalid markup and duplicated the CTA.
                const actions = Array.isArray(payload) ? payload : [];
                for (const action of actions) {
                    const link = this.render("@menu>item>link", action);
                    if (link) {
                        link.classList.add("item");
                        el.appendChild(link);
                    }
                }
                break;
            }
            case ("@menu>hamburger"):
                if (props.tagName?.toLowerCase() === "button")
                    el.type = "button";
                el.setAttribute("aria-expanded", "false");
                // Built as nodes rather than an innerHTML literal: the icon is markup, and markup
                // does not belong in a component's template hook.
                if (!el.firstChild) {
                    const svgNs = "http://www.w3.org/2000/svg";
                    const svg = document.createElementNS(svgNs, "svg");
                    svg.setAttribute("width", "24");
                    svg.setAttribute("height", "24");
                    svg.setAttribute("viewBox", "0 0 24 24");
                    svg.setAttribute("fill", "none");
                    svg.setAttribute("stroke", "currentColor");
                    svg.setAttribute("stroke-width", "2");
                    svg.setAttribute("aria-hidden", "true");
                    const path = document.createElementNS(svgNs, "path");
                    path.setAttribute("d", "M3 12h18M3 6h18M3 18h18");
                    svg.appendChild(path);
                    el.appendChild(svg);
                }
                break;
        }
    }
    navigate(href) {
        if (href)
            window.location.hash = href.replace(/^#/, "");
    }
    bindNavigation(element, href) {
        let rawTargetHref = (href || element.getAttribute("href") || this.config.defaultRoute || "home").trim();
        if (rawTargetHref.includes(window.location.origin) || rawTargetHref.includes(window.location.host)) {
            if (rawTargetHref.includes("#")) {
                rawTargetHref = rawTargetHref.split("#").filter(Boolean).filter(part => !part.includes("://") && !part.includes("localhost") && !part.includes(".com")).join("#").trim();
            }
        }
        element.href = rawTargetHref.startsWith("#") ? rawTargetHref : `#${rawTargetHref}`;
        element.addEventListener("click", (e) => {
            e.preventDefault();
            if (!rawTargetHref.includes("://") && !rawTargetHref.startsWith("//") && !rawTargetHref.startsWith("www.")) {
                let cleanRoute = String(rawTargetHref).replace(/^#/, "").trim();
                if (cleanRoute.includes(":"))
                    cleanRoute = String(cleanRoute.split(":")[0]).trim();
                if (cleanRoute.includes("?"))
                    cleanRoute = String(cleanRoute.split("?")[0]).trim();
                const finalRouteString = cleanRoute || "home";
                const handled = this.config.onNavigate(finalRouteString);
                if (handled === true)
                    return;
                this.navigate(finalRouteString);
            }
            else {
                window.open(rawTargetHref, "_blank");
            }
        });
    }
}
//# sourceMappingURL=Menu.js.map