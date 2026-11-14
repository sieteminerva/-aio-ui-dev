import { Builder } from "@aio-ui/base";
import { Skeleton } from "@aio-ui/skeleton";
/**
 * Turn a data value into a usable link target.
 *
 * The source data stores contact details as plain values (`halo@seributrip.id`,
 * `+628123456789`, a street address), so the scheme is inferred instead of asking the
 * content author to write `mailto:` themselves. A value that is not addressable at all
 * (a street address) becomes an inert `#` — and the visible text still shows it.
 */
function resolveHref(value) {
    const raw = (value ?? "").trim();
    if (!raw)
        return "#";
    if (/^(https?:|mailto:|tel:|#|\/|\.\/|\.\.\/)/i.test(raw))
        return raw;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw))
        return `mailto:${raw}`;
    if (/^[+]?[\d][\d\s\-()]{6,}$/.test(raw))
        return `tel:${raw.replace(/[\s\-()]/g, "")}`;
    return "#";
}
export class FooterBuilder extends Builder {
    builderId = "footer";
    name = "footer";
    stylesheet = "./Footer.css";
    config;
    /**
     * 🪶 LOADING MOCKUP — three column headers over their link lines, then the copyright row,
     * drawn with the mandatory `@aio-ui/skeleton` primitive. Widths stay under a third so the
     * columns read as columns before `Footer.css` arrives.
     */
    loading() {
        return Skeleton.create({
            shape: "stack",
            children: [
                { shape: "row", gap: "1rem", children: [{ shape: "bone", width: "28%", height: "1rem", count: 3 }] },
                { shape: "row", gap: "1rem", children: [{ shape: "line", width: "28%", count: 3 }] },
                { shape: "row", gap: "1rem", children: [{ shape: "line", width: "28%", count: 3 }] },
                { shape: "line", width: "35%" },
            ],
        });
    }
    constructor(config = {}) {
        super();
        const defaultSelectors = {
            "@footer": { tagName: "footer", className: "footer" },
            "@footer>row": { tagName: "div", className: "row" },
            "@footer>row>column": { tagName: "div", className: "column" },
            "@footer>row>column>header": { tagName: "h2", className: "header" },
            "@footer>row>column>desc": { tagName: "p", className: "desc" },
            "@footer>row>column>list": { tagName: "ul", className: "unstyled-list" },
            "@footer>row>column>list>item": { tagName: "li", className: "item" },
            "@footer>copyright": { tagName: "div", className: "row bottom" }
        };
        const defaultConfig = {
            themeId: "default",
            useInfo: true,
            useCopyright: true,
            selectors: defaultSelectors,
            namespace: null,
            emit: () => { }
        };
        this.config = this.resolveConfig(defaultConfig, config);
    }
    prepare(data) {
        const content = data.content || data;
        // A footer without `columns[]` is still a footer: fall back to the flat shape so a
        // single-column payload does not need to be wrapped in an array of one.
        const columns = Array.isArray(content.columns) && content.columns.length
            ? content.columns
            : content.title || content.description || content.actions
                ? [{ title: content.title, description: content.description, actions: content.actions }]
                : [];
        const footer = this.render("@footer", content);
        // 🪐 ROW 1 — COLUMNS
        if (this.config.useInfo && columns.length) {
            const row = this.render("@footer>row", content);
            for (const col of columns) {
                const column = this.render("@footer>row>column", col);
                if (!column)
                    continue;
                // Any of the three parts may be absent; absent parts are not rendered at all
                // (no empty <p>, no empty <ul> keeping layout gaps open).
                if (col.title) {
                    const header = this.render("@footer>row>column>header", col);
                    if (header)
                        column.appendChild(header);
                }
                if (col.description) {
                    const desc = this.render("@footer>row>column>desc", col);
                    if (desc)
                        column.appendChild(desc);
                }
                const actions = Array.isArray(col.actions) ? col.actions : [];
                if (actions.length) {
                    const list = this.render("@footer>row>column>list", col);
                    if (list) {
                        for (const action of actions) {
                            const item = this.render("@footer>row>column>list>item", action);
                            if (item)
                                list.appendChild(item);
                        }
                        column.appendChild(list);
                    }
                }
                row?.appendChild(column);
            }
            if (row)
                footer?.appendChild(row);
        }
        // 🪐 ROW 2 — COPYRIGHT
        if (this.config.useCopyright) {
            const row = this.render("@footer>copyright", content);
            if (row)
                footer?.appendChild(row);
        }
        return this.load("@footer");
    }
    /**
     * 👑 THE SEPARATED HYDRATION VALVE (POS PENYIRAMAN DATA KEBAL XSS)
     * Mengunci pengisian nilai teks dan transformasi tag dinamis (Anchor) di RAM.
     */
    template(typeKey, el, payload) {
        if (!payload)
            return;
        switch (typeKey) {
            case "@footer":
                if (payload.id)
                    el.id = payload.id;
                if (payload.className)
                    el.className = payload.className;
                break;
            case "@footer>row>column>header":
                el.textContent = payload.title || payload.header || "";
                break;
            case "@footer>row>column>desc":
                el.textContent = payload.description || "";
                break;
            case "@footer>row>column>list>item": {
                // Melahirkan tag jangkar <a> secara otonom di dalam rahim <li> list item
                const a = document.createElement("a");
                if (payload.id)
                    a.id = payload.id;
                if (payload.className)
                    a.className = payload.className;
                a.href = resolveHref(payload.href ?? payload.value);
                // Nilai tetap terlihat walaupun tidak addressable (mis. alamat jalan),
                // dan penggabungan label+nilai aman dari kebocoran XSS.
                const value = payload.value ?? payload.href;
                a.textContent = [payload.label, value].filter(Boolean).join(" ").trim();
                el.appendChild(a);
                break;
            }
            case "@footer>copyright": {
                const pCopy = document.createElement("p");
                // 🔮 JIT TIMESTAMP INJECTION: Hitung tahun secara real-time saat mendarat di RAM browser
                const year = String(new Date().getFullYear());
                const company = (payload.company ?? payload.title ?? "").trim();
                pCopy.textContent = payload.copyright
                    ? String(payload.copyright).replace(/\{year\}/g, year).replace(/\{company\}/g, company)
                    : `© ${year}${company ? ` ${company}` : ""}. All rights reserved.`;
                el.appendChild(pCopy);
                break;
            }
        }
    }
    initialize() {
        // console.log(`[Footer Lifecycle] Core structure connected successfully.`);
    }
}
//# sourceMappingURL=Footer.js.map