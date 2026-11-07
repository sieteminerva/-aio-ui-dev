import type { iActionProperty, iBasicNode, iBuilderConfig, iBuilderRegistry } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base/Base";

export type FooterElementType =
  | "@footer"
  | "@footer>row"
  | "@footer>row>column"
  | "@footer>row>column>header"
  | "@footer>row>column>desc"
  | "@footer>row>column>list"
  | "@footer>row>column>list>item"
  | "@footer>copyright"

export interface iFooterConfig extends iBuilderConfig<FooterElementType> {
  useCopyright: boolean,
  useInfo: boolean
}


export class FooterBuilder extends Builder<FooterElementType, iFooterConfig> {
  readonly builderId: keyof iBuilderRegistry = "footer";
  readonly name: keyof iBuilderRegistry = "footer";
  readonly stylesheet: string = "";
  public config: Required<iFooterConfig>

  constructor(config: Partial<iFooterConfig> = {}) {
    super();
    const defaultSelectors = {
      "@footer": { tagName: "footer", className: "footer" },
      "@footer>row": { tagName: "div", className: "row" },
      "@footer>row>column": { tagName: "div", className: "column" },
      "@footer>row>column>header": { tagName: "h2", className: "header" },
      "@footer>row>column>desc": { tagName: "p", className: "desc" },
      "@footer>row>column>list": { tagName: "ul", className: "unstyled-list" },
      "@footer>row>column>list>item": { tagName: "li", className: "item" },
      "@footer>copyright": { tagName: "div", className: "row" }
    };

    const defaultConfig: Required<iFooterConfig> = {
      themeId: "default",
      useInfo: true,
      useCopyright: true,
      selectors: defaultSelectors,
      namespace: null,
      emit: () => { }
    };

    this.config = this.resolveConfig(defaultConfig, config);

  }

  createLegacy(data: iBasicNode, _config: Partial<iFooterConfig> = {}): HTMLElement {
    if (_config) this.config = this.resolveConfig(this.config, _config);
    // console.log("FooterBuilder", { data })
    const content = data.content as iBasicNode;

    const footer = document.createElement('footer');
    footer.id = content.id as string;
    footer.className = content.className || "footer";

    // 1. Buat Baris Utama (Top Row)
    const topRow = document.createElement('div');
    topRow.className = 'row';

    // Kolom Kiri: Judul & Deskripsi
    const infoCol = document.createElement('div');
    infoCol.className = 'column';

    const h2 = document.createElement('h2');
    h2.className = "header"
    h2.textContent = content.title || '';
    infoCol.appendChild(h2);

    const pDesc = document.createElement('p');
    pDesc.textContent = content.description || '';
    infoCol.appendChild(pDesc);

    topRow.appendChild(infoCol);

    // Kolom Kanan: Daftar Kontak
    const contactCol = document.createElement('div');
    contactCol.className = 'column';

    const h3 = document.createElement('h3');
    h3.textContent = 'Kontak & Informasi';
    contactCol.appendChild(h3);

    const ul = document.createElement('ul');
    ul.className = 'unstyled-list';

    if (content.actions && Array.isArray(content.actions)) {
      content.actions.forEach((item: iActionProperty) => {
        const li = document.createElement('li');
        li.className = "item";
        const a = document.createElement('a');

        if (item.id) a.id = item.id as string;
        if (item.className) a.className = item.className as string;
        a.href = item.href as string || '#';

        // Menggabungkan label dan content teks secara aman
        a.textContent = `${item.label || ''} ${item.href || ''}`.trim();

        li.appendChild(a);
        ul.appendChild(li);
      });
    }

    contactCol.appendChild(ul);
    topRow.appendChild(contactCol);
    footer.appendChild(topRow);

    // 2. Buat Baris Bawah (Bottom Row - Copyright)
    const bottomRow = document.createElement('div');
    bottomRow.className = 'row bottom';

    const pCopy = document.createElement('p');
    pCopy.textContent = `© ${new Date().getFullYear()} ${content.title || ''}. All rights reserved.`;

    bottomRow.appendChild(pCopy);
    footer.appendChild(bottomRow);

    return footer;
  }

  public prepare(data: any): HTMLElement {

    const content = data.content || data;

    // 1. Lahirkan Cangkang Makro Terluar & Baris Utama
    const footer = this.render("@footer", content);

    // 🪐 INFO ROW
    if (this.config.useInfo) {
      const row = this.render("@footer>row", content);

      for (const col of content.columns) {

        const column = this.render("@footer>row>column", col);
        const header = this.render("@footer>row>column>header", col);
        const desc = this.render("@footer>row>column>desc", col);
        const list = this.render("@footer>row>column>list", content);

        // Loop linear menyemburkan baris atomik tautan link kontak dari Sheets (.unstyled-list>item)
        if (list) {
          const actions = Array.isArray(col.actions) ? col.actions : [];
          actions.forEach((payload: any) => {
            const item = this.render("@footer>row>column>list>item", payload);
            list.appendChild(item!);
          });
        }

        if (header) column?.appendChild(header);
        if (list) column?.appendChild(list)
        if (desc) column?.appendChild(desc);
        if (row) row.appendChild(column!);
      }

      footer?.appendChild(row!);
    }

    // 🪐 COPYRIGHT ROW
    if (this.config.useCopyright) {
      const row = this.render("@footer>copyright", content);
      if (row) footer?.appendChild(row);
    }

    // Amankan dan kembalikan elemen kontainer makro terluarnya secara standard via Map get!
    return this.load("@footer") as HTMLElement;
  }


  /**
   * 👑 THE SEPARATED HYDRATION VALVE (POS PENYIRAMAN DATA KEBAL XSS)
   * Mengunci pengisian nilai teks dan transformasi tag dinamis (Anchor) di RAM.
   */
  protected template(typeKey: FooterElementType, el: HTMLElement, payload?: any): void {
    if (!payload) return;

    switch (typeKey) {
      case "@footer":
        if (payload.id) el.id = payload.id;
        if (payload.className) el.className = payload.className;
        break;

      case "@footer>row>column>header":
        el.textContent = payload.title || "";
        break;

      case "@footer>row>column>desc":
        el.textContent = payload.description || "";
        break;

      case "@footer>row>column>list>item": {
        // Melahirkan tag jangkar <a> secara otonom di dalam rahim <li> list item
        const a = document.createElement("a");
        if (payload.id) a.id = payload.id;
        if (payload.className) a.className = payload.className;
        a.href = payload.href || "#";

        // Gabungkan label dan alamat link secara aman tanpa risiko kebocoran XSS
        a.textContent = `${payload.label || ""} ${payload.href || ""}`.trim();
        el.appendChild(a);
        break;
      }

      case "@footer>copyright": {
        el.classList.add("bottom")
        const pCopy = document.createElement("p");
        // 🔮 JIT TIMESTAMP INJECTION: Hitung tahun secara real-time saat mendarat di RAM browser
        pCopy.textContent = `© ${new Date().getFullYear()} ${payload.company || ""}. All rights reserved.`;
        el.appendChild(pCopy);
        break;
      }
    }
  }

  public initialize(): void {
    // console.log(`[Footer Lifecycle] Core structure connected successfully.`);
  }
}
