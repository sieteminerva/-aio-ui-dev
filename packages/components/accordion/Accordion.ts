import type { iBasicNode, iBuilderConfig } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base";

export type AccordionElementType =
  | "@accordion"
  | "@accordion>section"
  | "@accordion>section>title"
  | "@accordion>section>content"

export interface iAccordionConfig extends iBuilderConfig<AccordionElementType> { }

export class AccordionBuilder extends Builder<AccordionElementType, iAccordionConfig> {
  readonly builderId = "accordion";
  readonly name = "accordion";
  readonly stylesheet = "./Accordion.css";

  constructor(config: Partial<iAccordionConfig> = {}) {
    super();
    const defaultConfig: Required<iAccordionConfig> = {
      themeId: "default",
      selectors: {
        "@accordion": { tagName: "div", className: "accordion" },
        "@accordion>section": { tagName: "details" },
        "@accordion>section>title": { tagName: "summary" },
        "@accordion>section>content": { tagName: "div", className: "content" },
      },
      namespace: null,
      emit: () => { }
    }

    this.config = this.resolveConfig<iAccordionConfig>(defaultConfig, config);
  }

  public prepare(data: iBasicNode, _config?: Partial<iAccordionConfig>): HTMLElement {

    const content = data?.content;
    const items = (Array.isArray(content) ? content : [content]).filter(Boolean);

    return this.render("@accordion", items) as HTMLElement;
  }

  public initialize(): void {
    // console.log(`[Section Runtime Active] Section DOM tree with ID successfully mounted and initialized.`);
  }

  protected template(typeKey: AccordionElementType, el: HTMLElement, payload?: any): void {
    switch (typeKey) {
      case "@accordion":
        // console.log(payload)
        for (const p of payload) {
          const section = this.render("@accordion>section", p)!
          el.appendChild(section);
        }
        break;

      case "@accordion>section":
        // The leaf cases below own the fallback copy, so only the record itself is guarded.
        if (!payload) return;
        const title = this.render("@accordion>section>title", payload.title)!
        const content = this.render("@accordion>section>content", payload.description)!
        el.append(title, content);
        break;

      case "@accordion>section>title":
        el.textContent = payload || "Untitled Header";
        break;

      case "@accordion>section>content":
        const p = document.createElement("p")
        p.className = "desc"
        p.textContent = payload || "Untitled Content";
        el.appendChild(p);
        break;

      // Pos selektor pembungkus murni (@container, @accordion, @content) 
      // dilewati secara pasif karena tag & kelasnya sudah otomatis di-inject di atas!
    }
  }
}