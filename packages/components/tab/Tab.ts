import type { iBasicNode, iBuilderConfig, iBuilderRegistry } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base/Base";
// import "./Tab.css";

export type TabElementType =
  | "@container"
  | "@tab"
  | "@tab>menu"
  | "@tab>menu>item"
  | "@tab>menu>item>label"
  | "@tab>menu>item>title"
  | "@tab>body"
  | "@tab>panel"
  | "@tab>panel>content"
  | "@tab>panel>content>eyebrow"
  | "@tab>panel>content>title"
  | "@tab>panel>content>desc"
  | "@tab>footer"
  | "@tab>spinner";

export interface iTabConfig extends iBuilderConfig<TabElementType> {
  container?: string | HTMLElement | null;
  menuPosition: "top" | "left" | "bottom" | "right";
  lazyload: boolean;
  name: string;
  minHeight: string;
  /** 💣 Saat `true`, isi panel tab sebelumnya dihancurkan (diganti kosong) begitu pengguna
   *  berpindah ke tab lain — memaksa konten dimuat ulang segar saat kembali ke tab itu. */
  destroyPrevious: boolean;
}


export type iTabMenuProperty = { label: string; title: string; link?: string; id?: string, className?: string } | iBasicNode;
export type iTabItemContent = { title?: string; eyebrow?: string; description?: string; } | iBasicNode;
export type iTabItemProperty = { id?: string; className?: string; content: iTabItemContent } | HTMLElement;
export type iTabFooterProperty = { id?: string; className?: string; text: string };

export interface iTabContent {
  menu?: HTMLElement[] | iTabMenuProperty[] | null;
  body: iTabItemProperty[] | HTMLElement[];
  footer?: HTMLElement | iTabFooterProperty | null;
}

export class TabBuilder extends Builder<TabElementType, iTabConfig> {
  builderId: keyof iBuilderRegistry = "tab";
  readonly name: keyof iBuilderRegistry = "tab";
  readonly stylesheet: string = "./Tab.css";

  // ENKAPSULASI: Menyimpan data body tab secara aman & terisolasi
  #items: iTabItemProperty[] = [];

  // STATE MANAGEMENT INTERNAL
  private currentTabIndex = 0;

  private _listenersTabChanged: ((detail: { index: number; label: string; title: string }) => void)[] = [];
  private _listenersContentLoaded: ((detail: { index: number; element: HTMLElement }) => void)[] = [];
  private _boundKeyDownHandler?: (e: KeyboardEvent) => void;

  constructor(config: Partial<iTabConfig> = {}) {
    super();

    const defaultTabSelectors = {
      "@container": { tagName: "div", className: "tab-widget-wrapper" },
      "@tab": { tagName: "div", className: "tab" },
      "@tab>menu": { tagName: "div", className: "menu" },
      "@tab>menu>item": { tagName: "button", className: "button" },
      "@tab>menu>item>label": { tagName: "span", className: "btn-label" },
      "@tab>menu>item>title": { tagName: "span", className: "btn-title" },
      "@tab>body": { tagName: "div", className: "body" },
      "@tab>panel": { tagName: "div", className: "panel hidden" },
      "@tab>panel>content": { tagName: "div", className: "content" },
      "@tab>panel>content>eyebrow": { tagName: "span", className: "eyebrow" },
      "@tab>panel>content>title": { tagName: "h3", className: "title" },
      "@tab>panel>content>desc": { tagName: "p", className: "desc" },
      "@tab>footer": { tagName: "div", className: "footer" },
      "@tab>spinner": { tagName: "div", className: "spinner hidden" }
    };

    const defaultConfig: Required<iTabConfig> = {
      themeId: "default",
      container: null,
      menuPosition: "top",
      lazyload: true,
      name: "tab-" + Math.random().toString(36).substring(7),
      minHeight: "400px",
      destroyPrevious: false,
      selectors: defaultTabSelectors,
      namespace: null,
      emit: () => { }
    };

    this.config = this.resolveConfig(defaultConfig, config);
  }

  // SETTER PUSAT: Mengamankan data dari manipulasi pihak ketiga
  private set items(newItems: iTabItemProperty[]) {
    if (!Array.isArray(newItems)) {
      console.error("TabBuilder validation failed: Items must be an array.");
      return;
    }
    this.#items = newItems.map(item => {
      if (item instanceof HTMLElement) return item; //<= THE FIX
      return Object.freeze({ ...item })
    });
  }

  /** Local DOM lookup for the tab root. Named `tabRoot` because `rootElement`
   *  is already the slot-host field declared by `Builder`. */
  private get tabRoot(): HTMLElement { return this.load("@tab") as HTMLElement; }
  // private get footerElement(): HTMLElement | null { return this.load("@tab>footer") as HTMLElement; }

  public prepare(data: any, _config?: Partial<iTabConfig>): HTMLElement {
    if (_config) this.config = this.resolveConfig(this.config, _config);

    const content: iTabContent = data?.content || data || { body: [] };

    this.items = content.body || [];
    this.currentTabIndex = 0;

    return this.render("@tab", content) as HTMLElement;
  }

  protected template(typeKey: TabElementType, el: HTMLElement, payload?: any): void {
    switch (typeKey) {
      case "@tab": {
        el.className = `tab position-${this.config.menuPosition} ${el.className || ""}`.trim();
        el.style.minHeight = this.config.minHeight;

        if (this.config.container instanceof HTMLElement) {
          el.id = this.config.container.id || el.id;
        }

        const fragment = document.createDocumentFragment();

        const spinner = this.render("@tab>spinner", null);
        if (spinner) fragment.appendChild(spinner);

        let menuElement: HTMLElement | null = null;
        if (payload.menu && Array.isArray(payload.menu)) {
          menuElement = this.render("@tab>menu", payload.menu) as HTMLElement;
        }

        const bodyElement = this.render("@tab>body", this.#items) as HTMLElement;

        let footerElement: HTMLElement | null = null;
        if (payload.footer) {
          footerElement = this.render("@tab>footer", payload.footer) as HTMLElement;
        }

        if (this.config.menuPosition === "bottom") {
          fragment.appendChild(bodyElement);
          if (menuElement) fragment.appendChild(menuElement);
        } else {
          if (menuElement) fragment.appendChild(menuElement);
          fragment.appendChild(bodyElement);
        }

        if (footerElement) {
          fragment.appendChild(footerElement);
        }

        el.appendChild(fragment);
        break;
      }

      case "@tab>menu": {
        el.setAttribute("role", "tablist");
        el.setAttribute("aria-label", "Tab Navigation");

        payload.forEach((meta: any, idx: number) => {
          if (meta instanceof HTMLElement) {
            el.appendChild(meta);
            return;
          }

          const btn = this.render("@tab>menu>item", { meta, idx }) as HTMLElement;
          const isLink = typeof meta === "object" && meta !== null && !!meta.link;

          if (isLink) {
            const a = document.createElement("a");
            a.className = btn.className;
            if (btn.id) a.id = btn.id;
            a.href = meta.link;

            while (btn.firstChild) a.appendChild(btn.firstChild);

            Array.from(btn.attributes).forEach(attr => {
              if (attr.name !== 'class' && attr.name !== 'id') {
                a.setAttribute(attr.name, attr.value);
              }
            });
            a.onclick = btn.onclick;

            el.appendChild(a);
          } else {
            el.appendChild(btn);
          }
        });
        break;
      }

      case "@tab>menu>item": {
        const { meta, idx } = payload;
        const rootId = this.tabRoot?.id || 'gen';

        el.setAttribute("role", "tab");
        el.setAttribute("aria-selected", "false");
        el.setAttribute("tabindex", "-1");
        el.setAttribute("aria-controls", `tabpanel-${rootId}-${idx}`);
        if (!meta.id) el.id = `tabbtn-${rootId}-${idx}`;

        const spanLabel = this.render("@tab>menu>item>label", meta)!;
        const spanTitle = this.render("@tab>menu>item>title", meta)!;

        el.append(spanLabel, spanTitle);

        if (meta.className) el.classList.add(...meta.className.split(" "));

        const isLink = typeof meta === "object" && meta !== null && !!meta.link;
        el.onclick = (e) => {
          if (!isLink) e.preventDefault();
          this.navigateTo(idx);
        };
        break;
      }

      case "@tab>menu>item>label":
        el.textContent = typeof payload === "string" ? payload : (!payload.value ? payload?.label : payload.value) || "";
        break;

      case "@tab>menu>item>title":
        el.title = typeof payload === "string" ? payload : (!payload.value ? payload?.label : payload.value) || "";
        break;

      case "@tab>body": {
        payload.forEach((item: any, idx: number) => {
          const panel = this.render("@tab>panel", { item, idx }) as HTMLElement;
          el.appendChild(panel);
        });
        break;
      }

      case "@tab>panel": {
        const { item, idx } = payload;
        const rootId = this.tabRoot?.id || 'gen';

        el.setAttribute("role", "tabpanel");
        el.setAttribute("aria-labelledby", `tabbtn-${rootId}-${idx}`);

        if (item?.id) el.id = item.id;
        else el.id = `tabpanel-${rootId}-${idx}`;

        if (item?.className) el.className = `${el.className} ${item.className}`.trim();

        el.classList.add("hidden");
        el.style.display = "none";

        if (!this.config.lazyload) {
          this._renderPanelContent(el, item, idx);
        }
        break;
      }

      case "@tab>panel>content": {
        if (payload.eyebrow) {
          const span = this.render("@tab>panel>content>eyebrow", payload)!;
          el.appendChild(span);
        }
        if (payload.title) {
          const h3 = this.render("@tab>panel>content>title", payload)!;
          el.appendChild(h3);
        }
        if (payload.description) {
          const p = this.render("@tab>panel>content>desc", payload)!;
          el.appendChild(p);
        }
        break;
      }

      case "@tab>panel>content>eyebrow":
        el.textContent = payload?.eyebrow || "";
        break;

      case "@tab>panel>content>title":
        el.textContent = payload?.title || "";
        break;

      case "@tab>panel>content>desc":
        el.textContent = payload?.description || "";
        break;

      case "@tab>footer":
        if (payload?.id) el.id = payload.id;
        if (payload?.className) el.className = `${el.className} ${payload.className}`.trim();
        el.textContent = payload?.text || "";
        break;
    }
  }


  public initialize(): void {
    const menuElement = this.load("@tab>menu") as HTMLElement;

    if (menuElement) {
      this._boundKeyDownHandler = (e: KeyboardEvent) => this._handleKeyDown(e);
      menuElement.addEventListener("keydown", this._boundKeyDownHandler);
    }

    // Jalankan navigasi awal ke indeks 0 secara otomatis tanpa merusak sirkuit
    this.navigateTo(0);
    // console.log("[Tabs v2] Dynamic accessibility tab list initialized successfully.");
  }

  /**
   * Mengisi dan merender konten item ke dalam tab panel fisik
   */
  private _renderPanelContent(panel: HTMLElement, item: any, index: number): void {
    if (panel.dataset.loaded === "true") return;

    const content = item?.content ? item.content : item;

    if (content instanceof HTMLElement) {
      panel.append(content);
    } else {
      const contentWrapper = this.render("@tab>panel>content", content) as HTMLElement;
      panel.appendChild(contentWrapper);
    }

    panel.dataset.loaded = "true";
    this.config.emit?.("tabs:content-loaded" as any, { index, element: panel });
  }

  public navigateTo(target: number | string): void {
    let targetIndex = -1;

    // A. Skenario Jalur Indeks Angka (Direct Index Targetting)
    if (typeof target === "number") {
      targetIndex = target;
    }
    // B. Skenario Jalur String ID (Custom Identity Targetting)
    else {
      // 🧙‍♂️ DIRECT MEMORY ACCESIBILITY: Jepret seluruh barisan tombol secara instan dari saku RAM!
      const buttons = this.load("@tab>menu")?.querySelectorAll("button")!;
      for (let i = 0; i < buttons.length; i++) {
        if (buttons[i].id === target) {
          targetIndex = i;
          break;
        }
      }
    }

    // Gerbang Pengaman: Cegah eksekusi jika nomor indeks melompat di luar pagar batas array
    if (targetIndex < 0 || targetIndex >= this.#items.length) return;

    // Nyalakan boks spinner pemuat internal sesaat sebelum perpindahan wajah halaman dimulai
    const spinner = this.load("@tab>spinner") as HTMLElement;
    if (spinner) spinner.classList.remove("hidden");

    // Tembakkan eksekutor mutasi visual tunggal
    this._handleChange(targetIndex);

    // Berikan jeda mikro yang estetik agar efek transisi visual terasa sehalus sutra
    setTimeout(() => {
      if (spinner) spinner.classList.add("hidden");
    }, 150);
  }

  private _handleChange(index: number): void {
    // Jemput seluruh pasukan elemen hidup secara adil dan bersih menggunakan tanda "all"
    const buttons = this.load("@tab>menu")?.querySelectorAll("button")!;
    const panels = this.load("@tab>body")?.querySelectorAll(".panel")!;

    // ====================================================
    // 🫗 FASE 1: LIKUIDASI KONDISI AKTIF PADA TAB SEBELUMNYA
    // ====================================================
    if (buttons[this.currentTabIndex]) {
      const prevBtn = buttons[this.currentTabIndex];
      prevBtn.classList.remove("active"); // Gunakan standard token kelas active v2 Anda
      prevBtn.setAttribute("aria-selected", "false");
      prevBtn.setAttribute("tabindex", "-1");
    }

    if (panels[this.currentTabIndex]) {
      const prevPanel = panels[this.currentTabIndex] as HTMLElement;
      // 💣 destroyPrevious: Hancurkan isi panel sebelumnya begitu ditinggalkan,
      // lalu reset penanda `loaded` agar konten dimuat ulang segar saat kembali nanti.
      if (this.config.destroyPrevious) {
        prevPanel.replaceChildren();
        prevPanel.dataset.loaded = "false";
      }
      prevPanel.classList.add("hidden");
      (prevPanel as HTMLElement).style.display = "none";
    }

    // ====================================================
    // 🌟 FASE 2: DETONASI NYALA PADA TAB BARU TUJUAN USER
    // ====================================================
    this.currentTabIndex = index;

    if (buttons[index]) {
      const activeBtn = buttons[index];
      activeBtn.classList.add("active");
      activeBtn.setAttribute("aria-selected", "true");
      activeBtn.setAttribute("tabindex", "0");

      // Fokuskan mata kursor jika user sedang menggunakan navigasi keyboard arrow keys
      if (document.activeElement && document.activeElement.parentElement === activeBtn.parentElement) {
        activeBtn.focus();
      }
    }

    if (panels[index]) {
      const activePanel = panels[index];

      // 🔮 LAZY-LOAD HYDRATION TRIGGER: Gambar isi rahim konten murni HANYA sesaat sebelum dibuka!
      if (this.config.lazyload) {
        this._renderPanelContent(activePanel as HTMLElement, this.#items[index], index);
      }

      activePanel.classList.remove("hidden");
      (activePanel as HTMLElement).style.display = "block";
    }

    // ====================================================
    // 📢 FASE 3: PIPELINE EMITTER GLOBAL KAYA INFORMASI
    // Semburkan event ke level luar lengkap dengan teks label dan judul tombolnya!
    // EMIT TIDAK LAGI DIGATE OLEH `buttons[index]`: pada inisialisasi awal
    // (navigateTo(0) dari initialize) menu bisa belum queryable/detached, sehingga
    // event tab:changed harus tetap dikirim agar listener init ikut menerimanya.
    // ====================================================
    if (this.config.emit && typeof this.config.emit === "function") {
      this.config.emit?.("elementChanged" as any, {
        builder: this.builderId,
        type: "tab:changed",
        data: { index, name: this.config.name },
        element: panels[index] || null
      });
    }
  }

  private _handleKeyDown(e: KeyboardEvent): void {
    const buttons = this.load("@tab>menu")?.querySelectorAll("button")!;
    if (!buttons || !buttons.length) return;
    let nextIndex = this.currentTabIndex;
    const isHorizontal = this.config.menuPosition === "top" || this.config.menuPosition === "bottom";
    if (isHorizontal) {
      if (e.key === "ArrowRight") nextIndex = (this.currentTabIndex + 1) % buttons.length;
      else if (e.key === "ArrowLeft") nextIndex = (this.currentTabIndex - 1 + buttons.length) % buttons.length;
      else if (e.key === "Home") nextIndex = 0; else if (e.key === "End") nextIndex = buttons.length - 1;
      else return; // Abaikan tombol keyboard lain
    } else {
      // Kondisi orientasi menu vertikal (left / right)
      if (e.key === "ArrowDown") nextIndex = (this.currentTabIndex + 1) % buttons.length;
      else if (e.key === "ArrowUp") nextIndex = (this.currentTabIndex - 1 + buttons.length) % buttons.length;
      else if (e.key === "Home") nextIndex = 0; else if (e.key === "End") nextIndex = buttons.length - 1;
      else return;
    }
    e.preventDefault();
    this.navigateTo(nextIndex);
    // Paksa fokus keyboard melompat ke elemen tombol aktif yang baru
    (buttons[nextIndex] as HTMLElement).focus();
  }

  public onTabChanged(callback: (detail: { index: number; label: string; title: string }) => void): void {
    if (typeof callback === "function") this._listenersTabChanged.push(callback);
  }

  public onContentLoaded(callback: (detail: { index: number; element: HTMLElement }) => void): void {
    if (typeof callback === "function") this._listenersContentLoaded.push(callback);
  }

  public unmount(): void {
    const menuElement = this.load("@tab>menu") as HTMLElement;
    if (menuElement && this._boundKeyDownHandler) {
      menuElement.removeEventListener("keydown", this._boundKeyDownHandler);
    }
    this.destroy(); // Likuidasi total RAM dari rahim Map privat!
  }

}
