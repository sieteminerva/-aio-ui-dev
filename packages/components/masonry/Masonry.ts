import type { iActionProperty, iBasicNode, iBuilderConfig, iBuilderRegistry } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base/Base";
// import "./Masonry.css";

export type MasonryElementType =
  | "@container"

  | "@masonry"
  | "@masonry>filter"
  | "@masonry>filter>item"
  | "@masonry>filter>slider"

  | "@masonry>item"
  | "@masonry>item>image"
  | "@masonry>item>title"
  | "@masonry>item>desc"
  | "@masonry>item>actions"

  | "@masonry>modal"
  | "@masonry>modal>close"
  | "@masonry>modal>next"
  | "@masonry>modal>previous"

  | "@masonry>spinner"
  | "@masonry>trigger"
  | "@masonry>sentinel"

export interface iMasonryConfig extends iBuilderConfig<MasonryElementType> {
  container?: string | HTMLElement | null; // if defined will be the root container to replace <section>
  column: number; // how many column will be displayed on init
  lazyload: boolean; // lazyload the image / content
  maxDisplayed: number; // if content > maxDisplayed will create `more / next` button, and the loadMore will check the remaining content and load at maxDisplayed limit, and so on
  useLoadButton?: boolean;
  category: string | null;
  /**
   * Category highlighted on first render.
   *
   * `null` (default) shows everything — the "All" button is active. A name that is not
   * present in the current data falls back to `null` instead of rendering an empty grid.
   */
  defaultCategory?: string | null;

  loadFn?: null | ((page: number, category: string | null) => Promise<any[]>); // Default untuk load data baru dari GAS Server
  onScrollEnd?: null | (() => void);      // Meletup saat user menyentuh lantai terbawah dokumen bodi HTML
  onLoadTriggered?: null | ((page: number) => void); // Meletup tepat saat hitmundur loading data baru dimulai
}

export class MasonryBuilder extends Builder<MasonryElementType, iMasonryConfig> {
  readonly builderId: keyof iBuilderRegistry = "masonry";
  readonly name: keyof iBuilderRegistry = "masonry";
  public readonly stylesheet: string = "./Masonry.css";

  #items: (iBasicNode | HTMLElement)[] = [];
  private displayedCount = 0;
  private selectedCategory: string | null = null;

  private currentPage = 1;      // Penunjuk halaman untuk Apps Script Pagination
  private isServerFetching = false; // Flag pelindung agar tidak terjadi double-fetch tabrakan

  private modal!: {
    show: (index: number) => void;
    updateNavigation: () => void;
    destroy: () => void;
  };
  private observer?: IntersectionObserver;

  constructor(config: Partial<iMasonryConfig> = {}) {
    super();

    const defaultSelectors = {
      "@container": { tagName: "section", className: "masonry gallery" },
      "@masonry": { tagName: "div", className: "grid" },
      "@masonry>filter": { tagName: "div", className: "filter menu" },
      "@masonry>filter>item": { tagName: "button", className: "item" },
      "@masonry>filter>slider": { tagName: "span", className: "slider" },
      "@masonry>item": { tagName: "div", className: "item fade-in" },
      "@masonry>item>image": { tagName: "img" },
      "@masonry>item>title": { tagName: "h3", className: "title" },
      "@masonry>item>desc": { tagName: "p", className: "desc" },
      "@masonry>item>actions": { tagName: "div", className: "actions" },
      "@masonry>modal": { tagName: "div", className: "modal hidden" },
      "@masonry>modal>close": { tagName: "i", className: "icon close", wrapper: ".close" },
      "@masonry>modal>next": { tagName: "i", className: "icon right arrow", wrapper: ".next" },
      "@masonry>modal>previous": { tagName: "i", className: "icon left arrow", wrapper: ".previous" },
      "@masonry>spinner": { tagName: "div", className: "spinner hidden" },
      "@masonry>sentinel": { tagName: "div", className: "sentinel" },
      "@masonry>trigger": { tagName: "button", className: "more" },
    };

    const defaultConfig: Required<iMasonryConfig> = {
      themeId: "default",
      container: null,
      column: 3,
      lazyload: true,
      maxDisplayed: 5,
      useLoadButton: true,
      category: null,
      defaultCategory: null,
      selectors: defaultSelectors,
      loadFn: null, // Default untuk load data baru dari GAS Server
      onScrollEnd: null,    // Meletup saat user menyentuh lantai terbawah dokumen bodi HTML
      onLoadTriggered: null, // Meletup tepat saat hitmundur loading data baru dimulai
      namespace: null,
      emit: null
    };

    this.config = this.resolveConfig(defaultConfig, config);
  }

  /**
   * SETTER: Tempat validasi pusat untuk mengamankan data sebelum masuk ke aplikasi
   */
  public set items(newItems: (iBasicNode | HTMLElement)[]) {
    // Validasi Keamanan: Pastikan data berupa array dan lakukan pembersihan
    if (!Array.isArray(newItems)) {
      console.error('Validasi Gagal: Data masonry harus berupa array.');
      return;
    }

    // Bekukan data (Immutability) agar tidak bisa dimutasi secara ilegal dari luar skrip
    this.#items = newItems.map(item => {
      if (item instanceof HTMLElement) return item;

      // Sanitasi dasar: Pastikan properti penting aman dari manipulasi tipe data
      return Object.freeze({
        ...item,
        title: item.title ? String(item.title).trim() : undefined,
        description: item.description ? String(item.description).trim() : undefined,
        category: item.category ? String(item.category).trim() : undefined,
        image: item.image || item.imageUrl ? String(item.image || item.imageUrl).trim() : undefined
      });
    });
  }


  /**
   * GETTER KATEGORI: Menghitung daftar gambar yang AKTIF dan SUDAH TER-RENDER di layar saat ini
   * (Menghilangkan celah bypass modal data secara instan)
   */
  private get currentVisibleImages(): string[] {
    // 1. Ambil data yang lolos saringan kategori saat ini
    const filtered = this.#items.filter(item => {
      if (item instanceof HTMLElement) return false;
      return this.selectedCategory === null || item.category === this.selectedCategory;
    }) as iBasicNode[];

    // 2. Batasi hanya sebanyak jumlah item yang sedang aktif di-render di layar (displayedCount)
    const visibleBatch = filtered.slice(0, this.displayedCount);

    // 3. Ekstrak string URL gambarnya saja
    return visibleBatch.map(item => (item.image || item.imageUrl)).filter((img): img is string => !!img);
  }

  public prepare(data: any, _config?: Partial<iMasonryConfig>): HTMLElement {

    let normalizedData = data;
    if (Array.isArray(data)) {
      normalizedData = {
        id: this.config.container instanceof HTMLElement ? this.config.container.id : "masonry-legacy-root",
        className: "section masonry gallery",
        content: data // Alirkan array lama ke saku content standar v2
      };
    }

    // Pasok data array murni ksatria Anda ke Immutable Setter Tracker
    this.items = normalizedData.content || [];
    this.displayedCount = 0;
    this.currentPage = 1; // Reset nomor halaman awal

    const rootContainer = this.render("@container", normalizedData);

    const categoriesSet = new Set<string>();
    this.#items.forEach(item => {
      if (!(item instanceof HTMLElement) && item.category) categoriesSet.add(item.category.trim());
    });
    const categories = Array.from(categoriesSet);

    // Start on the configured category, or on "All" (null) when none is configured.
    // A name that does not exist in the current data also means "All": an empty grid on
    // first paint is worse than showing everything.
    const preferred = this.config.defaultCategory;
    this.selectedCategory = preferred && categories.includes(preferred) ? preferred : null;

    if (categories.length > 0) {
      const filterMenuElement = this._renderFilterMenu(categories, this.selectedCategory as string);
      rootContainer?.appendChild(filterMenuElement!);
    }

    const gridElement = this.render("@masonry", data);
    rootContainer?.appendChild(gridElement!);

    this.modal = this._initModal();

    // Jalankan penyaringan & pemuatan batch pagination pertama kali
    this._applyFilter(this.selectedCategory as string);

    return this.load("@container") as HTMLElement;
  }

  protected template(typeKey: MasonryElementType, el: HTMLElement, payload?: any): void {
    // 🧱 SELURUH LOGIKA PEMBANGUNAN DOM TERKONSENTRASI DI SINI (pola Accordion).
    // render() pusat menganugerahi setiap balok bersih, lalu template() merakit
    // keturunannya secara rekursif & menanamkan konten/data aktifnya.
    switch (typeKey) {
      case "@container":
        if (this.config.container instanceof HTMLElement) {
          el.id = this.config.container.id || el.id;
          el.className = `${this.config.container.className} ${el.className}`.trim();
        } else if (typeof this.config.container === 'string') {
          const target = document.querySelector(this.config.container);
          if (target) el.id = target.id;
        }
        break;

      case "@masonry":
        el.style.setProperty("--masonry-columns", this.config.column.toString());
        break;

      // ── FILTER MENU ─────────────────────────────────────────────
      case "@masonry>filter": {
        const categories: string[] = payload?.categories || [];
        const selected: string | null = payload?.selected ?? null;
        const onSelect = payload?.onSelect;

        // Tombol "All" (selalu tersedia sebagai pos default)
        const allBtn = this.render("@masonry>filter>item", {
          label: "All",
          active: selected === null,
          onSelect,
        });
        if (allBtn) el.appendChild(allBtn);

        // Tombol kategori hasil dedupe data
        categories.forEach((catName) => {
          const btn = this.render("@masonry>filter>item", {
            label: catName,
            active: selected === catName,
            onSelect,
          });
          if (btn) el.appendChild(btn);
        });

        // Indikator slider (digeser presisi oleh _updateSlider)
        const slider = this.render("@masonry>filter>slider");
        if (slider) el.appendChild(slider);
        break;
      }

      case "@masonry>filter>item":
        el.textContent = payload?.label || "";
        el.classList.toggle("active", !!payload?.active);
        (el as any)._categoryToken = payload?.label;
        // Wiring klik: teruskan label & elemen tombol untuk sinkronisasi slider
        if (typeof payload?.onSelect === "function") {
          el.onclick = () => payload.onSelect(payload.label, el);
        }
        break;

      // ── MASONRY CARD ───────────────────────────────────────────
      case "@masonry>item": {
        const content = payload?.item ?? payload;
        const modalIndex = payload?.modalIndex ?? -1;

        // Passthrough langsung untuk elemen DOM mentah yang disuntikkan pemanggil
        if (content instanceof HTMLElement) {
          el.appendChild(content);
          break;
        }

        const item = content as iBasicNode;
        if (item.className) el.classList.add(...String(item.className).split(" "));
        if (item.id) el.id = item.id;

        if (item.image || item.imageUrl) {
          const img = this.render("@masonry>item>image", { ...item, modalIndex });
          if (img) el.appendChild(img);
        }

        if (item.title) {
          const h2 = this.render("@masonry>item>title", item);
          if (h2) el.appendChild(h2);
        }

        if (item.description) {
          const p = this.render("@masonry>item>desc", item);
          if (p) el.appendChild(p);
        }

        if (item.actions && Array.isArray(item.actions)) {
          const actionsEl = this.render("@masonry>item>actions", item.actions);
          if (actionsEl) el.appendChild(actionsEl);
        }
        break;
      }

      case "@masonry>item>image": {
        const img = el as HTMLImageElement;
        img.src = encodeURI(payload?.image || payload?.imageUrl || "");
        img.alt = payload?.title || "Gallery image";
        if (this.config.lazyload) img.loading = "lazy";

        // Fallback saat URL gambar gagal dimuat dari server statis
        img.onerror = () => {
          img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://w3.org" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23222"/><text x="50" y="50" font-family="sans-serif" font-size="10" fill="%23666" text-anchor="middle" dominant-baseline="middle">Image Error</text></svg>';
        };

        img.style.cursor = "pointer";
        if (payload?.modalIndex !== undefined && payload?.modalIndex !== -1) {
          img.addEventListener("click", (e) => {
            e.stopPropagation();
            this.modal.show(payload.modalIndex);
          });
        }
        break;
      }

      case "@masonry>item>title":
        el.textContent = payload?.title || "";
        break;

      case "@masonry>item>desc":
        el.textContent = payload?.description || "";
        break;

      case "@masonry>item>actions": {
        const actions: iActionProperty[] = Array.isArray(payload) ? payload : [];
        for (const action of actions) {
          const btn = action.href ? document.createElement("a") : document.createElement("button");
          if (action.id) btn.id = action.id;
          if (btn instanceof HTMLAnchorElement && action.href) btn.href = action.href;
          btn.textContent = action.label || "Click";
          if (action.onClick) btn.addEventListener("click", (e) => action.onClick!(e as MouseEvent));
          el.appendChild(btn);
        }
        break;
      }

      // ── MODAL ─────────────────────────────────────────────────
      case "@masonry>modal>close":
        // el.innerHTML = "&times;";
        break;

      case "@masonry>modal>next":
        // el.innerHTML = "&#10095;"; // ❯
        break;

      case "@masonry>modal>previous":
        // el.innerHTML = "&#10094;"; // ❮
        break;

      // ── PAGINATION ─────────────────────────────────────────────
      case "@masonry>trigger":
        el.textContent = "Load More";
        break;
    }
  }

  public initialize(): void {
    const activeBtn = (this.load("@masonry>filter") as HTMLElement)?.querySelector(".item.active") as HTMLButtonElement;
    if (activeBtn) {
      // Browser sudah sukses menggambar ukuran piksel, hitung slider koordinat dengan presisi 100%!
      requestAnimationFrame(() => this._updateSlider(activeBtn, true));
    }
    // console.log("[Masonry Lifecycle] Advanced photo gallery layout synchronized successfully.");
  }

  public unmount(): void {
    // Panggil logika pembersih aseli bawaan Anda tanpa ada yang ketinggalan
    if (this.observer) {
      this.observer.disconnect();
      this.observer = undefined;
    }
    if (this.modal && typeof this.modal.destroy === 'function') {
      this.modal.destroy();
    }

    this.remove("@masonry>trigger", "@masonry>spinner")

    // Hancurkan saku Map dan likuidasi RAM via destroy base class terpusat!
    this.destroy();
  }

  private _initPaginationTrigger(root: HTMLElement): void {
    if (this.config.useLoadButton) {

      const button = (this.load("@masonry>trigger") || this.render("@masonry>trigger")) as HTMLButtonElement;
      button.onclick = () => this._handleNextBatchTrigger();
      root.append(button);
      // this._handleNextBatchTrigger();
    } else {
      const sentinel = (this.load("@masonry>sentinel") || this.render("@masonry>sentinel")) as HTMLElement;
      root.insertBefore(sentinel!, this.load("@masonry>spinner") as HTMLElement || null);

      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const totalInActiveCat = this.#items.filter(item => {
            if (item instanceof HTMLElement) return false;
            return this.selectedCategory === null || item.category === this.selectedCategory;
          }).length;

          if (entry.isIntersecting && this.displayedCount < totalInActiveCat) {
            this._handleNextBatchTrigger();
          }
        });
      }, { rootMargin: '200px' });

      this.observer.observe(sentinel!);
    }
    this._handleNextBatchTrigger();  // <= panggil dulu supaya first load ga kosong
  }

  private async _handleNextBatchTrigger(): Promise<void> {
    const filteredPool = this.#items.filter(item => this.selectedCategory === null || (item as any).category === this.selectedCategory);

    // 💡 Skenario A: Jika data lokal masih ada, suntikkan langsung brik fotonya ke layar
    if (this.displayedCount < filteredPool.length) {
      this._loadNextBatch();
      return;
    }

    // 💡 Skenario B: Jika data lokal sudah habis, tembak server JIT via loadFn andalan Anda!
    if (typeof this.config.loadFn === "function" && !this.isServerFetching) {
      this.isServerFetching = true;
      this.currentPage++;

      // Letupkan callback laporan waktu tunggu loading dimulai
      if (this.config.onLoadTriggered && typeof this.config.onLoadTriggered === "function") { this.config.onLoadTriggered(this.currentPage); }
      (this.load("@masonry>spinner") as HTMLElement)?.classList.remove('hidden');

      try {
        console.log(`🚀 [GAS Data Stream] Querying page ${this.currentPage} for category: ${this.selectedCategory}`);
        const freshServerItems = await this.config.loadFn(this.currentPage, this.selectedCategory);

        if (freshServerItems && freshServerItems.length > 0) {
          // ====================================================
          // 🔒 RAM LEAK PROTECTION SYSTEM (MANAJEMEN NEGATIVE MEMORY TRACKING)
          // Jika Galeri Anda super raksasa (ribuan foto), kita kuras array element 
          // angkatan paling lama dari dalam tabel _nodes pusat sebelum memasukkan yang baru!
          // ====================================================

          const itemNodesRecord = Array.from(
            (this.load("@masonry") as HTMLElement).querySelectorAll(".item")
          );
          if (itemNodesRecord.length > 24) {
            console.log(`🧹 [RAM Shield]: Flushing past batch elements to optimize physical RAM memory.`);
            // Potong dan hapus 8 elemen fisik pertama dari layar dokumen browser
            for (let i = 0; i < 8; i++) {
              const garbageNode = itemNodesRecord.shift();
              garbageNode?.remove();
            }
          }

          // Gabungkan data baru hantaran server ke dalam saku internal #items ksatria Anda!
          this.#items = [...this.#items, ...freshServerItems];
          // Semburkan angkatan baru tersebut langsung ke dinding grid
          this._loadNextBatch();
        } else {
          // Jika server memutahkan array kosong [], tandanya data di database GAS habis total!
          console.log(`🏁 [GAS Data Stream] Reach end of server rows database table.`);
          if (this.config.onScrollEnd && typeof this.config.onScrollEnd === "function") this.config.onScrollEnd(); // Letupkan callback penanda lantai terbawah
          this._killPaginationControls();
        }
      } catch (streamError) {
        console.error(`[GAS Data Stream Error]:`, streamError);
      } finally {
        this.isServerFetching = false;
        (this.load("@masonry>spinner") as HTMLElement)?.classList.add('hidden');
      }
    }
  }

  private _loadNextBatch(): void {

    const filtered = this.#items.filter(item => {
      if (item instanceof HTMLElement) return false;
      return this.selectedCategory === null || item.category === this.selectedCategory;
    });

    const start = this.displayedCount;
    const end = Math.min(start + this.config.maxDisplayed, filtered.length);

    this._syncColumnCount(filtered.length);

    if (start >= end) return;

    const spinner = this.load("@masonry>spinner") as HTMLElement;
    spinner?.classList.remove('hidden');

    const fragment = document.createDocumentFragment();
    // Hitung index modal dari item yang SUDAH ter-render di grid (bukan dari tabel _nodes pusat)
    const grid = this.load("@masonry") as HTMLElement;
    const renderedItems = grid.querySelectorAll(".item");
    let imageIndexCounter = renderedItems.length;
    let batchIndex = 0;

    for (let i = start; i < end; i++) {
      const content = filtered[i];
      let assignedIndex = -1;

      if (!(content instanceof HTMLElement) && (content.image || content.imageUrl)) {
        assignedIndex = imageIndexCounter;
        imageIndexCounter++;
      }

      const item = this._createItem(content, assignedIndex);
      item.style.setProperty('--batch-index', batchIndex.toString());
      batchIndex++;

      fragment.appendChild(item);
    }

    (this.load("@masonry") as HTMLElement).appendChild(fragment);
    this.displayedCount = end;

    this.modal.updateNavigation();

    // Jika seluruh data (lokal + server hantaran baru) sudah benar-benar habis, matikan kontroler
    if (this.displayedCount >= filtered.length && !this.config.loadFn) { this._killPaginationControls(); }

    setTimeout(() => {
      spinner?.classList.add('hidden');
    }, 200);

    if (this.displayedCount >= filtered.length) {
      if (this.observer) this.observer.disconnect();
      this.remove("@masonry>spinner")
    }
  }

  private _syncColumnCount(itemCount: number): void {
    const grid = this.load("@masonry") as HTMLElement | null;
    if (!grid) return;

    const configuredColumns = Math.max(1, Number(this.config.column) || 1);
    const availableColumns = itemCount > 0
      ? Math.min(configuredColumns, itemCount)
      : configuredColumns;

    grid.style.setProperty("--masonry-columns", String(availableColumns));
  }

  private _killPaginationControls(): void {
    if (this.observer) this.observer.disconnect();
    this.remove("@masonry>trigger", "@masonry>spinner");
  }

  private _renderFilterMenu(categories: string[], selectedCategory: string) {
    // Seluruh balok menu (tombol "All" + kategori + slider) dirakit oleh template()
    // lewat render("...") — pola Accordion. Di sini hanya menyambungkan wiring pilihan.
    const menu = this.render("@masonry>filter", {
      categories,
      selected: selectedCategory,
      onSelect: (category: string | null, activeBtn: HTMLButtonElement) => {
        this._handleCategoryChange(category === "All" ? null : category, activeBtn);
      },
    });

    return menu as HTMLElement
  }

  private _updateSlider = (activeBtn: HTMLButtonElement, isInit = false) => {
    const slider = this.load("@masonry>filter>slider") as HTMLElement;
    if (!slider || !activeBtn) return;

    // 1. Jika inisialisasi awal, matikan transisi agar tidak melompat dari atas/kiri screen
    if (isInit) {
      slider.style.transition = 'none';
    } else {
      // Kembalikan ke animasi bawaan jika ini adalah klik manual pengguna
      slider.style.transition = '';
    }

    // 2. Ambil posisi relatif menggunakan offsetLeft & offsetTop yang presisi terhadap induknya
    const leftPosition = activeBtn.offsetLeft;
    const topPosition = activeBtn.offsetTop;
    const width = activeBtn.offsetWidth;
    const height = activeBtn.offsetHeight;

    // 3. Terapkan dimensi dan geser menggunakan translate3d
    slider.style.width = `${width}px`;
    slider.style.height = `${height}px`;
    slider.style.transform = `translate3d(${leftPosition}px, ${topPosition}px, 0)`;

    // 🛡️ RETRY: Jika ukuran belum terhitung (0), tunggu frame berikutnya lalu ukur ulang
    if (activeBtn.offsetWidth === 0 && isInit) {
      requestAnimationFrame(() => {
        this._updateSlider(activeBtn, true)
      });
      return;
    }

    // 🎯 INIT SETTLE CORRECTION (FIX POSISI SLIDER NYUNGKUR KE BAWAH):
    // rAF pertama sering berjalan SELAGI layout flex-wrap & font menu masih bergeser,
    // sehingga offsetTop tombol aktif saat itu tertolak ke baris bawah. Alih-alih hanya
    // mengandalkan offsetWidth, kita ukur ulang setelah browser tuntas menggambar layout
    // (double-rAF + jeda mikro timeout) agar slider menempel presisi ke tombol aktif.
    if (isInit) {
      const settle = () => this._measureSlider(activeBtn);
      requestAnimationFrame(() => requestAnimationFrame(settle));
      window.setTimeout(settle, 350);
    }

    // 4. Jika baru diinisialisasi, hidupkan kembali transisinya di frame berikutnya agar klik berikutnya lancar
    if (isInit) {
      requestAnimationFrame(() => {
        // Berikan jeda mikro agar browser menerapkan posisi "none" terlebih dahulu
        setTimeout(() => {
          slider.style.transition = '';
        }, 50);
      });
    }
  }

  /**
   * Pengukur ulang slider dengan transisi dimatikan (untuk koreksi posisi saat init).
   * Dipisah dari _updateSlider agar panggilan berulang warnanya bersih tanpa animasi lompat.
   */
  private _measureSlider = (activeBtn: HTMLButtonElement) => {
    const slider = this.load("@masonry>filter>slider") as HTMLElement;
    if (!slider || !activeBtn) return;

    slider.style.transition = 'none';
    slider.style.width = `${activeBtn.offsetWidth}px`;
    slider.style.height = `${activeBtn.offsetHeight}px`;
    slider.style.transform = `translate3d(${activeBtn.offsetLeft}px, ${activeBtn.offsetTop}px, 0)`;

    // Nyalakan kembali transisi di frame berikutnya agar interaksi klik tetap mulus
    requestAnimationFrame(() => {
      slider.style.transition = '';
    });
  }

  private _handleCategoryChange(category: string | null, activeBtn: HTMLButtonElement): void {

    // Update class active pada tombol menu
    const splitActive = "active";

    (this.load("@masonry>filter") as HTMLElement)?.querySelectorAll(".item").forEach(btn => {
      btn.classList.remove(splitActive);
    });

    activeBtn.classList.add(splitActive);

    this._updateSlider(activeBtn);

    // Simpan ke config & jalankan re-render
    this.selectedCategory = category;
    // console.log({ selectedCategory: this.selectedCategory })
    this._applyFilter(category as string);
  }

  private _applyFilter(category: string) {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = undefined;
    }


    (this.load("@masonry") as HTMLElement).innerHTML = '';

    // Bersihkan buffer antrean memori brik lama dari _nodes pusat agar sinkronisasi index modal tidak kacau!
    this.remove(
      "@masonry>item",
      "@masonry>item>actions",
      "@masonry>item>image",
      "@masonry>item>title",
      "@masonry>item>desc",
      "@masonry>spinner",
      "@masonry>trigger",
    )

    const grid = this.load("@masonry") as HTMLElement;
    grid.innerHTML = '';

    this.displayedCount = 0;
    this.currentPage = 1;
    this.selectedCategory = category;

    const filteredCount = this.#items.filter(item => {
      if (item instanceof HTMLElement) return false;
      return category === null || item.category === category;
    }).length;
    this._syncColumnCount(filteredCount);

    // Sinkronisasi ulang navigasi modal
    this.modal.updateNavigation();

    const container = this.load("@container") as HTMLElement
    this._createSpinner(container);
    this._initPaginationTrigger(container);
  }

  private _createSpinner(root: HTMLElement): void {
    const spinner = (this.load("@masonry>spinner") || this.render("@masonry>spinner"));
    root.appendChild(spinner as HTMLElement);
  }

  private _createItem(content: iBasicNode | HTMLElement, modalIndex: number): HTMLElement {

    // Bangun seluruh jeroan kartu (gambar, judul, deskripsi, aksi) secara rekursif
    // lewat template() — pola Accordion. Di sini hanya menyalakan perilaku animasi.
    const card = this.render("@masonry>item", { item: content, modalIndex }) as HTMLElement;

    // SAFE CLASS REMOVAL: Menggunakan `animationend` untuk melepas class animasi
    // tanpa risiko bug macet (lebih andal daripada setTimeout)
    card?.addEventListener('animationend', () => {
      card.classList.remove("fade-in");
    }, { once: true });

    return card!;
  }

  private _initModal() {
    let currentIndex = 0;
    let isModalOpen = false;
    // 🟢 ABSOLUT TOKENIZED MODAL: Lahirkan seluruh suku cadangnya lewat render() pusat!
    const modalEl = this.render("@masonry>modal");
    const modalImg = document.createElement('img');
    // Gambar dinamis murni injeksi RAM loader
    modalImg.className = 'img';
    const closeBtn = this.render("@masonry>modal>close") as HTMLButtonElement;
    const nextBtn = this.render("@masonry>modal>next") as HTMLButtonElement;
    const prevBtn = this.render("@masonry>modal>previous") as HTMLButtonElement;

    modalEl?.append(prevBtn.__outer, modalImg, nextBtn.__outer, closeBtn.__outer);
    (this.load("@container") as HTMLElement)!.appendChild(modalEl!);

    const show = (index: number) => {
      const activeImages = this.currentVisibleImages;
      if (!activeImages.length) return;
      currentIndex = (index + activeImages.length) % activeImages.length;
      modalImg.src = activeImages[currentIndex];
      modalEl?.classList.remove('hidden');
      isModalOpen = true;
      setTimeout(() => modalEl?.focus(), 50);
    };

    const hide = () => {
      modalEl?.classList.add('hidden');
      isModalOpen = false;
    };

    const updateNavigation = () => {
      nextBtn.onclick = () => show(currentIndex + 1);
      prevBtn.onclick = () => show(currentIndex - 1);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isModalOpen) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault(); show(currentIndex + 1);
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault(); show(currentIndex - 1);
      }
      if (e.key === 'Escape') {
        e.preventDefault(); hide();
      }
    };

    closeBtn.onclick = hide;
    modalEl?.addEventListener('click', (e) => {
      if (e.target === modalEl) hide();
    });

    document.addEventListener('keydown', handleKeyDown);
    const destroy = () => {
      document.removeEventListener('keydown', handleKeyDown);
      modalEl?.remove();
    };
    return { show, updateNavigation, destroy };
  }
}

