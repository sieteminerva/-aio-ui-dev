import { Builder } from "@aio-ui/base";
export class PricingCardBuilder extends Builder {
    builderId = "pricing-card";
    name = "pricing-card";
    stylesheet = "./PricingCard.css";
    rawDataNode = null;
    constructor(config = {}) {
        super();
        const defaultSelectors = {
            "@container": { tagName: "div", className: "row" },
            "@card": { tagName: "div", className: "card pricing", wrapper: ".column" },
            "@card>header": { tagName: "div", className: "header" },
            "@card>price": { tagName: "div", className: "item price-tag" },
            "@card>divider": { tagName: "hr", className: "divider" },
            "@card>body": { tagName: "div", className: "body" },
            "@card>body>item": { tagName: "li", className: "item" },
            "@card>actions": { tagName: "div", className: "actions" },
        };
        const defaultConfig = {
            themeId: "default",
            namespace: null,
            emit: () => { },
            selectors: defaultSelectors,
        };
        this.config = this.resolveConfig(defaultConfig, config);
    }
    prepare(data, _config) {
        // console.log(this.builderId, { data })
        const container = this.render("@container", data);
        const items = Array.isArray(data) ? data : [data];
        items.forEach((item) => {
            const card = this.render("@card", item);
            container?.append(card.__outer);
        });
        return this.load("@container");
    }
    /**
     * Nothing to hydrate here: a card group repeats `@card>actions` under one selector key, so
     * `load()` would only ever answer for the last card. The click handler is bound inside
     * `template()` on the node that actually renders the button.
     */
    initialize() {
        // intentionally empty
    }
    template(typeKey, el, payload) {
        if (typeKey === "@card" && !payload)
            return;
        switch (typeKey) {
            case "@card":
                // console.log(typeKey, { payload, el })
                const card = el.__inner ? el.__inner : el;
                if (payload.className)
                    el.classList.add(...String(payload.className).split(" "));
                const headerText = payload.header ?? payload.title;
                if (headerText) {
                    const header = this.render("@card>header", headerText);
                    const divider = this.render("@card>divider");
                    card.append(header, divider);
                }
                const bodyContent = (payload.body ?? payload.content) || [];
                if (bodyContent.length > 0) {
                    const body = this.render("@card>body", bodyContent);
                    card.append(body);
                }
                // `price: 0` is a real price (a free tier), so presence, not truthiness, decides.
                if (payload.price !== undefined && payload.price !== null) {
                    const price = this.render("@card>price", payload.price);
                    const actions = this.render("@card>actions", {
                        featured: payload.featured ?? String(payload.className ?? "").split(" ").includes("is-featured"),
                        label: payload.action?.label ?? payload.label,
                        onClick: payload.onClick,
                    });
                    const dividerBottom = this.render("@card>divider");
                    dividerBottom.style.marginBottom = "0";
                    card.append(price, dividerBottom, actions);
                }
                break;
            case "@card>header":
                // console.log(typeKey, { payload, el })
                const eyebrow = document.createElement("span");
                eyebrow.textContent = payload;
                el.appendChild(eyebrow);
                break;
            case "@card>body":
                const features = document.createElement("ul");
                features.className = "features";
                for (const i of payload) {
                    const li = this.render("@card>body>item", i);
                    features.appendChild(li);
                }
                el.appendChild(features);
                break;
            case "@card>price":
                // console.log(typeKey, { payload, el })
                const currency = new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    currencyDisplay: "symbol"
                });
                const content = `Mulai dari <strong>${currency.format(payload)}</strong> / pax`;
                el.insertAdjacentHTML("afterbegin", content);
                el.style.marginBottom = "1.5em";
                break;
            case "@card>body>item":
                // console.log(typeKey, { payload, el })
                el.textContent = payload?.title ?? "";
                if (payload && payload.className)
                    el.classList.add(payload.className);
                break;
            case "@card>actions": {
                // console.log(typeKey, { payload, el })
                const button = document.createElement("button");
                button.type = "button";
                button.className = "button";
                button.textContent = payload?.label ?? "Pilih";
                if (payload?.featured) {
                    button.classList.add("primary");
                }
                if (typeof payload?.onClick === "function") {
                    button.addEventListener("click", payload.onClick);
                }
                el.appendChild(button);
                break;
            }
        }
    }
}
//# sourceMappingURL=PricingCard.js.map