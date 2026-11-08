
import type { iElementProperty, iBasicNode, iBuilderConfig } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base/Base";


export const ELEMENT_KEYS = [
  "@container",
  "@menu",
  "@menu>brand",
  "@menu>hamburger",
  "@menu>navigations",
  "@menu>navigations>item",
  "@menu>actions",
  "@menu>item>link",
  "@menu>item>icon",
] as const;

export type MenuElementType = (typeof ELEMENT_KEYS)[number];

export const DEFAULT_MENU_SELECTORS: Record<MenuElementType, iElementProperty> = {
  "@container": { tagName: "aside", className: "sidebar" },
  "@menu": { tagName: "nav", className: "nav" },
  "@menu>brand": { tagName: "div", className: "brand", attrs: { src: "" } },
  "@menu>hamburger": { tagName: "button", className: "hamburger-btn", attrs: { "aria-label": "Toggle menu" } },
  "@menu>navigations": { tagName: "ul", className: "navigations" },
  "@menu>navigations>item": { tagName: "li", className: "item" },
  "@menu>actions": { tagName: "div", className: "actions" },
  "@menu>item>link": { tagName: "a" },
  "@menu>item>icon": { tagName: "i", className: "icon" },
};

export interface iMenuConfig extends iBuilderConfig<MenuElementType> {
  /** 
   * TOTAL EXTRACTED SELECTORS (Semua elemen diekstrak utuh ke sini!)
   */
  type: "top" | "sidebar"
  selectors: Record<MenuElementType, iElementProperty>;

  /** Default route */
  defaultRoute?: string;
  /** Default route */
  themeId?: string;

  /** Valid application routes */
  routes?: string[];

  onNavigate?: (href?: string) => boolean
}

export interface iMenuSplit {
  brand: iElementProperty;
  navigations: iElementProperty[];
  actions: iElementProperty[];
}

/**
 * Split one flat navigation list into three sections.
 *
 * The source data is linear (a header row plus links plus a CTA), so the split is a
 * convention rather than a structure:
 *
 * - the **first** entry is the brand,
 * - an entry whose `className` is `button`, or whose `href` is a `tel:` link, is an action,
 * - everything else is a navigation link.
 *
 * Exported and pure so the rule is testable without a DOM.
 */
export function splitMenuContent(content: any): iMenuSplit {
  const navigations: iElementProperty[] = Array.isArray(content?.navigations)
    ? content.navigations
    : content?.navigations
      ? [content.navigations]
      : [];

  const brand = navigations[0] ?? { label: "Brand", href: "#home" };
  const rest = navigations.slice(1);

  const isAction = (link: iElementProperty): boolean =>
    link?.className === "button" || Boolean(link?.href?.includes("tel:"));

  const actions = Array.isArray(content?.actions)
    ? [...content.actions]
    : content?.actions
      ? [content.actions]
      : [];

  const cta = rest.find(isAction);
  // The CTA may already be listed under `actions`; adding it twice was the old behaviour.
  if (cta && !actions.includes(cta)) actions.push(cta);

  return { brand, navigations: rest.filter((link) => !isAction(link)), actions };
}

export class MenuBuilder extends Builder<MenuElementType, iMenuConfig> {
  readonly builderId = "menu";
  readonly name = "menu";
  readonly stylesheet = "./Menu.css";

  protected isMenuOpened: boolean = false;

  constructor(config: Partial<iMenuConfig> = {}) {
    super(); // Wajib mengetuk pintu rahim induk BuilderBase

    const defaultSelectors = DEFAULT_MENU_SELECTORS;

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
    // Accepts `{ content: { navigations } }` and `{ navigations }`: the registry unwraps
    // `node.content`, but a manifest `schema` hands the whole record over.
    const source: any = (content as any)?.content ?? content;
    const payload = this.resolvePayload(source);

    const nav = this.render("@menu", payload["@menu"])!;
    const brand = this.render("@menu>brand", payload["@menu>brand"]);
    const hamburger = this.render("@menu>hamburger", payload["@menu>hamburger"]);
    const navigations = this.render("@menu>navigations", payload["@menu>navigations"]);
    const actions = this.render("@menu>actions", payload["@menu>actions"]);

    if (brand) nav.appendChild(brand);
    if (hamburger) nav.appendChild(hamburger);
    if (navigations) {
      // The toggle needs a target to point at, and both sides must agree on the id.
      navigations.id = "primary-navigations";
      nav.appendChild(navigations);
      hamburger?.setAttribute("aria-controls", navigations.id);
    }
    if (actions) nav.appendChild(actions);

    // `type` decides the shell, not the content: a sidebar is the same nav in a wrapper.
    if (this.config.type === "sidebar") {
      nav.classList.add("vertical");
      const sidebar = this.render("@container", source)!;
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
  protected resolvePayload(content: iBasicNode): Record<MenuElementType, any> {
    const { brand, navigations, actions } = splitMenuContent(content);

    return {
      "@menu": content,
      "@menu>brand": brand,
      "@menu>hamburger": {},
      "@menu>navigations": navigations,
      "@menu>navigations>item": null,
      "@menu>actions": actions,
    } as Record<MenuElementType, any>;
  }

  public initialize(root?: HTMLElement): void {
    const nav = root ?? (this.load("@menu") as HTMLElement);
    if (!nav) return;

    const hamburger = nav.querySelector(".hamburger-btn") as HTMLButtonElement | null;
    const navigations = nav.querySelector(".navigations") as HTMLElement | null;

    // A menu without a toggle is a valid menu (desktop-only, or a sidebar). No warning.
    if (!hamburger || !navigations) return;

    this.hamburger = hamburger;
    this.navigations = navigations;

    hamburger.removeEventListener("click", this.handleToggle);
    hamburger.addEventListener("click", this.handleToggle);

    // Reflect the current state on first paint, so `aria-expanded` is never a lie.
    this.setOpen(this.isMenuOpened);
  }

  private hamburger: HTMLButtonElement | null = null;
  private navigations: HTMLElement | null = null;

  private handleToggle = (): void => {
    this.isMenuOpened = !this.isMenuOpened;

    let isDefaultPrevented = false;
    this.config.emit?.("builder:menu-toggle" as any, {
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

  private setOpen(open: boolean): void {
    this.navigations?.classList.toggle("open", open);
    this.hamburger?.classList.toggle("active", open);
    this.hamburger?.setAttribute("aria-expanded", open ? "true" : "false");
  }

  // ====================================================
  // 🧙‍♂️ OVERRIDE 2: PERAKIT STRUKTUR CONTENT DEFAULT FALLBACK KOMPONEN MENU
  // ====================================================
  protected template(typeKey: MenuElementType, el: HTMLElement, payload: any, props: iElementProperty): void {
    // if (!payload) return;

    switch (typeKey) {
      case "@container":
        // console.log({ payload })
        if (payload.id) el.id = payload.id;
        break;

      case "@menu":

        break;

      case "@menu>brand":
        // The brand is a link like any other: one key, no bespoke anchor.
        const brandLink = this.render("@menu>item>link", payload);
        if (brandLink) el.appendChild(brandLink);
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
        } else if (payload?.label) {
          el.textContent = payload.label;
        }

        if (payload?.icon) {
          const icon = this.render("@menu>item>icon", payload.icon) as HTMLElement;
          el.appendChild(icon);
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
      }

      case "@menu>item>icon":
        // console.log({ el, payload })
        el.className = payload;
        break;

      case "@menu>actions": {
        // One link per action, flat: `div.actions` is not a list, so nesting `li` in it
        // (the previous behaviour) produced invalid markup and duplicated the CTA.
        const actions: iElementProperty[] = Array.isArray(payload) ? payload : [];
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
        if (props.tagName?.toLowerCase() === "button") (el as HTMLButtonElement).type = "button";
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


