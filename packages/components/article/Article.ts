import type { iElementProperty, iBuilderConfig, iBuilderRegistry } from "@aio-ui/core/interface";
import { createImageError } from "@aio-ui/utilities/DomUtils";

import { Builder } from "@aio-ui/base";
import { Skeleton } from "@aio-ui/skeleton";

export type ArticleElementType =
  | "@container"
  | "@article>list"
  | "@article>pagination"

  | "@article>figure"
  | "@article>header"
  | "@article>header>title"
  | "@article>header>meta"


  | "@article>item"
  | "@article>item>caption"

  | "@article>aside"
  | "@article>aside>title"
  | "@article>aside>block"
  | "@article>aside>item"

  | "@article>controls"
  | "@article>controls>back"
  | "@article>controls>next"
  | "@article>controls>pagination"
  | "@article>controls>pagination>item"
  | "@article>controls>filter"
  | "@article>controls>view"

  | "@article>detail"
  | "@article>detail>header"
  | "@article>detail>body"
  ;

export interface iArticleViewSpec {
  view: string;
  display?: "list" | "card";
  count?: number;
  props?: Record<string, unknown>;
}

export interface iArticleConfig extends iBuilderConfig<ArticleElementType> {
  /**
   * Navigation **intent** only. The builder never touches the URL: the host (or the
   * shell's router) decides what a slug means, which is what keeps a deep link, a modal
   * preview and an iframe on the same component.
   */
  navigate?: (slug: string) => void;
  /** Which parts this composition renders. Order is the render order. */
  views?: iArticleViewSpec[];
  /** Record to open in the detail view on the first paint — a deep link, not state. */
  initialSlug?: string;
  /** Force the first paint to a view. Defaults to the list, unless `initialSlug` is set. */
  initialView?: "list" | "detail";
  view?: "list" | "card";
  position?: "left" | "right";
  recommendation?: number | boolean;
  items?: number;
}

/**
 * The DOM only carries the record's key; the component keeps the record itself.
 * Attaching objects to elements (`el._payload`) works until the node is cloned or
 * replaced, and then the data is silently gone.
 */
function stampArticleId(el: HTMLElement, payload: any): void {
  const id = payload?.slug ?? payload?.uid;
  if (id !== undefined && id !== null) el.dataset.articleId = String(id);
}

export class ArticleBuilder extends Builder<ArticleElementType, iArticleConfig> {
  readonly builderId: keyof iBuilderRegistry = "article";
  readonly name: keyof iBuilderRegistry = "article";
  stylesheet: string = "./Article.css";

  // State internal modul
  private currentRawServerResponse: any = null;
  private viewSpecs: iArticleViewSpec[] = [];
  /** Simpan list view saat detail aktif, agar bisa dikembalikan via tombol back. */
  private listElement: HTMLElement | null = null;
  /** Records by id (`slug`/`uid`), so cards only carry a key. */
  private records = new Map<string, any>();

  /**
   * 🪶 LOADING MOCKUP — a cover, a headline, a meta row and body lines, drawn with the
   * mandatory `@aio-ui/skeleton` primitive. `Article.css` decides whether the real box is a
   * list or a detail; both start with the same top-to-bottom rhythm.
   */
  protected loading(): HTMLElement {
    return Skeleton.create({
      shape: "stack",
      children: [
        { shape: "bone", aspect: "16 / 9" },
        { shape: "line", width: "55%" },
        {
          shape: "row",
          gap: "0.5rem",
          children: [
            { shape: "circle", width: "1.5rem" },
            { shape: "line", width: "30%" },
          ],
        },
        { shape: "line", count: 3 },
      ],
    });
  }

  constructor(config: Partial<iArticleConfig> = {}) {
    super();
    const defaultSelectors: Record<ArticleElementType, iElementProperty> = {
      "@container": { tagName: "section", className: "article" },
      "@article>list": { tagName: "div", className: "row" },
      "@article>pagination": { tagName: "div", className: "pagination" },
      "@article>figure": { tagName: "figure", className: "media" },
      "@article>header": { tagName: "header", className: "item" },
      "@article>header>title": { tagName: "h3", className: "title" },
      "@article>header>meta": { tagName: "div", className: "meta" },

      "@article>item": { tagName: "article", className: "item" },
      "@article>item>caption": { tagName: "p", className: "caption" },

      "@article>aside": { tagName: "aside", className: "aside" },
      "@article>aside>block": { tagName: "div", className: "block recommendations" },
      "@article>aside>title": { tagName: "button", className: "title" },
      "@article>aside>item": { tagName: "a", className: "item" },

      "@article>controls": { tagName: "div", className: "controls" },
      "@article>controls>back": { tagName: "button", className: "back" },
      "@article>controls>next": { tagName: "button", className: "next" },
      "@article>controls>pagination": { tagName: "div", className: "pagination" },
      "@article>controls>pagination>item": { tagName: "button", className: "item" },
      "@article>controls>filter": { tagName: "h2", className: "filter" },
      "@article>controls>view": { tagName: "button", className: "view" },

      "@article>detail": { tagName: "article", className: "detail" },
      "@article>detail>header": { tagName: "header", className: "header" },
      "@article>detail>body": { tagName: "div", className: "body" },
    };

    const defaultConfig: Required<iArticleConfig> = {
      themeId: "default",
      selectors: defaultSelectors,
      namespace: null,
      views: [],
      initialSlug: "",
      initialView: "list",
      view: "card",
      position: "right",
      recommendation: 5,
      items: 5,
      navigate: () => { },
      emit: () => { },
    };

    this.config = this.resolveConfig(defaultConfig, config);
    const declaredViews = this.config.views ?? [];

    this.viewSpecs = declaredViews.length ? declaredViews : [
      { view: "controls" },
      { view: "list", display: "card" },
      { view: "aside", count: this.config.items ?? 5 },
    ];
  }

  /**
   * 👑 COMPOSITION — membangun kontainer modul dan seluruh slot:
   * controls (back + pagination) → list grid (item[]) → aside (rekomendasi).
   * Interaksi terpasang via bindInteractions().
   */
  public prepare(content: any, _config?: Required<iArticleConfig>): HTMLElement {
    this.currentRawServerResponse = content?.content || content || {};

    // Fresh render pass: forget the previous list and record index.
    this.listElement = null;
    this.records.clear();

    const container = this.render("@container", this.currentRawServerResponse) as HTMLElement;
    const records: any[] = Array.isArray(this.currentRawServerResponse?.data) ? this.currentRawServerResponse.data : [];

    // Cards carry an id, not a payload: the component keeps the data, the DOM keeps a key.
    records.forEach((article, index) => {
      const id = String(article?.slug ?? article?.uid ?? index);
      this.records.set(id, article);
    });

    const viewFor = (role: string): boolean =>
      this.viewSpecs.length === 0 || this.viewSpecs.some((s) => s.view === role);

    // ── 1. CONTROLS (back + pagination HATEOAS) ───────────────────────────
    if (viewFor("controls")) {
      const controls = this.render("@article>controls", this.currentRawServerResponse) as HTMLElement | undefined;
      if (controls) {
        controls.dataset.view = "controls";
        const back = this.render("@article>controls>back", { label: "Kembali" }) as HTMLElement | undefined;
        if (back) {
          back.dataset.view = "back";
          controls.appendChild(back);
        }
        const pagination = this.render("@article>controls>pagination", this.currentRawServerResponse) as HTMLElement | undefined;
        if (pagination) {
          pagination.dataset.view = "pagination";
          controls.appendChild(pagination);
        }
        container.appendChild(controls);
      }
    }

    // ── 2. LIST — grid kartu artikel dari data[] ──────────────────────────
    if (viewFor("list")) {
      const grid = this.render("@article>list", this.currentRawServerResponse) as HTMLElement | undefined;
      if (grid) {
        grid.dataset.view = "list";
        grid.dataset.display = this.config.view || "card";

        records.forEach((article: any) => {
          const item = this.render("@article>item", article) as HTMLElement | undefined;
          if (!item) return;
          grid.appendChild(item);
        });

        container.appendChild(grid);
      }
    }

    // ── 3. ASIDE — rekomendasi dari data[] ────────────────────────────────
    if (this.config.recommendation && Array.isArray(this.currentRawServerResponse?.data)) {
      const aside = this.render("@article>aside", this.currentRawServerResponse) as HTMLElement | undefined;
      if (aside) {
        aside.dataset.view = "aside";
        container.appendChild(aside);
      }
    }

    // ── 4. FIRST VIEW — a deep link is a config, not internal state ───────
    // `#article/<slug>` re-renders the whole route, so the record has to be openable by
    // slug on the first paint. Navigating here would loop back into the host; the host
    // already knows its own URL.
    if (this.config.initialView === "detail" && this.config.initialSlug) {
      const record = this.records.get(String(this.config.initialSlug));
      if (record) this.showDetail(container, record, { navigate: false });
    }

    return container;
  }

  // =====================================================================
  // 🎮 INTERAKSI TERPUSAT — satu delegation di container modul.
  // Dipasang dari initialize(): create() memanggilnya setelah prepare()
  // selesai dan tree terpasang, jadi listener bisa dilepas kembali.
  // =====================================================================

  private handleClick = (event: Event): void => {
    const container = event.currentTarget as HTMLElement;
    const target = event.target as HTMLElement;

    // A. Klik kartu artikel (list) atau item rekomendasi (aside) → detail
    const card = target.closest("[data-article-id]") as HTMLElement | null;
    if (card) {
      const record = this.records.get(String(card.dataset.articleId));
      if (record) {
        this.showDetail(container, record);
        return;
      }
    }

    // B. Klik tombol kembali → tampilkan kembali list view
    if (target.closest('[data-view="back"], button.back')) {
      this.showList(container);
      return;
    }

    // C. Klik tombol pagination HATEOAS → emit elementChanged
    const pageBtn = target.closest(".pagination .item") as HTMLElement | null;
    if (pageBtn && pageBtn.dataset.url) {
      this.config.emit?.("elementChanged", {
        builder: this.builderId,
        type: "@article>pagination",
        element: pageBtn,
        data: { endpoint: pageBtn.dataset.url, module: this },
      } as any);
    }
  };

  /** Tampilkan view detail untuk satu artikel (menggantikan list atau detail aktif). */
  /**
   * Show the detail view for one record.
   *
   * @param container - The composition root that hosts the views.
   * @param article - Record to show.
   * @param options - `navigate: false` when the host already knows this record (first
   *   paint of a deep link): announcing a navigation there would send the host back to
   *   the URL it just rendered from.
   */
  private showDetail(container: HTMLElement, article: any = null, options: { navigate?: boolean } = {}): void {
    if (!article) return;
    const announce = options.navigate !== false;

    const currentDetail = container.querySelector("article.detail") as HTMLElement | null;

    if (!currentDetail) {
      const grid = container.querySelector('[data-view="list"]') as HTMLElement | null;
      if (!grid) return;
      // Simpan list view agar bisa dikembalikan persis apa adanya.
      this.listElement = grid;
    }

    const detail = this.render("@article>detail", article) as HTMLElement;
    if (!detail) return;
    detail.dataset.view = "detail";

    // Navigasi melalui config.navigate atau emit: shell yang mengeksekusi routing,
    // bukan builder yang menyentuh URL.
    if (article.slug && announce) {
      if (typeof this.config.navigate === "function") {
        this.config.navigate(article.slug);
      }
      this.config.emit?.("elementChanged", {
        builder: this.builderId,
        type: "@article>detail",
        element: detail,
        data: { slug: article.slug, article },
      } as any);
    }

    if (currentDetail) currentDetail.replaceWith(detail); // detail → detail
    else this.listElement!.replaceWith(detail);           // list → detail
  }

  /** Kembalikan ke list view. */
  private showList(container: HTMLElement): void {
    if (!this.listElement) return;
    const detail = container.querySelector("article.detail");
    if (detail) detail.replaceWith(this.listElement);

    if (typeof this.config.navigate === "function") {
      this.config.navigate("");
    }
    this.config.emit?.("elementChanged", {
      builder: this.builderId,
      type: "@article>list",
      element: this.listElement,
      data: { back: true },
    } as any);

    this.listElement = null;
  }

  protected template(typeKey: ArticleElementType, el: HTMLElement, payload?: any, _props?: iElementProperty): void {
    switch (typeKey) {
      case "@container":

        break;
      case "@article>figure":
        const image = document.createElement("img");
        image.src = encodeURI(payload);
        image.onerror = (_e: any) => {
          image.src = createImageError();
        };
        el.appendChild(image);

        break;

      case "@article>header":
        const titleX = this.render("@article>header>title", payload.title);
        if (titleX) el.appendChild(titleX);

        const metaX = this.render("@article>header>meta", { author: payload.author, date: payload.date });
        if (metaX) el.appendChild(metaX);

        break;

      case "@article>header>title":
        el.textContent = payload || "Untitled Article";
        break;

      case "@article>header>meta": {
        // Built as nodes, not as a markup string: author/date are data, and data must
        // never be able to introduce elements.
        const author = payload.author;
        const date = payload.date || "Baru saja";

        if (author) {
          const authorEl = document.createElement("span");
          authorEl.className = "author";
          authorEl.append("Oleh: ");
          const strong = document.createElement("strong");
          strong.textContent = String(author);
          authorEl.appendChild(strong);
          el.appendChild(authorEl);

          const divider = document.createElement("span");
          divider.className = "divider";
          divider.textContent = "•";
          el.appendChild(divider);
        }

        const dateEl = document.createElement("span");
        dateEl.className = "date";
        dateEl.textContent = String(date);
        el.appendChild(dateEl);
        break;
      }

      case "@article>controls": {

        break;
      }

      case "@article>controls>back":
        const iconBack = document.createElement("i");
        iconBack.className = "icon arrow left";
        el.textContent = payload?.backLabel || payload?.label || "back";
        el.prepend(iconBack);
        break;

      case "@article>controls>next":
        const iconNext = document.createElement("i");
        iconNext.className = "icon arrow left";
        el.textContent = payload?.label || "next";
        el.append(iconNext);
        break;

      case "@article>controls>view":
        const iconDisplay = document.createElement("i");
        iconDisplay.className = "icon display list";
        el.title = payload?.label || "display list";
        el.append(iconDisplay);
        break;

      case "@article>controls>pagination":
        const links = payload?.meta?.links || payload?.links;
        if (!links) break;
        for (const [role, href] of Object.entries(links) as [string, string | null][]) {
          if (!href) continue;
          const item = this.render("@article>controls>pagination>item", { role, href }) as HTMLElement | undefined;
          if (item) el.appendChild(item);
        }
        break;


      case "@article>controls>pagination>item":
        el.textContent = String((payload?.role || "").toUpperCase());
        if (payload?.href) {
          el.dataset.role = payload.role;
          el.dataset.url = payload.href;
          (el as any)._hateoasServerUrl = payload.href;
        }
        if (payload?.active) el.classList.add("active-page");
        break;


      case "@article>controls>filter":
        el.textContent = payload?.filter || "";
        break;

      case "@article>item": {
        stampArticleId(el, payload);
        if (payload.thumbnail) {
          const thumb = this.render("@article>figure", payload.thumbnail);
          thumb!.className = "thumbnail"
          if (thumb) el.appendChild(thumb);
        }

        const headerX = this.render("@article>header", { title: payload.title, author: payload.author, date: payload.date })!
        if (headerX) el.appendChild(headerX)

        const caption = this.render("@article>item>caption", payload.summary);
        if (caption) el.appendChild(caption);
        break;
      }

      case "@article>item>caption":
        el.textContent = payload || "";
        break;

      case "@article>aside":
        // Komposisi penuh aside dilakukan di sini.
        if (this.config.recommendation && Array.isArray(payload?.data)) {
          el.setAttribute("position", this.config.position || "right");
          const title = this.render("@article>aside>title", { title: "Rekomendasi" }) as HTMLElement | undefined;
          if (title) el.appendChild(title);
          const block = this.render("@article>aside>block", payload) as HTMLElement | undefined;
          if (block) el.appendChild(block);
        }
        break;


      case "@article>aside>title":
        el.textContent = payload?.title || "Rekomendasi";
        break;

      case "@article>aside>block":
        const items = payload.data.slice(0, this.config.items ?? 5);
        items.forEach((item: any) => {
          const node = this.render("@article>aside>item", item);
          if (node) el.appendChild(node);
        });
        break;


      case "@article>aside>item":
        stampArticleId(el, payload);
        const thumbnail = this.render("@article>figure", payload.thumbnail)!;
        const h = this.render("@article>header", { title: payload.title, date: payload.date })!
        el.append(thumbnail, h)
        break;


      case "@article>detail":
        // `thumbnail` is the only image field the list payload carries, so it is the
        // detail cover unless a larger one was provided.
        const coverSource = payload.largeCover || payload.imageUrl || payload.thumbnail;
        if (coverSource) {
          const cover = this.render("@article>figure", coverSource);
          cover!.className = "cover"
          if (cover) el.appendChild(cover);
        }
        const header = this.render("@article>header", payload);
        if (header) el.appendChild(header);
        const body = this.render("@article>detail>body", payload.body);
        if (body) el.appendChild(body);
        break;

      case "@article>detail>body":
        // A body may be a node (already safe) or plain text. A markup string is not
        // parsed: an article body is data, and data does not choose the DOM shape.
        if (payload instanceof HTMLElement) el.appendChild(payload);
        else if (typeof payload === "string") el.textContent = payload;
        break;
    }
  }

  public initialize(root?: HTMLElement, _payload?: any, _context?: any): void {
    const container = root ?? (this.load("@container") as HTMLElement);
    if (!container) return;

    // Idempotent: stable ref plus remove-before-add, so re-initialising cannot stack.
    container.removeEventListener("click", this.handleClick);
    container.addEventListener("click", this.handleClick);
  }
}