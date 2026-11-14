import { Builder } from "@aio-ui/base";
import { Skeleton } from "@aio-ui/skeleton";
export class AccordionBuilder extends Builder {
    builderId = "accordion";
    name = "accordion";
    stylesheet = "./Accordion.css";
    /**
     * 🪶 LOADING MOCKUP — one open panel between two closed headers, drawn with the mandatory
     * `@aio-ui/skeleton` primitive. `Accordion.css` is the sheet that is still on its way, so
     * the skin cannot come from it; the rhythm comes from the spec instead.
     */
    loading() {
        return Skeleton.create({
            shape: "stack",
            children: [
                { shape: "bone", height: "3rem" },
                { shape: "line", count: 3 },
                { shape: "bone", height: "3rem", count: 2 },
            ],
        });
    }
    constructor(config = {}) {
        super();
        const defaultConfig = {
            themeId: "default",
            selectors: {
                "@accordion": { tagName: "div", className: "accordion" },
                "@accordion>section": { tagName: "details" },
                "@accordion>section>title": { tagName: "summary" },
                "@accordion>section>content": { tagName: "div", className: "content" },
            },
            namespace: null,
            emit: () => { }
        };
        this.config = this.resolveConfig(defaultConfig, config);
    }
    prepare(data, _config) {
        const content = data?.content;
        const items = (Array.isArray(content) ? content : [content]).filter(Boolean);
        return this.render("@accordion", items);
    }
    initialize() {
        // console.log(`[Section Runtime Active] Section DOM tree with ID successfully mounted and initialized.`);
    }
    template(typeKey, el, payload) {
        switch (typeKey) {
            case "@accordion":
                // console.log(payload)
                for (const p of payload) {
                    const section = this.render("@accordion>section", p);
                    el.appendChild(section);
                }
                break;
            case "@accordion>section":
                // The leaf cases below own the fallback copy, so only the record itself is guarded.
                if (!payload)
                    return;
                const title = this.render("@accordion>section>title", payload.title);
                const content = this.render("@accordion>section>content", payload.description);
                el.append(title, content);
                break;
            case "@accordion>section>title":
                el.textContent = payload || "Untitled Header";
                break;
            case "@accordion>section>content":
                const p = document.createElement("p");
                p.className = "desc";
                p.textContent = payload || "Untitled Content";
                el.appendChild(p);
                break;
            // Pos selektor pembungkus murni (@container, @accordion, @content) 
            // dilewati secara pasif karena tag & kelasnya sudah otomatis di-inject di atas!
        }
    }
}
//# sourceMappingURL=Accordion.js.map