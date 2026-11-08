import type { iBuilderConfig, iBuilderRegistry } from "@aio-ui/core/interface";
import { Builder } from "@aio-ui/base/Base";
// import "./Carousel.css";

export type CarouselElementType =
  | "@container"
  | "@carousel"
  | "@carousel>control"
  | "@carousel>control>prev"
  | "@carousel>control>next"
  | "@carousel>navigations"
  | "@carousel>navigations>dot"
  | "@carousel>track"
  | "@carousel>track>slide"
  | "@carousel>track>slide>inner"
  | "@carousel>track>slide>caption"
  | "@carousel>track>slide>title"
  | "@carousel>track>slide>desc"
  | "@carousel>track>slide>image";

export interface iCarouselConfig extends iBuilderConfig<CarouselElementType> {
  container?: null | string | HTMLElement;
  showControl?: boolean | "auto";
  showNavigation?: boolean | "auto";
  autoPlay?: boolean | number;
  vertical?: boolean;
  slidesPerView?: number;
  animation?: iCarouselAnimation;
  loop?: boolean;
  slideHeight?: string;
  slideWidth?: string;
  pauseOnHover?: boolean;
}

export const AttrsConfigKeys = [
  "data-carousel",
  "data-show-control",
  "data-show-navigation",
  "data-autoplay",
  "data-vertical",
  "data-slides-per-view",
  "data-animation",
  "data-loop",
  "data-slide-height",
  "data-slide-width",
  "data-pause-on-hover",
] as const;

type CarouselAttrKeys = typeof AttrsConfigKeys[number];

export type iCarouselAttrsConfig = {
  [K in CarouselAttrKeys]: any;
};

export const dataAttrsConfig: iCarouselAttrsConfig = {
  "data-carousel": "",
  "data-show-control": true,
  "data-show-navigation": true,
  "data-autoplay": true,
  "data-vertical": true,
  "data-slides-per-view": 1,
  "data-animation": "slide-left",
  "data-loop": true,
  "data-slide-height": "",
  "data-slide-width": "",
  "data-pause-on-hover": true,
}

export const AttrsConfigMap: iCarouselAttrsConfig = {
  "data-carousel": "carousel",
  "data-show-control": "showControl",
  "data-show-navigation": "showNavigation",
  "data-autoplay": "autoPlay",
  "data-vertical": "vertical",
  "data-slides-per-view": "slidesPerView",
  "data-animation": "animation",
  "data-loop": "loop",
  "data-slide-height": "slideHeight",
  "data-slide-width": "slideWidth",
  "data-pause-on-hover": "pauseOnHover",
}

type iCarouselAnimation = 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down'

interface iResolvedConfig extends iCarouselConfig {
  maxIndex: number;
  maxDots: number;
  isSliding: boolean;
};

export class CarouselBuilder extends Builder<CarouselElementType, iCarouselConfig> {
  readonly builderId: keyof iBuilderRegistry = "carousel";
  readonly name: keyof iBuilderRegistry = "carousel";
  readonly stylesheet: string = "./Carousel.css";

  // Instance State Variables
  private currentIndex = 0;
  private autoPlayTimer: number | undefined;

  private rConfig!: iResolvedConfig;

  // Element References
  private container!: HTMLElement;
  private track!: HTMLElement;
  private slides: HTMLElement[] = [];
  private dots: HTMLElement[] = [];
  private buttons: HTMLButtonElement[] = [];


  constructor(config: Partial<iCarouselConfig> = {}) {
    super();

    const defaultSelectors = {
      "@container": { tagName: "div", className: "carousel-widget-wrapper" },
      "@carousel": { tagName: "div", className: "carousel" },
      "@carousel>control": { tagName: "div", className: "control-group" },
      "@carousel>control>prev": { tagName: "button", className: "control prev" },
      "@carousel>control>next": { tagName: "button", className: "control next" },
      "@carousel>navigations": { tagName: "div", className: "navigations" },
      "@carousel>navigations>dot": { tagName: "button", className: "dot" },
      "@carousel>track": { tagName: "div", className: "track" },
      "@carousel>track>slide": { tagName: "div", className: "slide" },
      "@carousel>track>slide>inner": { tagName: "div", className: "slide-inner" },
      "@carousel>track>slide>caption": { tagName: "div", className: "caption" },
      "@carousel>track>slide>title": { tagName: "h3", className: "title" },
      "@carousel>track>slide>desc": { tagName: "p", className: "desc" },
      "@carousel>track>slide>image": { tagName: "img", className: "img-fluid" }
    };

    const defaultConfig: Required<iCarouselConfig> = {
      themeId: "default",
      container: "",
      showNavigation: true,
      showControl: "auto",
      autoPlay: 4000,
      animation: "fade",
      slidesPerView: 1,
      vertical: false,
      loop: true,
      pauseOnHover: true,
      slideHeight: "",
      slideWidth: "",
      selectors: defaultSelectors,
      namespace: null,
      emit: null
    };

    this.config = this.resolveConfig(defaultConfig, config);

  }

  public prepare(data: any, _config?: Required<iCarouselConfig> | undefined): HTMLElement | Record<string, any | HTMLElement> {

    // Bersihkan state internal instance komponen secara steril
    this.unmount();
    this.currentIndex = 0;
    this.slides = [];
    this.dots = [];
    this.buttons = [];

    if (data?.config) {
      this.config = this.resolveConfig(this.config, data.config);
    }

    // `container` may be an element, a selector, or nothing. Resolve it once here so the
    // render path never has to care which form the caller used.
    const host = this.resolveContainer(this.config.container);

    // Bangun seluruh pohon DOM secara rekursif & deklaratif lewat template()
    // (satu-satunya pusat logika pembuatan DOM — sejalan dengan pola Accordion).
    const carousel = this.render("@carousel", data) as HTMLElement;

    // Pasang elemen hidup ke kontainer fisik sesuai konfigurasi pengguna.
    if (host) {
      host.appendChild(carousel);
      this.container = host;
    } else {
      this.container = carousel;
    }

    return this.container;
  }

  /** Accept `"#id"`, `".class"`, an element, or nothing. Nothing means "I am the root". */
  private resolveContainer(target: iCarouselConfig["container"]): HTMLElement | null {
    if (!target) return null;
    if (target instanceof HTMLElement) return target;
    if (typeof target === "string") return document.querySelector(target) as HTMLElement | null;
    return null;
  }

  public initialize(carousel: HTMLElement): void {
    // Standalone bootstrapping (`run()`) may reach initialize() before any template ran.
    if (!this.rConfig) {
      this.rConfig = this.resolveRuntimeConfig(carousel, {}, this.slides.length);
    }

    if (this.rConfig.showControl && this.slides.length > 1) {
      this.attachControls(carousel!);
    }

    if (this.rConfig.showNavigation && this.slides.length > 1) {
      const maxDotsLimit = this.rConfig.maxDots || this.slides.length;
      this.attachNavigation(carousel!, this.slides.slice(0, maxDotsLimit));
    }

    // 6. MODULAR ROUTER TERMINAL: Jalankan jalur penataan spesifik tanpa melompat layout
    if (this.rConfig.vertical) {
      this.renderVerticalMode(carousel);
    } else {
      this.renderHorizontalMode(carousel);
    }

    // 8. Nyalakan sistem pemutar otomatis secara tertib
    if (this.rConfig.autoPlay) {
      this.startAutoPlay();
    }

    // 9. Hover wiring. Stable refs + remove-before-add: calling initialize() twice on the
    // same element must not stack listeners (a stale listener would pause forever).
    carousel.removeEventListener("mouseenter", this.handleEnter);
    carousel.removeEventListener("mouseleave", this.handleLeave);
    if (this.config.pauseOnHover || this.config.showControl === 'auto' || this.config.showNavigation === 'auto') {
      carousel.addEventListener("mouseenter", this.handleEnter);
      carousel.addEventListener("mouseleave", this.handleLeave);
    }
  }

  private handleEnter = (event: Event): void => {
    const el = event.currentTarget as HTMLElement;
    if (this.config.pauseOnHover && this.autoPlayTimer) {
      window.clearInterval(this.autoPlayTimer);
      this.autoPlayTimer = undefined;
    }
    el.classList.add('hovering');
  };

  private handleLeave = (event: Event): void => {
    const el = event.currentTarget as HTMLElement;
    if (this.config.pauseOnHover && this.rConfig.autoPlay) {
      this.startAutoPlay();
    }
    el.classList.remove('hovering');
  };

  protected template(typeKey: CarouselElementType, el: HTMLElement, payload?: any): void {
    const isVert = this.config?.vertical;

    switch (typeKey) {
      case "@carousel":
        // Siram kelas nama animasi dinamis bawaan config spreadsheet Sheets Anda
        el.className = `carousel anim-${this.config.animation} ${el.className || ""}`.trim();
        el.setAttribute("role", "region");
        el.setAttribute("aria-roledescription", "carousel");
        if (this.config.showControl === 'auto' || this.config.showNavigation === 'auto') {
          el.classList.add('auto-controls');
        }

        // 🧱 BANGUN KERANGKA UTAMA: Kunci config runtime lalu rakit balok track + slides.
        // Dilewati pasif pada jalur bootstrapper manual (run) — slides/track sudah hidup di DOM.
        // `content` may arrive wrapped (`{ content: [...] }`) or bare (`[...]`); both work.
        const slideData = Array.isArray(payload) ? payload : payload?.content;
        if (this.slides.length === 0 && Array.isArray(slideData)) {
          this.rConfig = this.resolveRuntimeConfig(el, payload, slideData.length);

          const track = this.render("@carousel>track", slideData) as HTMLElement;
          this.track = track;
          if (track) el.appendChild(track);
        }
        break;

      case "@carousel>track":
        // Rakit seluruh gerbong slide secara rekursif, sejalan dengan pola Accordion.
        const items = Array.isArray(payload) ? payload : [];
        this.slides = items.map((item, index) => {
          const slide = this.render("@carousel>track>slide", { ...item, index, total: items.length }) as HTMLElement;
          if (slide) el.appendChild(slide);
          return slide;
        });
        break;

      case "@carousel>track>slide": {
        el.setAttribute("role", "group");
        el.setAttribute("aria-roledescription", "slide");
        if (typeof payload?.index === "number") {
          const total = payload.total ?? this.slides.length ?? "?";
          el.setAttribute("aria-label", `${payload.index + 1} / ${total}`);
        }
        const inner = this.render("@carousel>track>slide>inner", payload) as HTMLElement;
        if (inner) el.appendChild(inner);
        break;
      }

      case "@carousel>track>slide>inner": {
        if (payload?.image || payload?.imageUrl) {
          const img = this.render("@carousel>track>slide>image", payload);
          if (img) el.appendChild(img);
        }

        if (payload?.title || payload?.description) {
          const caption = this.render("@carousel>track>slide>caption", payload);
          if (caption) el.appendChild(caption);
        }
        break;
      }

      case "@carousel>track>slide>caption": {
        if (payload?.title) {
          const title = this.render("@carousel>track>slide>title", payload);
          if (title) el.appendChild(title);
        }
        if (payload?.description) {
          const desc = this.render("@carousel>track>slide>desc", payload);
          if (desc) el.appendChild(desc);
        }
        break;
      }

      case "@carousel>track>slide>image": {
        const img = el as HTMLImageElement;
        img.src = encodeURI(payload?.image || payload?.imageUrl || "");
        img.alt = payload?.title || "carousel-slide-graphic";
        break;
      }

      case "@carousel>track>slide>title":
        el.textContent = payload?.title || "";
        break;

      case "@carousel>track>slide>desc":
        el.textContent = payload?.description || "";
        break;

      case "@carousel>control>prev":
        el.innerHTML = isVert ? "&#9650;" : "&#10094;"; // ▲ atau ❮ secara semantik
        el.setAttribute("aria-label", "Previous slide");
        el.setAttribute("type", "button");
        if (typeof payload?.onSelect === "function") el.onclick = payload.onSelect;
        break;

      case "@carousel>control>next":
        el.innerHTML = isVert ? "&#9660;" : "&#10095;"; // ▼ atau ❯ secara semantik
        el.setAttribute("aria-label", "Next slide");
        el.setAttribute("type", "button");
        if (typeof payload?.onSelect === "function") el.onclick = payload.onSelect;
        break;

      case "@carousel>navigations": {
        el.className = `navigations ${payload?.vertical ? "vertical-dots" : "horizontal-dots"}`;
        el.setAttribute("role", "group");
        el.setAttribute("aria-label", "Slide navigation");
        const count = payload?.count ?? 0;
        const onSelect = payload?.onSelect;
        for (let index = 0; index < count; index++) {
          const dot = this.render("@carousel>navigations>dot", {
            active: index === 0,
            index,
            onSelect: typeof onSelect === "function" ? () => onSelect(index) : undefined
          }) as HTMLButtonElement;
          this.dots.push(dot);
          el.appendChild(dot);
        }
        break;
      }

      case "@carousel>navigations>dot":
        el.className = "dot";
        el.setAttribute("type", "button");
        el.setAttribute("aria-label", `Go to slide ${(payload?.index ?? 0) + 1}`);
        if (payload?.active) {
          el.classList.add("active");
          el.setAttribute("aria-current", "true");
        }
        if (typeof payload?.onSelect === "function") el.onclick = payload.onSelect;
        break;
    }
  }


  // Inside Components/CarouselBuilder.ts -> Converted to your Pure Custom Bootstrapper Specification

  /**
   * 👑 THE UNIVERSAL PROGRESSIVE BOOTSTRAPPER (THE FINAL HOLY GRAIL)
   * 100% Menggunakan logika cerdas Anda! Memanfaatkan render() resmi untuk meregistrasikan 
   * elemen manual secara legal, aman, dan kebal dari pembatasan Private Fields #nodes!
   */
  public run(el?: HTMLElement): void {
    let targetCarousel = el;

    if (!targetCarousel) {
      targetCarousel = document.querySelector(".carousel") as HTMLElement;
    }

    if (!targetCarousel) {
      console.warn(
        `🚨 [Carousel Bootstrapper Warning]: Failed to manually activate Carousel.\n` +
        `Reason: No active live element matching selector ".carousel" was found in the DOM Tree.`
      );
      return;
    }

    // ====================================================
    // 🛡️ BENTENG PERTAHANAN PENYELAMAT MEMORI (IDE LOGIS ANDA!)
    // 1. Eksekusi pembersihan total di level paling atas agar RAM dicuci resik saat refresh!
    // ====================================================
    this.destroy();
    if (this.autoPlayTimer) {
      window.clearInterval(this.autoPlayTimer);
      this.autoPlayTimer = undefined;
    }

    console.log(`🚀 [Carousel Bootstrapper]: Bootstrapping live markup for #${targetCarousel.id || "vanilla-carousel"}.`);

    // 2. Ambil referensi internal gerbong slides fisik yang ditulis manual di HTML luar
    this.slides = Array.from(targetCarousel.querySelectorAll(".slide")) as HTMLElement[];
    this.track = targetCarousel.querySelector(".track") as HTMLElement || targetCarousel;

    // 3. ONE-SHOT CONFIG RESOLUTION: Peras atribut data- dari fisik element RAM seketika!
    this.resolveRuntimeConfig(targetCarousel, {}, this.slides.length);

    // ====================================================
    // 🧙‍♂️ THE SOVEREIGN REGISTRATION BYPASS (MAHKOTA LOGIKA JENIUS ANDA!)
    // Kita panggil render() pusat. Karena kita menyuapkan parameter payload kustom,
    // elemen HTML manual ini otomatis ter-store secara 100% legal dan suci ke dalam #nodes privat!
    // ====================================================
    // Catatan: Jika Base Class render mengembalikan elemen baru, kita pastikan data- data-nya tetap tersinkron
    // this.render("@container", {});
    this.render("@carousel", {});

    // 4. Detonasi sakelar interaksi hidup pergerakan dan event listeners hover secara otomatis!
    this.initialize(targetCarousel);

    console.log(`✨ [Carousel Bootstrapper]: Manual HTML markup successfully activated via Legal #nodes Registration!`);
  }


  /**
  * TERMINAL MODUL 1: Menghidupkan total penataan jalur mendatar (Horizontal)
  */
  private renderHorizontalMode(carousel: HTMLElement): void {
    carousel.classList.add("orient-horizontal");

    const totalSlides = this.slides.length;
    const slidesPerView = this.rConfig.slidesPerView || 1;

    if (this.rConfig.animation === 'fade') {
      // Fade Mode: CSS handles stacking via .anim-fade CSS grid.
      // Clear any inline styles that might interfere.
      this.track.style.display = "";
      this.track.style.position = "";
      this.track.style.width = "";
      this.track.style.height = "";
    } else {
      // Sliding Modes: Use flex layout to arrange slides in a row
      this.track.style.display = "flex";
      this.track.style.flexDirection = this.rConfig.animation === 'slide-right' ? "row-reverse" : "row";
      this.track.style.height = "100%";

      const trackWidthPercentage = (totalSlides / slidesPerView) * 100;
      this.track.style.width = `${trackWidthPercentage}%`;

      const slideSizeInTrack = 100 / totalSlides;
      this.slides.forEach((slide) => {
        slide.style.position = "relative";
        slide.style.flex = this.rConfig.slideWidth && this.rConfig.slideWidth !== "auto" ? "none" : `0 0 ${slideSizeInTrack}%`;
        slide.style.width = this.rConfig.slideWidth || `${slideSizeInTrack}%`;
        slide.style.height = this.rConfig.slideHeight || "100%";
      });
    }

    this.animate(true);
  }

  /**
   * TERMINAL MODUL 2: Menghidupkan total penataan jalur tegak lurus (Vertical)
   */
  private renderVerticalMode(carousel: HTMLElement): void {
    carousel.classList.add("orient-vertical");
    this.track.style.display = "flex";
    this.track.style.flexDirection = this.rConfig.animation === 'slide-down' ? "column-reverse" : "column";
    this.track.style.width = "100%";

    const totalSlides = this.slides.length;
    const slidesPerView = this.rConfig.slidesPerView || 1;

    // 🧙‍♂️ FORMULA VERTIKAL FIX: Luaskan tinggi track raksasa secara linear ke arah BAWAH!
    // Contoh: 6 slides, slidesPerView 3 -> total tinggi track = 200% dari tinggi jendela intip
    const trackHeightPercentage = (totalSlides / slidesPerView) * 100;
    this.track.style.height = `${trackHeightPercentage}%`;

    // Ukuran tinggi per slide anak mengecil proporsional di dalam track raksasa vertikal
    // Contoh: 6 slides -> tinggi per slide = 100% / 6 = 16.666% dari total tinggi track raksasa
    const slideSizeInTrack = 100 / totalSlides;

    this.slides.forEach((slide) => {
      slide.style.position = "relative";
      slide.style.flex = this.rConfig.slideHeight && this.rConfig.slideHeight !== "auto" ? "none" : `0 0 ${slideSizeInTrack}%`;
      slide.style.height = this.rConfig.slideHeight || `${slideSizeInTrack}%`;
      if (!this.rConfig.slideHeight || this.rConfig.slideHeight === "auto") {
        slide.style.maxHeight = `${slideSizeInTrack}%`;
      }
      slide.style.width = this.rConfig.slideWidth || "100%";
    });

    this.animate(true);
  }


  /**
   * 🎢 PUSAT KENDALI PENGANIMASIAN MODULAR (ANTI-JUMPING GUARANTEED)
   */
  private animate(immediate = false): void {
    // A. FADE MODE — CSS-driven transitions on individual slides
    if (this.rConfig.animation === 'fade' && !this.rConfig.vertical) {
      // For immediate (initial render), suppress CSS transitions temporarily
      if (immediate) {
        this.slides.forEach(slide => {
          slide.style.transition = "none";
        });
      }

      this.slides.forEach((slide, idx) => {
        if (idx === this.currentIndex) {
          slide.classList.add("active");
        } else {
          slide.classList.remove("active");
        }
      });
      this.track.style.transform = "none";

      // Re-enable CSS transitions after the forced paint
      if (immediate) {
        requestAnimationFrame(() => {
          this.slides.forEach(slide => {
            slide.style.transition = "";
          });
        });
      }
      return;
    }

    // B. SLIDING MODES — track-level transform transition
    if (immediate) {
      this.track.style.transition = "none";
    } else {
      this.track.style.transition = this.rConfig.vertical
        ? "transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)"
        : "transform 0.5s ease-in-out";
    }

    const totalSlides = this.slides.length;
    if (totalSlides === 0) return;

    if (this.rConfig.vertical) {
      const slideSizeInTrack = 100 / totalSlides;
      const direction = this.rConfig.animation === 'slide-down' ? 1 : -1;
      const offset = this.currentIndex * slideSizeInTrack * direction;
      this.track.style.transform = `translateY(${offset}%)`;
    } else {
      const slideSizeInTrack = 100 / totalSlides;
      const direction = this.rConfig.animation === 'slide-right' ? 1 : -1;
      const offset = this.currentIndex * slideSizeInTrack * direction;
      this.track.style.transform = `translateX(${offset}%)`;
    }

    // Sync active class for caption animations
    this.slides.forEach((slide, idx) => {
      if (idx === this.currentIndex) slide.classList.add("active");
      else slide.classList.remove("active");
    });
  }

  public next = (): void => this._navigateTo(this.currentIndex + 1);
  public previous = (): void => this._navigateTo(this.currentIndex - 1);

  public _navigateTo(index: number, immediate = false): void {
    const totalSlides = this.slides.length;
    if (totalSlides === 0) return;

    const maxIndex = this.rConfig.maxIndex;
    const loop = Boolean(this.rConfig.loop);

    let targetIndex: number;
    if (loop) {
      // Wrap around on both ends.
      targetIndex = index > maxIndex ? 0 : index < 0 ? maxIndex : index;
    } else {
      // Out of range means "the carousel has ended" — clamp, and stop autoplay so the
      // timer does not keep firing on a dead edge.
      targetIndex = Math.min(Math.max(index, 0), maxIndex);
      if (index > maxIndex || index < 0) this.stopAutoPlay();
    }

    this.currentIndex = targetIndex;
    this.animate(immediate);
    this.renderDots();
  }

  private startAutoPlay(): void {
    if (this.rConfig.autoPlay && this.slides.length > 1 && !this.autoPlayTimer) {
      const interval = typeof this.rConfig.autoPlay === 'number' ? this.rConfig.autoPlay : 3000;
      this.autoPlayTimer = window.setInterval(this.next, interval);
    }
  }

  private stopAutoPlay(): void {
    if (this.autoPlayTimer) {
      window.clearInterval(this.autoPlayTimer);
      this.autoPlayTimer = undefined;
    }
  }

  private resetAutoPlay = (): void => {
    if (this.autoPlayTimer) {
      window.clearInterval(this.autoPlayTimer);
      this.startAutoPlay();
    }
  }

  private renderDots(): void {
    if (!this.rConfig.showNavigation || this.dots.length === 0) return;
    this.dots.forEach((dot, index) => {
      const isActive = index === this.currentIndex;
      dot.classList.toggle("active", isActive);
      if (isActive) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
  }

  private attachControls(carousel: HTMLElement): void {
    // Konstruksi tombol (innerHTML + onclick) dikerjakan oleh template() — di sini cuma wiring & penancapan.
    const group = this.render("@carousel>control", {}) as HTMLElement;
    const prevBtn = this.render("@carousel>control>prev", {
      onSelect: () => { this.previous(); this.resetAutoPlay(); }
    }) as HTMLButtonElement;
    const nextBtn = this.render("@carousel>control>next", {
      onSelect: () => { this.next(); this.resetAutoPlay(); }
    }) as HTMLButtonElement;

    this.buttons.push(prevBtn, nextBtn);
    group.append(prevBtn, nextBtn);
    carousel.appendChild(group);
  }

  private attachNavigation(carousel: HTMLElement, navigableSlides: HTMLElement[]): void {
    // Seluruh balok navigasi (container class + loop dot + onclick) dirakit oleh template().
    const navContainer = this.render("@carousel>navigations", {
      count: navigableSlides.length,
      vertical: this.rConfig.vertical,
      onSelect: (index: number) => {
        this._navigateTo(index);
        this.resetAutoPlay();
      }
    }) as HTMLElement;
    carousel.appendChild(navContainer);
  }

  public unmount(): void {
    this.stopAutoPlay();
    this.buttons.forEach(b => b.onclick = null);
    this.dots.forEach(d => d.onclick = null);
    this.slides = [];
    this.dots = [];
    this.buttons = [];
    if (this.container && this.config.container) this.container.innerHTML = "";
  }

  private resolveRuntimeConfig(element: HTMLElement, payload: any, totalSlides?: number): iResolvedConfig {

    const mergeAttributes = (attrs: Record<string, any>): void => {
      for (const [dataKey, rawValue] of Object.entries(attrs)) {
        const targetKey = (AttrsConfigMap as any)[dataKey];
        if (targetKey && targetKey in this.config) {
          let finalValue = rawValue;
          const defaultType = typeof (this.config as any)[targetKey];
          if (defaultType === "boolean" && typeof rawValue === "string") {
            finalValue = rawValue === "true";
          } else if (defaultType === "number" && typeof rawValue === "string") {
            finalValue = Number(rawValue);
          } (this.config as any)[targetKey] = finalValue;
        }
      }
    }

    let dataAttrs: Record<string, any> = {};
    // A. PEMERASAN JALUR 1: Peras objek data payload Sheets bawaan server
    const secureAttributes = payload?.attrs || payload?.config || {};
    // B. PEMERASAN JALUR 2 (SIHIR ANDA!): Peras atribut data- dari fisik element RAM seketika!
    if (element instanceof HTMLElement) {
      for (const attr of Array.from(element.attributes)) {
        if (attr.name.startsWith("data-") || attr.name === "container") {
          dataAttrs[attr.name] = attr.value;
        }
      }
    }

    totalSlides = totalSlides ?? (Array.isArray(payload) ? payload.length : (payload?.content?.length ?? 0));

    mergeAttributes({ ...secureAttributes, ...dataAttrs });

    // C. KALKULASI RASIO MATEMATIKA UTANPA CADANGAN LOOPING GANDA
    const slidesPerView = this.config.slidesPerView || 1;
    let animation = this.config.animation || 'fade';
    const vertical = this.config.vertical === true;

    if (vertical && animation === 'fade') animation = 'slide-up';
    if (!vertical && slidesPerView > 1 && animation === 'fade') animation = 'slide-left';

    const isSliding = animation.startsWith('slide');
    const maxIndex = isSliding ? totalSlides! - slidesPerView : totalSlides! - 1;
    const maxDots = isSliding ? totalSlides! - slidesPerView + 1 : totalSlides;

    // Kunci mati rConfig satu pintu untuk selamanya!
    return {
      showControl: this.config.showControl ?? true,
      showNavigation: this.config.showNavigation ?? true,
      autoPlay: this.config.autoPlay ?? 4000,
      animation, slidesPerView, vertical, loop: this.config.loop ?? true,
      slideHeight: this.config.slideHeight, slideWidth: this.config.slideWidth,
      pauseOnHover: this.config.pauseOnHover ?? true,
      isSliding,
      maxIndex: maxIndex > 0 ? maxIndex : 0,
      maxDots: maxDots! > 0 ? maxDots! : 1
    };
  }

}

