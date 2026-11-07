import type { iBuilderConfig, iBuilderRegistry } from "../../interface";
import { Builder } from "../Base";


export type RatingVisualType = "star" | "round-bar" | "line-bar" | "count-up";

export type RatingElementType =
  | "@container"
  | "@rating"
  | "@rating>track"
  | "@rating>fill"
  | "@rating>label"
  | "@rating>stars-group"
  | "@rating>stars-item";

export interface iRatingConfig extends iBuilderConfig<RatingElementType> {
  type: RatingVisualType;  // Pintu gerbang penentu 4 tipe wajah visual!
  max: number;             // Batas nilai maksimal (e.g., 5 untuk star, 100 untuk bar)
  animate: boolean;        // Efek animasi transisi saat bar terisi atau angka count up
}

export class RatingBuilder extends Builder<RatingElementType, iRatingConfig> {
  readonly builderId: keyof iBuilderRegistry = "rating";
  readonly name: keyof iBuilderRegistry = "rating";
  readonly stylesheet: string = "";
  public config: Required<iRatingConfig>;

  constructor(config: Partial<iRatingConfig> = {}) {
    super();
    const defaultSelectors = {
      "@container": { tagName: "div", className: "rating-widget-wrapper" },
      "@rating": { tagName: "div", className: "rating-core-display" },
      "@rating>track": { tagName: "div", className: "bar-track" },
      "@rating>fill": { tagName: "div", className: "bar-fill" },
      "@rating>label": { tagName: "span", className: "rating-numerical-label" },
      "@rating>stars-group": { tagName: "div", className: "stars-row" },
      "@rating>stars-item": { tagName: "span", className: "star-icon" }
    };

    const defaultConfig: Required<iRatingConfig> = {
      themeId: "default",
      type: "count-up",
      max: 5,
      animate: true,
      selectors: defaultSelectors,
      namespace: null,
      emit: () => { }
    };

    this.config = { ...defaultConfig, ...config };
  }

  /**
   * 👑 THE POLYMORPHIC RATING COMPILER
   * Membaca properti config.type JIT untuk merakit organ tubuh secara otonom!
   */
  public prepare(data: any): HTMLElement {
    // console.log("]rating[", data)
    const score = typeof data === "number" ? data : (data.value || 0);

    // 1. Lahirkan Cangkang Makro Terluar (@container)
    const container = this.render("@container", { score });
    const coreWidget = this.render("@rating", { score });

    // ====================================================
    // 🔮 THE VISUAL BRANCHING LOGIC (ORCHESTRATION LAYER)
    // ====================================================

    // CASUS A: Visual Tipe Bintang (STAR RATING)
    if (this.config.type === "star") {
      const starsGroup = this.render("@rating>stars-group", { score });

      // Loop linear mencetak bintang sebanyak nilai maksimal kaku dari config (e.g., 5 bintang)
      for (let i = 1; i <= this.config.max; i++) {
        // Kirim status butir apakah bintang ini terisi penuh, setengah, atau kosong
        const isFull = i <= Math.floor(score);
        const isHalf = !isFull && (i - score < 1) && (i - score > 0);

        const starItem = this.render("@rating>stars-item", { isFull, isHalf, index: i });
        if (starItem && starsGroup) starsGroup.appendChild(starItem);
      }

      if (starsGroup) coreWidget?.appendChild(starsGroup);
    }

    // CASUS B & C: Visual Garis / Batang Lingkaran (LINE BAR & ROUND BAR)
    else if (this.config.type === "line-bar" || this.config.type === "round-bar") {
      const track = this.render("@rating>track", { score });
      const fill = this.render("@rating>fill", { score });

      if (track && fill) {
        track.appendChild(fill);
        coreWidget?.appendChild(track);
      }
    }

    // Selalu lahirkan Label Angka/Persentase di sisi samping widget untuk pelengkap info
    const label = this.render("@rating>label", { score });
    if (label) coreWidget?.appendChild(label);

    if (container && coreWidget) container.appendChild(coreWidget);

    return this.load("@container") as HTMLElement;
  }

  /**
   * 👑 ULTRA-CLEAN HYDRATION VALVE
   * 0% Teks XML Markup! Murni hanya bertugas mengelola status kelas logika (Class State Driver).
   */
  protected template(typeKey: RatingElementType, el: HTMLElement, payload?: any): void {
    if (!payload) return;

    // Hitung rasio matematis murni (0.0 sampai 1.0) untuk motor penggerak animasi CSS
    const ratio = Math.min(Math.max(payload.score / this.config.max, 0), 1);
    const percentage = Math.round(ratio * 100);

    switch (typeKey) {
      case "@container":
        el.className = `rating-widget-wrapper type-${this.config.type} ${el.className || ""}`.trim();
        break;

      case "@rating>track":
        // Jika bertipe bar, set properti CSS kustom (--progress-ratio) 
        // agar browser bisa menggambar ketebalan bulatan ring/garis secara otomatis via CSS!
        el.style.setProperty("--progress-ratio", ratio.toString());
        el.style.setProperty("--progress-percent", `${percentage}%`);
        break;

      case "@rating>fill":
        // JIT LINE BAR PROGRESS FILLING
        if (this.config.type === "line-bar") {
          el.style.width = this.config.animate ? "0%" : `${percentage}%`;
          if (this.config.animate) {
            window.requestAnimationFrame(() => { el.style.width = `${percentage}%`; });
          }
        }
        break;

      case "@rating>stars-item":
        // 🟢 ULTRA CLEAN DX: Cukup siram status kelas logikanya saja!
        // Urusan gambar SVG bintang diserahkan mutlak ke tangan properti CSS content!
        if (payload.isFull) {
          el.className = `${el.className} star-full`.trim();
        } else if (payload.isHalf) {
          el.className = `${el.className} star-half`.trim();
        } else {
          el.className = `${el.className} star-empty`.trim();
        }
        break;

      case "@rating>label":
        if (this.config.type === "count-up" || this.config.type === "round-bar" || this.config.type === "line-bar") {
          el.textContent = `${percentage}%`;
        } else {
          el.textContent = `${payload.score} / ${this.config.max}`;
        }
        break;
    }
  }


  /**
   * 👑 THE ENCAPSULATED INTERACTIVE EVENT BINDINGS
   * Mengatur detonasi jiwa interaksi, seperti efek animasi Count-Up angka persentase secara live.
   */
  public initialize(): void {
    const label = this.load("@rating>label") as HTMLElement;

    // ====================================================
    // 🧙‍♂️ REACTIVE COUNT-UP ENGINE (IF ACTIVE ON CONFIG)
    // ====================================================
    if (this.config.type === "count-up" && this.config.animate && label) {
      // Ambil nilai target persen asli dari teks label yang tadi disiram hydrate
      const targetPercent = parseInt(label.textContent || "0", 10);
      if (isNaN(targetPercent) || targetPercent === 0) return;

      let currentCount = 0;
      label.textContent = "0%";

      const stepDuration = Math.max(Math.floor(1500 / targetPercent), 10); // Rampungkan animasi dalam ~1.5 detik

      const counterTimer = window.setInterval(() => {
        currentCount++;
        label.textContent = `${currentCount}%`;

        if (currentCount >= targetPercent) {
          window.clearInterval(counterTimer);
        }
      }, stepDuration);

      // Amankan reference timer ke tubuh element agar ikut terkubur resik saat destroy() dipicu
      (label as any)._activeCountTimer = counterTimer;
    }
  }
}
