
import type { iActionProperty, iBasicNode, iBuilderConfig } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base/Base";
// import "./Menu.css";


export type MenuElementType =
  | "@container"
  | "@menu"
  | "@menu>brand"
  | "@menu>hamburger"
  | "@menu>navigations"
  | "@menu>navigations>item"
  | "@menu>actions"
  | "@menu>item>link"
  | "@menu>item>icon";

export interface iMenuConfig extends iBuilderConfig<MenuElementType> {
  /** 
   * TOTAL EXTRACTED SELECTORS (Semua elemen diekstrak utuh ke sini!)
   */
  type: "top" | "sidebar"
  selectors: Record<MenuElementType, iActionProperty>;

  /** Default route */
  defaultRoute?: string;
  /** Default route */
  themeId?: string;

  /** Valid application routes */
  routes?: string[];

  onNavigate?: (href?: string) => boolean
}

export class MenuBuilder extends Builder<MenuElementType, iMenuConfig> {
  readonly builderId = "menu";
  readonly name = "menu";
  readonly stylesheet = "./Menu.css";

  protected isMenuOpened: boolean = false;

  constructor(config: Partial<iMenuConfig> = {}) {
    super(); // Wajib mengetuk pintu rahim induk BuilderBase

    const defaultSelectors: Record<MenuElementType, iActionProperty> = {
      "@container": { tagName: "aside", className: "sidebar" },
      "@menu": { tagName: "nav", className: "nav" },
      "@menu>brand": { tagName: "div", className: "brand", attrs: { src: "" } },
      "@menu>hamburger": { tagName: "button", className: "hamburger-btn", attrs: { "aria-label": "Toggle menu" } },
      "@menu>navigations": { tagName: "ul", className: "navigations" },
      "@menu>navigations>item": { tagName: "li", className: "item" },
      "@menu>actions": { tagName: "div", className: "actions" },
      "@menu>item>link": { tagName: "a" },
      "@menu>item>icon": { tagName: "i", className: "icon" }
    };

    const defaultConfig: Required<iMenuConfig> = {
      type: "top",
      themeId: "default",
      defaultRoute: "home",
      routes: ["home", "package", "gallery", "dashboard", "wizard"],
      emit: () => { },
      onNavigate(href?: string) { return href ? true : false; },
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

  public prepare(content: iBasicNode, _config?: Partial<iMenuConfig>): HTMLElement {

    if (_config?.type === "sidebar") {
      const sidebar = this.render("@container", content)!;
      const nav = this.render("@menu", content)!;
      nav.className = "nav vertical";

      const navigations = this.render("@menu>navigations", content.navigations)!;
      nav.appendChild(navigations);

      sidebar?.appendChild(nav);
      return sidebar;
    } else {
      const payload = this.resolvePayload(content);
      const nav = this.render("@menu", payload)!;
      const brand = this.render("@menu>brand", payload["@menu>brand"])!;
      const navigations = this.render("@menu>navigations", payload["@menu>navigations"])!;
      const actions = this.render("@menu>actions", payload["@menu>actions"])!;
      nav.append(brand, navigations, actions);
      return nav!;
    }

  }

  // ====================================================
  // 🧙‍♂️ OVERRIDE 1: ABSTRAKSI PETA DATA (MURNI KHUSUS UNTUK DATA MENU)
  // ====================================================
  // Inside MenuBuilder.ts

  /**
   * 🏗️ RE-ENGINEERING DATA RESOLVER (PERBAIKAN KUNCI UTAMA ANDA!)
   * Memotong, mengiris (slice), dan memisahkan data linear Sheets menjadi 3 seksi bersih.
   * Menjamin level TemplateRegistry dan Tema Kustom murni hanya menerima data yang sudah matang!
   */
  protected resolvePayload(content: iBasicNode): Record<MenuElementType, any> {
    const navigations: iActionProperty[] = Array.isArray(content.navigations)
      ? content.navigations
      : content.navigations ? [content.navigations] : [];

    // 🔬 SEKSI 1: Ekstrak Brand Data (Murni hanya mengambil indeks pertama)
    const brandPayload = navigations[0] || { label: "Brand", href: "#home" };

    // 🔬 SEKSI 2: Ekstrak Link Navigasi (Buang indeks [0] logo, dan buang tombol CTA)
    const navigationLinksPayload = navigations.slice(1).filter(
      link => link.className !== "button" && !link.href?.includes("tel:")
    );

    // 🔬 SEKSI 3: Ekstrak Tombol Aksi CTA (Murni hanya mengambil objek tombol)
    const ctaPayload = navigations.slice(1).find(
      link => link.className === "button" || link.href?.includes("tel:")
    ) || null;


    const actions = Array.isArray(content.actions)
      ? content.actions
      : content.actions ? [content.actions] : [];

    if (ctaPayload) actions.push(ctaPayload)

    return {
      "@menu": content,
      "@menu>brand": brandPayload,
      "@menu>hamburger": {},
      "@menu>navigations": navigationLinksPayload,
      "@menu>navigations>item": null,
      "@menu>actions": actions
    } as Record<MenuElementType, any>;

  }

  public initialize(el: HTMLElement, _payload: any): void {
    // ====================================================
    // 🧙‍♂️ DIRECT ELEMENT REF RETRIEVAL (SIHIR MAP OBJECT ANDA!)
    // Karena _nodes mengembalikan Array (mendukung multi-instance), 
    // ambil indeks ke-0 secara aman karena Menu bersifat singleton makro halaman!
    // ====================================================
    const hamburger = this.render("@menu>hamburger") as HTMLButtonElement;
    const navigations = el.querySelector("ul.navigations");

    // Kunci gerbang interaksi jika kedua elemen fisik hidup sukses terambil dari saku RAM
    if (hamburger && navigations) {
      hamburger.addEventListener("click", () => {
        console.log("clicked")
        this.isMenuOpened = !this.isMenuOpened;
        let isDefaultPrevented = false;

        // Picu emisi event eksternal framework kustom Anda
        this.config.emit?.("builder:menu-toggle" as any, {
          opened: this.isMenuOpened,
          element: hamburger,
          preventDefault: () => { isDefaultPrevented = true; }
        });

        if (isDefaultPrevented) return;

        // Manipulasi kelas visual secara lurus, linear, dan direct!
        navigations.classList.toggle("open", this.isMenuOpened);
        hamburger.classList.toggle("active", this.isMenuOpened);
      });

      // console.log("[Menu Lifecycle] Interactive hamburger event bindings attached securely.");
    } else {
      console.warn("[Menu Lifecycle] Initialization skipped. Hamburger or navigation node missing in _nodes storage.");
    }
  }

  // ====================================================
  // 🧙‍♂️ OVERRIDE 2: PERAKIT STRUKTUR CONTENT DEFAULT FALLBACK KOMPONEN MENU
  // ====================================================
  protected template(typeKey: MenuElementType, el: HTMLElement, payload: any, props: iActionProperty): void {
    // if (!payload) return;

    switch (typeKey) {
      case "@container":
        // console.log({ payload })
        if (payload.id) el.id = payload.id;
        break;

      case "@menu":

        break;

      case "@menu>brand":
        const l = this.render("@menu>item>link") as HTMLAnchorElement;
        l.href = payload.href || "#home";

        if (payload.src) {
          const img = document.createElement("img");
          img.src = payload.src;
          img.alt = payload.label || "logo";
          l?.appendChild(img);
        } else {
          l.textContent = payload.label || "Brand";
        }
        el.append(l);
        break;

      case "@menu>navigations":
        for (const p of payload) {
          const item = this.render("@menu>navigations>item", p) as HTMLElement;
          el.appendChild(item)
        }

        break;

      case "@menu>navigations>item":
        const a = this.render("@menu>item>link", payload) as HTMLAnchorElement

        el.appendChild(a)
        break;

      case "@menu>item>link":
        // console.log({ payload })
        if (payload?.label) el.textContent = payload?.label || "";

        if (payload?.icon) {
          const i = this.render("@menu>item>icon", payload.icon) as HTMLElement;
          el.appendChild(i);
        }
        if (payload?.attrs) {
          for (const key in payload.attrs) {
            if (!Object.hasOwn(payload.attrs, key)) continue;
            const value = payload.attrs[key];
            el.setAttribute(key, value)
          }
        }
        if (payload?.onClick && typeof payload.onClick === "function") {
          el.addEventListener("click", payload.onClick)
        } else {
          this.bindNavigation(el as HTMLAnchorElement, payload?.href);
        }
        break;

      case "@menu>item>icon":
        // console.log({ el, payload })
        el.className = payload;
        break;

      case "@menu>actions":

        const ctaPayload = payload.find((link: HTMLAnchorElement) => link.className === "button" || link.href?.includes("tel:"));

        if (ctaPayload) {
          const btn = document.createElement("a");
          btn.className = ctaPayload.className || "button small";
          btn.href = ctaPayload.href || "#form";
          btn.textContent = ctaPayload.label || "Hubungi";

          if (ctaPayload.id) btn.id = ctaPayload.id;

          this.bindNavigation(btn, btn.href);
          el.appendChild(btn);
        }

        for (const item in payload) {
          if (!Object.hasOwn(payload, item)) continue;
          const pItem = payload[item];
          const i = this.render("@menu>navigations>item", pItem) as HTMLElement;
          el.appendChild(i);
        }

        break;

      case ("@menu>hamburger"):
        if (props.tagName?.toLowerCase() === "button") (el as HTMLButtonElement).type = "button";
        if (!el.innerHTML) {
          el.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>';
        }
        break;


    }
  }

  public navigate(href?: string): void {
    if (href) window.location.hash = href.replace(/^#/, "");
  }

  protected bindNavigation(element: HTMLAnchorElement, href?: string): void {
    let rawTargetHref = (href || element.getAttribute("href") || this.config.defaultRoute || "home").trim();
    if (rawTargetHref.includes(window.location.origin) || rawTargetHref.includes(window.location.host)) {
      if (rawTargetHref.includes("#")) {
        rawTargetHref = rawTargetHref.split("#").filter(Boolean).filter(part => !part.includes("://") && !part.includes("localhost") && !part.includes(".com")).join("#").trim();
      }
    } element.href = rawTargetHref.startsWith("#") ? rawTargetHref : `#${rawTargetHref}`;

    element.addEventListener("click", (e: MouseEvent) => {
      e.preventDefault();
      if (!rawTargetHref.includes("://") && !rawTargetHref.startsWith("//") && !rawTargetHref.startsWith("www.")) {
        let cleanRoute: string = String(rawTargetHref).replace(/^#/, "").trim();
        if (cleanRoute.includes(":")) cleanRoute = String(cleanRoute.split(":")[0]).trim();
        if (cleanRoute.includes("?")) cleanRoute = String(cleanRoute.split("?")[0]).trim();
        const finalRouteString = cleanRoute || "home";

        const handled = this.config.onNavigate(finalRouteString);
        if (handled === true) return; this.navigate(finalRouteString);
      } else {
        window.open(rawTargetHref, "_blank");
      }
    });
  }
}


