import { Builder } from "@aio-ui/base";
import { Skeleton } from "@aio-ui/skeleton";
import { DEFAULT_SELECTORS } from "./Section.kit.js";
import { normalizeColumns } from "./Section.engine.js";
/** Add a space-separated class list without wiping the selector's own classes. */
function addClasses(el, value) {
    if (typeof value !== "string")
        return;
    for (const token of value.split(/\s+/).filter(Boolean))
        el.classList.add(token);
}
export class SectionBuilder extends Builder {
    builderId = "section";
    name = "section";
    stylesheet = "./Section.css";
    config;
    /**
     * 🪶 LOADING MOCKUP — eyebrow, header, copy and the action row, drawn with the mandatory
     * `@aio-ui/skeleton` primitive. Column count is a payload detail; one column is the
     * layout the sheet will stack first anyway.
     */
    loading() {
        return Skeleton.create({
            shape: "stack",
            children: [
                { shape: "line", width: "35%" },
                { shape: "bone", width: "65%", height: "2rem" },
                { shape: "line", count: 2 },
                { shape: "row", gap: "0.5rem", children: [{ shape: "bone", width: "7rem", height: "2.5rem", count: 2 }] },
            ],
        });
    }
    constructor(config = {}) {
        super();
        const defaultConfig = {
            themeId: "default",
            selectors: DEFAULT_SELECTORS,
            namespace: null,
            emit: () => { },
            className: "",
        };
        this.config = this.resolveConfig(defaultConfig, config);
    }
    prepare(data) {
        const section = this.render("@section", data);
        for (const column of normalizeColumns(data)) {
            const box = this.render("@section>content", column);
            if (!box)
                continue;
            if (column.element)
                box.appendChild(column.element);
            for (const block of column.blocks) {
                const imageUrl = block.imageUrl ?? block.image;
                if (imageUrl) {
                    const image = this.render("@section>content>image", block);
                    if (image)
                        box.appendChild(image);
                }
                if (block.eyebrow) {
                    const eyebrow = this.render("@section>content>eyebrow", block);
                    if (eyebrow)
                        box.appendChild(eyebrow);
                }
                if (block.title) {
                    const header = this.render("@section>content>header", block);
                    if (header)
                        box.appendChild(header);
                }
                if (block.description) {
                    const desc = this.render("@section>content>desc", block);
                    if (desc)
                        box.appendChild(desc);
                }
                const actions = Array.isArray(block.actions) ? block.actions : [];
                if (actions.length) {
                    const group = this.render("@section>content>actions", block);
                    if (group) {
                        for (const action of actions) {
                            const item = this.render("@section>content>actions>item", action);
                            if (item)
                                group.appendChild(item);
                        }
                        box.appendChild(group);
                    }
                }
            }
            section?.appendChild(box);
        }
        return this.load("@section");
    }
    template(typeKey, el, payload) {
        switch (typeKey) {
            case "@section":
                if (payload?.id)
                    el.id = payload.id;
                if (payload?.className)
                    addClasses(el, payload.className);
                if (this.config.className)
                    addClasses(el, this.config.className);
                break;
            case "@section>content":
                if (payload?.className)
                    addClasses(el, payload.className);
                break;
            case "@section>content>image": {
                const img = el;
                img.src = encodeURI(payload?.imageUrl ?? payload?.image ?? "");
                img.alt = payload?.alt || payload?.title || "";
                img.loading = "lazy";
                img.decoding = "async";
                break;
            }
            case "@section>content>eyebrow":
                el.textContent = payload?.eyebrow ?? "";
                break;
            case "@section>content>header":
                el.textContent = payload?.title ?? "";
                break;
            case "@section>content>desc":
                el.textContent = payload?.description ?? "";
                break;
            case "@section>content>actions>item":
                el.textContent = payload?.label ?? "";
                if (payload?.href) {
                    el.setAttribute("href", payload.href);
                }
                else {
                    // No destination: behave like the button it visually is.
                    el.setAttribute("role", "button");
                    el.tabIndex = 0;
                    if (typeof payload?.onClick === "function")
                        el.addEventListener("click", payload.onClick);
                }
                break;
            default:
                break;
        }
    }
    initialize() { }
}
//# sourceMappingURL=Section.js.map