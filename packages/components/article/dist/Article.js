import { createImageError } from "@aio-ui/utilities/DomUtils";
import { Builder } from "@aio-ui/base";
/**
 * The DOM only carries the record's key; the component keeps the record itself.
 * Attaching objects to elements (`el._payload`) works until the node is cloned or
 * replaced, and then the data is silently gone.
 */
function stampArticleId(el, payload) {
    const id = payload?.slug ?? payload?.uid;
    if (id !== undefined && id !== null)
        el.dataset.articleId = String(id);
}
export class ArticleBuilder extends Builder {
    builderId = "article";
    name = "article";
    stylesheet = "./Article.css";
    // State internal modul
    currentRawServerResponse = null;
    slotSpecs = [];
    /** Simpan list view saat detail aktif, agar bisa dikembalikan via tombol back. */
    listElement = null;
    /** Records by id (`slug`/`uid`), so cards only carry a key. */
    records = new Map();
    constructor(config = {}) {
        super();
        const defaultSelectors = {
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
        const defaultConfig = {
            themeId: "default",
            selectors: defaultSelectors,
            namespace: null,
            slots: [],
            view: "card",
            position: "right",
            recommendation: 5,
            items: 5,
            navigate: () => { },
            emit: () => { },
        };
        this.config = this.resolveConfig(defaultConfig, config);
        this.slotSpecs = this.config.slots?.length ? this.config.slots : [
            { slot: "controls" },
            { slot: "list", view: "card" },
            { slot: "aside", count: this.config.items ?? 5 },
        ];
    }
    /**
     * 👑 COMPOSITION — membangun kontainer modul dan seluruh slot:
     * controls (back + pagination) → list grid (item[]) → aside (rekomendasi).
     * Interaksi terpasang via bindInteractions().
     */
    prepare(content, _config) {
        this.currentRawServerResponse = content?.content || content || {};
        // Fresh render pass: forget the previous list and record index.
        this.listElement = null;
        this.records.clear();
        const container = this.render("@container", this.currentRawServerResponse);
        const records = Array.isArray(this.currentRawServerResponse?.data) ? this.currentRawServerResponse.data : [];
        // Cards carry an id, not a payload: the component keeps the data, the DOM keeps a key.
        records.forEach((article, index) => {
            const id = String(article?.slug ?? article?.uid ?? index);
            this.records.set(id, article);
        });
        const slotFor = (role) => this.slotSpecs.length === 0 || this.slotSpecs.some((s) => s.slot === role);
        // ── 1. CONTROLS (back + pagination HATEOAS) ───────────────────────────
        if (slotFor("controls")) {
            const controls = this.render("@article>controls", this.currentRawServerResponse);
            if (controls) {
                controls.dataset.slot = "controls";
                const back = this.render("@article>controls>back", { label: "Kembali" });
                if (back) {
                    back.dataset.slot = "back-navigation";
                    controls.appendChild(back);
                }
                const pagination = this.render("@article>controls>pagination", this.currentRawServerResponse);
                if (pagination) {
                    pagination.dataset.slot = "pagination";
                    controls.appendChild(pagination);
                }
                container.appendChild(controls);
            }
        }
        // ── 2. LIST — grid kartu artikel dari data[] ──────────────────────────
        if (slotFor("list")) {
            const grid = this.render("@article>list", this.currentRawServerResponse);
            if (grid) {
                grid.dataset.slot = "list";
                grid.dataset.display = this.config.view || "card";
                records.forEach((article) => {
                    const item = this.render("@article>item", article);
                    if (!item)
                        return;
                    grid.appendChild(item);
                });
                container.appendChild(grid);
            }
        }
        // ── 3. ASIDE — rekomendasi dari data[] ────────────────────────────────
        if (this.config.recommendation && Array.isArray(this.currentRawServerResponse?.data)) {
            const aside = this.render("@article>aside", this.currentRawServerResponse);
            if (aside) {
                aside.dataset.slot = "aside";
                container.appendChild(aside);
            }
        }
        return container;
    }
    // =====================================================================
    // 🎮 INTERAKSI TERPUSAT — satu delegation di container modul.
    // Dipasang dari initialize(): create() memanggilnya setelah prepare()
    // selesai dan tree terpasang, jadi listener bisa dilepas kembali.
    // =====================================================================
    handleClick = (event) => {
        const container = event.currentTarget;
        const target = event.target;
        // A. Klik kartu artikel (list) atau item rekomendasi (aside) → detail
        const card = target.closest("[data-article-id]");
        if (card) {
            const record = this.records.get(String(card.dataset.articleId));
            if (record) {
                this.showDetail(container, record);
                return;
            }
        }
        // B. Klik tombol kembali → tampilkan kembali list view
        if (target.closest('[data-slot="back-navigation"], button.back')) {
            this.showList(container);
            return;
        }
        // C. Klik tombol pagination HATEOAS → emit elementChanged
        const pageBtn = target.closest(".pagination .item");
        if (pageBtn && pageBtn.dataset.url) {
            this.config.emit?.("elementChanged", {
                builder: this.builderId,
                type: "@article>pagination",
                element: pageBtn,
                data: { endpoint: pageBtn.dataset.url, module: this },
            });
        }
    };
    /** Tampilkan view detail untuk satu artikel (menggantikan list atau detail aktif). */
    showDetail(container, article = null) {
        if (!article)
            return;
        const currentDetail = container.querySelector("article.detail");
        if (!currentDetail) {
            const grid = container.querySelector('[data-slot="list"]');
            if (!grid)
                return;
            // Simpan list view agar bisa dikembalikan persis apa adanya.
            this.listElement = grid;
        }
        const detail = this.render("@article>detail", article);
        if (!detail)
            return;
        detail.dataset.slot = "detail";
        // Perbarui URL hash secara pasif memakai format kanonik router:
        // #route/slug?theme=... (tanpa trigger render ulang)
        if (article.slug) {
            history.pushState({ slug: article.slug }, "", this.buildSlugHash(article.slug));
        }
        if (currentDetail)
            currentDetail.replaceWith(detail); // detail → detail
        else
            this.listElement.replaceWith(detail); // list → detail
    }
    /**
     * Bangun hash slug dengan format kanonik HashRouter:
     * #route/slug?theme=... — agar parseUrlHash() membacanya sebagai
     * fragment (bukan merusak query, seperti saat append mentah).
     */
    buildSlugHash(slug) {
        const raw = location.hash.replace(/^#/, "");
        const [pathPart, queryPart] = raw.split("?");
        const base = pathPart.split("/")[0] || "blog";
        return `#${base}/${encodeURIComponent(slug)}${queryPart ? `?${queryPart}` : ""}`;
    }
    /** Kembalikan ke list view. */
    showList(container) {
        if (!this.listElement)
            return;
        const detail = container.querySelector("article.detail");
        if (detail)
            detail.replaceWith(this.listElement);
        // Bersihkan suffix slug dari hash: #blog/slug?theme=... → #blog?theme=...
        const raw = location.hash.replace(/^#/, "");
        if (raw.includes("/")) {
            const [pathPart, queryPart] = raw.split("?");
            const base = pathPart.split("/")[0];
            history.pushState({}, "", `#${base}${queryPart ? `?${queryPart}` : ""}`);
        }
        this.listElement = null;
    }
    template(typeKey, el, payload, _props) {
        switch (typeKey) {
            case "@container":
                break;
            case "@article>figure":
                const image = document.createElement("img");
                image.src = encodeURI(payload);
                image.onerror = (_e) => {
                    image.src = createImageError();
                };
                el.appendChild(image);
                break;
            case "@article>header":
                const titleX = this.render("@article>header>title", payload.title);
                if (titleX)
                    el.appendChild(titleX);
                const metaX = this.render("@article>header>meta", { author: payload.author, date: payload.date });
                if (metaX)
                    el.appendChild(metaX);
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
                if (!links)
                    break;
                for (const [role, href] of Object.entries(links)) {
                    if (!href)
                        continue;
                    const item = this.render("@article>controls>pagination>item", { role, href });
                    if (item)
                        el.appendChild(item);
                }
                break;
            case "@article>controls>pagination>item":
                el.textContent = String((payload?.role || "").toUpperCase());
                if (payload?.href) {
                    el.dataset.role = payload.role;
                    el.dataset.url = payload.href;
                    el._hateoasServerUrl = payload.href;
                }
                if (payload?.active)
                    el.classList.add("active-page");
                break;
            case "@article>controls>filter":
                el.textContent = payload?.filter || "";
                break;
            case "@article>item": {
                stampArticleId(el, payload);
                if (payload.thumbnail) {
                    const thumb = this.render("@article>figure", payload.thumbnail);
                    thumb.className = "thumbnail";
                    if (thumb)
                        el.appendChild(thumb);
                }
                const headerX = this.render("@article>header", { title: payload.title, author: payload.author, date: payload.date });
                if (headerX)
                    el.appendChild(headerX);
                const caption = this.render("@article>item>caption", payload.summary);
                if (caption)
                    el.appendChild(caption);
                break;
            }
            case "@article>item>caption":
                el.textContent = payload || "";
                break;
            case "@article>aside":
                // Komposisi penuh aside dilakukan di sini.
                if (this.config.recommendation && Array.isArray(payload?.data)) {
                    el.setAttribute("position", this.config.position || "right");
                    const title = this.render("@article>aside>title", { title: "Rekomendasi" });
                    if (title)
                        el.appendChild(title);
                    const block = this.render("@article>aside>block", payload);
                    if (block)
                        el.appendChild(block);
                }
                break;
            case "@article>aside>title":
                el.textContent = payload?.title || "Rekomendasi";
                break;
            case "@article>aside>block":
                const items = payload.data.slice(0, this.config.items ?? 5);
                items.forEach((item) => {
                    const node = this.render("@article>aside>item", item);
                    if (node)
                        el.appendChild(node);
                });
                break;
            case "@article>aside>item":
                stampArticleId(el, payload);
                const thumbnail = this.render("@article>figure", payload.thumbnail);
                const h = this.render("@article>header", { title: payload.title, date: payload.date });
                el.append(thumbnail, h);
                break;
            case "@article>detail":
                // `thumbnail` is the only image field the list payload carries, so it is the
                // detail cover unless a larger one was provided.
                const coverSource = payload.largeCover || payload.imageUrl || payload.thumbnail;
                if (coverSource) {
                    const cover = this.render("@article>figure", coverSource);
                    cover.className = "cover";
                    if (cover)
                        el.appendChild(cover);
                }
                const header = this.render("@article>header", payload);
                if (header)
                    el.appendChild(header);
                const body = this.render("@article>detail>body", payload.body);
                if (body)
                    el.appendChild(body);
                break;
            case "@article>detail>body":
                // A body may be a node (already safe) or plain text. A markup string is not
                // parsed: an article body is data, and data does not choose the DOM shape.
                if (payload instanceof HTMLElement)
                    el.appendChild(payload);
                else if (typeof payload === "string")
                    el.textContent = payload;
                break;
        }
    }
    initialize(root, _payload, _context) {
        const container = root ?? this.load("@container");
        if (!container)
            return;
        // Idempotent: stable ref plus remove-before-add, so re-initialising cannot stack.
        container.removeEventListener("click", this.handleClick);
        container.addEventListener("click", this.handleClick);
    }
}
//# sourceMappingURL=Article.js.map