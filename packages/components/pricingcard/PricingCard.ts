import type { iBasicNode, iBuilderConfig } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base/Base";

export type PricingCardElementType =
  | "@container"
  | "@card"
  | "@card>header"
  | "@card>price"
  | "@card>divider"
  | "@card>body"
  | "@card>body>item"
  | "@card>actions"

interface iPricingCardConfig extends iBuilderConfig<PricingCardElementType> {
  // selectors: Record<PricingCardElementType, iElementProperty>;
}

export class PricingCardBuilder extends Builder<PricingCardElementType, iPricingCardConfig> {
  readonly builderId = "pricing-card";
  readonly name = "pricing-card";
  readonly stylesheet = "./PricingCard.css";

  protected rawDataNode: any = null;

  constructor(config: Partial<iPricingCardConfig> = {}) {
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
    }

    const defaultConfig: Required<iPricingCardConfig> = {
      themeId: "default",
      namespace: null,
      emit: () => { },
      selectors: defaultSelectors,
    };

    this.config = this.resolveConfig(defaultConfig, config);

  }

  public prepare(data: iBasicNode, _config?: Partial<iBuilderConfig<PricingCardElementType>> | undefined): HTMLElement {
    // console.log(this.builderId, { data })

    const container = this.render("@container", data);
    const items = Array.isArray(data) ? data : [data];

    items.forEach((item: any) => {
      const card = this.render("@card", item) as { __outer: HTMLElement, __inner: HTMLElement };

      container?.append(card.__outer!)
    });

    return this.load("@container") as HTMLElement;
  }

  /**
   * PHASE 5: Attaches dynamic event interactions securely onto computed DOM paths.
   */
  public initialize(): void {
    const actionData = this.payload("@card>actions");
    if (actionData && actionData.onClick) {
      // TODO handle attach listeners
      const buttonElement = (this.load("@card>actions") as HTMLElement)?.firstChild;
      if (buttonElement) {
        buttonElement.addEventListener("click", actionData.onClick);
      }
    }
  }

  protected template(typeKey: PricingCardElementType, el: HTMLElement, payload: any): void {
    if (!payload) return;

    switch (typeKey) {
      case "@card":
        // console.log(typeKey, { payload, el })
        const card = el.__inner ? el.__inner : el;
        if (payload.className) el.classList.add(...payload.className.split(" "));


        const headerText = payload.header ?? payload.title;
        if (headerText) {
          const header = this.render("@card>header", headerText)!
          const divider = this.render("@card>divider")!
          card.append(header, divider)
        }

        const bodyContent = (payload.body ?? payload.content) || [];
        if (bodyContent.length > 0) {
          const body = this.render("@card>body", bodyContent)!
          card.append(body)
        }

        if (payload.price) {
          const price = this.render("@card>price", payload.price)!
          const actions = this.render("@card>actions", payload.className)!
          const dividerBottom = this.render("@card>divider")!
          dividerBottom.style.marginBottom = "0";
          card.append(price, dividerBottom, actions)
        }

        break;

      case "@card>header":
        // console.log(typeKey, { payload, el })
        const eyebrow = document.createElement("span");
        eyebrow.textContent = payload
        el.appendChild(eyebrow);
        break;

      case "@card>body":
        const features = document.createElement("ul");
        features.className = "features"
        for (const i of payload) {
          const li = this.render("@card>body>item", i)!
          features.appendChild(li)
        }

        el.appendChild(features);
        break;

      case "@card>price":
        // console.log(typeKey, { payload, el })
        const currency = new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          currencyDisplay: "symbol"
        })
        const content = `Mulai dari <strong>${currency.format(payload)}</strong> / pax`;
        el.insertAdjacentHTML("afterbegin", content);
        el.style.marginBottom = "1.5em"
        break;

      case "@card>body>item":
        // console.log(typeKey, { payload, el })
        el.textContent = payload.title;
        if (payload && payload.className) el.classList.add(payload.className);
        break;

      case "@card>actions":
        // console.log(typeKey, { payload, el })
        const featured = payload ? payload.includes("is-featured") : false;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "button";
        button.textContent = "Pilih"
        if (featured) {
          button.classList.add("primary");
        }
        el.appendChild(button);
        break;
    }
  }

  // private bindListeners() {

  // }
}