import type { iActionProperty, iBasicNode, iBuilderConfig } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base/Base";

export type SectionElementType =
  | "@section"
  | "@section>content"
  | "@section>content>image"
  | "@section>content>eyebrow"
  | "@section>content>header"
  | "@section>content>desc"
  | "@section>content>actions"
  | "@section>content>actions>item";

export interface iSectionConfig extends iBuilderConfig<SectionElementType> {

}

export class SectionBuilder extends Builder<SectionElementType, iSectionConfig> {
  readonly builderId = "section";
  readonly name = "section";
  readonly stylesheet: string = "";
  public config: any;

  constructor(config: Partial<iSectionConfig> = {}) {
    super();
    // 💡 KEMBALI SUCI: Kamus selektor kaku Anda terbebas murni dari properti isArray kuno!
    const defaultSelectors: Record<SectionElementType, iActionProperty> = {
      "@section": { tagName: "section", className: "row" },
      "@section>content": { tagName: "div", className: "column" },
      "@section>content>image": { tagName: "img", className: "img-fluid" },
      "@section>content>eyebrow": { tagName: "div", className: "eyebrow" },
      "@section>content>header": { tagName: "h2", className: "title" },
      "@section>content>desc": { tagName: "p", className: "desc" },
      "@section>content>actions": { tagName: "div", className: "actions" },
      "@section>content>actions>item": { tagName: "button", className: "button" }
    };

    const defaultConfig: Required<iSectionConfig> = {
      themeId: "default",
      selectors: defaultSelectors,
      namespace: null,
      emit: () => { }
    }

    this.config = this.resolveConfig(defaultConfig, config);
  }

  /**
   * 👑 THE REFINED COMPILER GATEWAY
   * Ultra-Slim, 100% Linear, dan terintegrasi penuh dengan saku memori JIT Map!
   */
  public prepare(data: iBasicNode, _config: Partial<iSectionConfig> = {}): HTMLElement {

    // console.log({ data })
    // 1. Lahirkan Cangkang Makro Terluar Seksi (@section)
    const section = this.render("@section", data);
    // Amankan dan kembalikan elemen kontainer makro terluarnya secara standard via Map get!
    return section as HTMLElement;
  }

  /**
   * 👑 THE SEPARATED HYDRATION VALVE (POS PENYIRAMAN RAHIM DATA)
   * Kebal XSS murni vanilla, terisolasi penuh, 0% campur tangan birokrasi engine pusat!
   */
  protected template(typeKey: SectionElementType, el: HTMLElement, payload?: any): void {
    if (!payload) return;

    switch (typeKey) {
      case "@section":
        el.id = payload.id || "";
        // Jika pembungkus luar memiliki set custom class dari Sheets, siram!
        if (payload.className) el.className = `section ${payload.className}`.trim();
        // Normalisasi data array kolom konten dari Sheets (Mendukung Multi-Instance Kolom)
        const rows = Array.isArray(payload.content) ? payload.content : [payload.content];
        // 2. Loop Linear Tingkat Kolon Isi Konten (N-Columns)
        for (const column of rows) {
          // console.log({ column })
          // Lahirkan boks pembungkus kolom konten
          const contentBox = this.render("@section>content", column);
          el?.appendChild(contentBox!);

        }

        break;

      case "@section>content":

        el.className = payload.className || "column"

        if (payload.content && Array.isArray(payload.content)) {

          for (const col of payload.content) {
            if (col.image || col.imageUrl) {
              const image = this.render("@section>content>image", { image: col.imageUrl, title: col.title })!;
              el?.appendChild(image)
            };
            if (col.eyebrow) {
              const eyebrow = this.render("@section>content>eyebrow", col)!;
              el?.appendChild(eyebrow)
            };
            if (col.title) {
              const header = this.render("@section>content>header", col)!;
              el?.appendChild(header)
            };
            if (col.description) {
              const desc = this.render("@section>content>desc", col)!;
              el?.appendChild(desc)
            };
            if (col.actions?.length > 0) {
              const actions = this.render("@section>content>actions", col)!;
              el?.appendChild(actions)
            };

          }
        } else if (payload?.content instanceof HTMLElement) {
          el?.appendChild(payload.content)
        }
        break;

      case "@section>content>image":
        el.setAttribute("src", encodeURI(payload.image || ""));
        el.setAttribute("alt", payload.title || "section-graphic");
        break;

      case "@section>content>eyebrow":
        // console.log({ payload })
        el.textContent = payload.eyebrow || "";
        break;

      case "@section>content>header":
        el.textContent = payload.title || "";
        break;

      case "@section>content>desc":
        el.textContent = payload.description || "";
        break;

      case "@section>content>actions":
        const actionItems = Array.isArray(payload) ? payload : [];
        actionItems.forEach((actionData: any) => {
          const btnItem = this.render("@section>content>actions>item", actionData);
          if (btnItem && el) el.appendChild(btnItem);
        });
        break;

      case "@section>content>actions>item":
        el.textContent = payload.label || "";

        // Fleksibilitas perubahan tag otomatis (Anchor vs Button) mengikuti isi data href
        if (payload.href) {
          const anchor = el as HTMLAnchorElement;
          anchor.href = payload.href;
          // Pancing penguncian perosotan scroll passthrough satu pintu jika dibutuhkan:
          // (this as any).bindNavigation?.(anchor, payload.href);
        } else {
          const btn = el as HTMLButtonElement;
          btn.type = payload.type || "button";
          if (payload.onClick) btn.addEventListener("click", payload.onClick);
        }
        break;
    }
  }

  public initialize(): void {
    // Ambil akses langsung elemen dari saku Map jika butuh mengikat event eksternal
    // console.log(`[Section Connected] Blueprint for component "${this.name}" successfully deployed.`);
  }
}
