import { Builder } from "@aio-ui/base";
import { DEFAULT_SELECTORS } from "./Badge.kit.js";
import { normalizePayload } from "./Badge.engine.js";
export class BadgeBuilder extends Builder {
    builderId = "badge";
    name = "badge";
    stylesheet = "./Badge.css";
    config;
    constructor(config = {}) {
        super();
        const defaultConfig = {
            themeId: "default",
            namespace: null,
            emit: () => { },
            selectors: DEFAULT_SELECTORS,
            emphasis: false,
        };
        this.config = this.resolveConfig(defaultConfig, config);
    }
    /**
     * Build the tree. `render()` registers the node under its key, calls `template()`,
     * and returns the element. Append children explicitly — order is yours to decide, and
     * optional parts should simply not be appended instead of being appended empty.
     */
    prepare(data) {
        const items = normalizePayload(data);
        const container = this.render("@container", { count: items.length });
        const root = this.render("@badge", { count: items.length });
        for (const item of items) {
            const node = this.render("@badge>item", item);
            if (!node)
                continue;
            if (item.label) {
                const label = this.render("@badge>item>label", item);
                if (label)
                    node.appendChild(label);
            }
            if (item.description) {
                const desc = this.render("@badge>item>desc", item);
                if (desc)
                    node.appendChild(desc);
            }
            root?.appendChild(node);
        }
        if (container && root)
            container.appendChild(root);
        return this.load("@container");
    }
    /**
     * Hydration valve. Text and attributes only — `textContent`, never `innerHTML`,
     * so content can never inject markup.
     */
    template(typeKey, el, payload) {
        switch (typeKey) {
            case "@container":
                if (this.config.emphasis)
                    el.classList.add("is-emphasis");
                break;
            case "@badge>item>label":
                el.textContent = payload?.label ?? "";
                break;
            case "@badge>item>desc":
                el.textContent = payload?.description ?? "";
                break;
            default:
                break;
        }
    }
    /**
     * Interaction wiring. Called once after the tree is attached; keep it idempotent
     * (stable listener refs + remove-before-add) so re-running it cannot stack handlers.
     * A purely visual component needs nothing here.
     */
    initialize() { }
}
//# sourceMappingURL=Badge.js.map