import type { iBuilderConfig } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base";
import { DEFAULT_SELECTORS } from "./Section.kit";
import type { SectionElementType } from "./Section.kit";
import { normalizeColumns } from "./Section.engine";

/**
 * Section — one row of 2–3 content columns.
 *
 * ```ts
 * { content: [ { className?, content: [ { eyebrow, title, description, imageUrl, actions } ] }, … ] }
 * ```
 *
 * A column is either a wrapper of blocks (`content: [...]`) or a block itself, so both the
 * nested shape above and a flat `content: [{ title, imageUrl }]` render. Each block
 * contributes, in this order: image → eyebrow → header → description → actions.
 */

export interface iSectionAction {
  label?: string;
  href?: string;
  type?: "button" | "submit" | "reset";
  onClick?: (event: MouseEvent) => void;
}

export interface iSectionBlock {
  image?: string;
  imageUrl?: string;
  /** Accessible description for the image; falls back to `title`. */
  alt?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  actions?: iSectionAction[];
}

export interface iSectionColumn extends iSectionBlock {
  className?: string;
  content?: iSectionBlock[] | HTMLElement;
}

export interface iSectionConfig extends iBuilderConfig<SectionElementType> {
  /** Wrapper class appended to the root, e.g. `"container"`. */
  className?: string;
}

/** Add a space-separated class list without wiping the selector's own classes. */
function addClasses(el: HTMLElement, value: unknown): void {
  if (typeof value !== "string") return;
  for (const token of value.split(/\s+/).filter(Boolean)) el.classList.add(token);
}

export class SectionBuilder extends Builder<SectionElementType, iSectionConfig> {
  readonly builderId = "section";
  readonly name = "section";
  readonly stylesheet: string = "./Section.css";
  public config: Required<iSectionConfig>;

  constructor(config: Partial<iSectionConfig> = {}) {
    super();

    const defaultConfig: Required<iSectionConfig> = {
      themeId: "default",
      selectors: DEFAULT_SELECTORS,
      namespace: null,
      emit: () => { },
      className: "",
    };

    this.config = this.resolveConfig(defaultConfig, config);
  }

  public prepare(data: any): HTMLElement {
    const section = this.render("@section", data);

    for (const column of normalizeColumns(data)) {
      const box = this.render("@section>content", column);
      if (!box) continue;

      if (column.element) box.appendChild(column.element);

      for (const block of column.blocks) {
        const imageUrl = block.imageUrl ?? block.image;
        if (imageUrl) {
          const image = this.render("@section>content>image", block);
          if (image) box.appendChild(image);
        }

        if (block.eyebrow) {
          const eyebrow = this.render("@section>content>eyebrow", block);
          if (eyebrow) box.appendChild(eyebrow);
        }

        if (block.title) {
          const header = this.render("@section>content>header", block);
          if (header) box.appendChild(header);
        }

        if (block.description) {
          const desc = this.render("@section>content>desc", block);
          if (desc) box.appendChild(desc);
        }

        const actions = Array.isArray(block.actions) ? block.actions : [];
        if (actions.length) {
          const group = this.render("@section>content>actions", block);
          if (group) {
            for (const action of actions) {
              const item = this.render("@section>content>actions>item", action);
              if (item) group.appendChild(item);
            }
            box.appendChild(group);
          }
        }
      }

      section?.appendChild(box);
    }

    return this.load("@section") as HTMLElement;
  }

  protected template(typeKey: SectionElementType, el: HTMLElement, payload?: any): void {
    switch (typeKey) {
      case "@section":
        if (payload?.id) el.id = payload.id;
        if (payload?.className) addClasses(el, payload.className);
        if (this.config.className) addClasses(el, this.config.className);
        break;

      case "@section>content":
        if (payload?.className) addClasses(el, payload.className);
        break;

      case "@section>content>image": {
        const img = el as HTMLImageElement;
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
        } else {
          // No destination: behave like the button it visually is.
          el.setAttribute("role", "button");
          el.tabIndex = 0;
          if (typeof payload?.onClick === "function") el.addEventListener("click", payload.onClick);
        }
        break;

      default:
        break;
    }
  }

  public initialize(): void { }
}
