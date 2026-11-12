import type { iComponentManifest } from "@aio-ui/core";

/**
 * Teaching tiers.
 *
 * `category` says what a component *is* (layout / navigation / content / chrome);
 * `tier` says what it *costs* to use. The page groups by tier so the difficulty ramp is
 * visible, while the card keeps the category as classification.
 */
export const DEMO_TIERS = ["basic", "intermediate", "advanced"] as const;

export type DemoTier = (typeof DEMO_TIERS)[number];

export const TIER_LABELS: Record<DemoTier, string> = {
  basic: "Basic",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

/** One line per tier: the thing you must learn before the component works. */
export const TIER_COST: Record<DemoTier, string> = {
  basic: "payload saja — satu builder, satu elemen, tanpa config",
  intermediate: "butuh config atau handle kontrol (buka/tutup, state aktif)",
  advanced: "state, event, atau sub-modul yang hidup di dalam komponen",
};

/**
 * One Display variant.
 *
 * A variant changes the **payload** only: `build(name, payload)` has no third argument, and
 * the config a component sees comes from the registration. A row whose variants differ by
 * config needs its own registration, which is a different thing — not a variant.
 */
export interface iDemoVariant {
  /** Shown above the preview, e.g. `2 slide per view`. */
  label: string;
  payload: unknown;
}

/**
 * The demo table.
 *
 * One entry per component: where it loads from, what it needs, and how it is mounted.
 * Everything else in this example is derived from here — the registry, the loader map,
 * and the page itself. Adding a component means adding a row, not editing three files.
 *
 * `kind` exists because not every builder returns an element: `modal` returns control
 * handles (`open`/`close`/`element`) instead, which is a real API difference, not a bug.
 */
export interface iDemoEntry {
  /** Registry name, also the section id on the page. */
  name: string;
  /** Module specifier, resolved by the host loader map. */
  path: string;
  /** Stylesheet specifier; omitted when the component ships no CSS. */
  stylesheet?: string;
  category: "layout" | "navigation" | "content" | "chrome";
  /** How much wiring the component asks for; the page groups sections by this. */
  tier: DemoTier;
  kind: "element" | "modal";
  /**
   * The Display frame must act as the containing block: the component positions itself out
   * of flow (`fab`) or renders nothing until it is opened (`modal`), so a frame sized by its
   * content would be an empty strip. A display hint only — the builder receives nothing extra.
   */
  stage?: boolean;
  /** Payload handed to `build(name, payload)`. */
  payload: any;
  /** Config merged into the builder (selectors, callbacks, per-build options). */
  config?: Record<string, any>;
  /**
   * Extra Display variants. Declared, never derived: a row only adds one when it really has
   * a different configuration, so the Display panel cannot show a variant that does not exist.
   */
  variants?: iDemoVariant[];
  /** Set when the payload shape is a best guess rather than a verified contract. */
  note?: string;
}

const image = (label: string) => `https://placehold.co/600x400/222/fff?text=${encodeURIComponent(label)}`;

export const DEMO: iDemoEntry[] = [
  {
    // First row is the output of `node scripts/new-component.mjs badge` — kept in the
    // table so the scaffold stays proven against the real registry, not just typechecked.
    name: "badge",
    path: "@aio-ui/badge",
    stylesheet: "@aio-ui/badge/Badge.css",
    category: "content",
    tier: "basic",
    kind: "element",
    payload: {
      content: [
        { label: "Template", description: "Dihasilkan oleh scripts/new-component.mjs" },
        { label: "Konvensi", description: "ELEMENT_KEYS, selectors, prepare, template, initialize" },
      ],
    },
    config: { emphasis: true },
    note: "scaffolded: node scripts/new-component.mjs badge",
  },
  {
    name: "accordion",
    path: "@aio-ui/accordion",
    stylesheet: "@aio-ui/accordion/Accordion.css",
    category: "content",
    tier: "basic",
    kind: "element",
    // Shape from `.archives/travel-trip/content.ts:308` — items are `title` + `description`.
    payload: {
      content: [
        { title: "Apakah ada batas minimal peserta?", description: "Tidak. Kami siap membantu rombongan kecil maupun besar." },
        { title: "Apakah bisa reschedule?", description: "Ya, jika operasional dibatalkan karena cuaca." },
      ],
    },
  },
  {
    name: "carousel",
    path: "@aio-ui/carousel",
    stylesheet: "@aio-ui/carousel/Carousel.css",
    category: "content",
    tier: "advanced",
    kind: "element",
    // Shape from `content.ts:37` — slides are `title` + `description` + `image`.
    payload: {
      content: [
        { title: "Eksplorasi Keindahan", description: "Perjalanan privat yang tenang.", image: image("Slide 1") },
        { title: "Pantai Pasir Putih", description: "Pemandangan sunset yang luar biasa.", image: image("Slide 2") },
        { title: "Aktivitas Menyenangkan", description: "Snorkeling untuk semua umur.", image: image("Slide 3") },
        { title: "Pulau Pramuka", description: "Penangkaran penyu dan mangrove.", image: image("Slide 4") },
      ],
    },
    // Two slides per view, so the sliding path and the reduced dot count are exercised
    // instead of the default single-slide fade.
    config: { slidesPerView: 2, animation: "slide-left", showControl: true, showNavigation: true },
    note: "config: { slidesPerView: 2, animation: slide-left } → maxIndex = slides - perView",
  },
  {
    name: "code-block",
    path: "@aio-ui/code-block",
    stylesheet: "@aio-ui/code-block/CodeBlock.css",
    category: "content",
    tier: "basic",
    kind: "element",
    // Two blocks in one payload: the `{ blocks }` shape is what a docs page uses.
    payload: {
      blocks: [
        {
          code: ['const app = new AioApp({ container: "#app", source: { pages } });', "await app.render();"].join("\n"),
          label: "ts · mount",
          language: "ts",
        },
        { code: "npm run verify", label: "shell · gate" },
      ],
    },
  },
  {
    name: "tab",
    path: "@aio-ui/tab",
    stylesheet: "@aio-ui/tab/Tab.css",
    category: "layout",
    tier: "advanced",
    kind: "element",
    payload: {
      content: {
        menu: ["Panel A", "Panel B"],
        body: [{ content: "Isi panel A" }, { content: "Isi panel B" }],
      },
    },
  },
  {
    name: "section",
    path: "@aio-ui/section",
    stylesheet: "@aio-ui/section/Section.css",
    category: "layout",
    tier: "basic",
    kind: "element",
    // Shape from `.archives/travel-trip/content.ts:296` — one row, content is an array of
    // columns, and each column has its own `content` array of blocks.
    payload: {
      id: "demo-section",
      className: "demo",
      content: [
        {
          className: "column half",
          content: [
            {
              eyebrow: "Private trip",
              title: "Dua kolom, satu baris.",
              description:
                "Kolom teks di kiri, media di kanan. Di bawah 768px grid runtuh jadi satu kolom dan gambar mengambil lebar penuh.",
              actions: [{ label: "Lihat galeri", href: "#gallery" }, { label: "Tanya dulu" }],
            },
          ],
        },
        {
          className: "column half",
          content: [{ imageUrl: image("Section media"), alt: "Ilustrasi kolom media" }],
        },
      ],
    },
    note: "2 columns; image spans the full row under 768px",
  },
  {
    name: "footer",
    path: "@aio-ui/footer",
    stylesheet: "@aio-ui/footer/Footer.css",
    category: "layout",
    tier: "basic",
    kind: "element",
    // Row 1 = `content.columns` (any count), row 2 = copyright. Columns are free-form:
    // the first carries title + description, the second only actions.
    payload: {
      content: {
        id: "contact-section",
        company: "Agen Wisata SeribuTrip",
        columns: [
          {
            title: "Agen Wisata SeribuTrip",
            description: "Operator lokal resmi yang mengedepankan kenyamanan dan ketepatan.",
          },
          {
            title: "Kontak & Informasi",
            actions: [
              { label: "email", href: "halo@seributrip.id" },
              { label: "phone", href: "+628123456789" },
              { label: "address", href: "Dermaga 16 Marina Ancol, Jakarta" },
            ],
          },
        ],
      },
    },
    note: "row 1 = content.columns[] (dynamic), row 2 = copyright",
  },
  // {
  //   name: "menu",
  //   path: "@aio-ui/menu",
  //   stylesheet: "@aio-ui/menu/Menu.css",
  //   category: "navigation",
  //   kind: "element",
  //   // Flat list: first entry is the brand, an entry with `className: "button"` is the
  //   // action, the rest are navigation links. The hamburger is rendered by the builder.
  //   payload: {
  //     content: {
  //       navigations: [
  //         { href: "#kitchen", label: "@aio demo" },
  //         { href: "#product", label: "Product", title: "Product" },
  //         { href: "#article", label: "Article", title: "Article" },
  //         { href: "#form", label: "Pesan", className: "button" },
  //       ],
  //       actions: [],
  //     },
  //   },
  // },
  {
    name: "fab-menu",
    path: "@aio-ui/fabmenu",
    stylesheet: "@aio-ui/fabmenu/FabMenu.css",
    category: "navigation",
    tier: "intermediate",
    kind: "element",
    // `FabMenu.css` is `position: fixed`; in the frame it is contained, so it needs a stage.
    stage: true,
    // `FabMenu.prepare` reads `content.actions` and `content.title` — no wrapper.
    payload: {
      title: "Actions",
      actions: [{ label: "Satu" }, { label: "Dua" }, { label: "Tiga" }],
    },
  },
  {
    name: "mode-switcher",
    path: "@aio-ui/modeswitcher",
    stylesheet: "@aio-ui/modeswitcher/ModeSwitcher.css",
    category: "chrome",
    tier: "intermediate",
    kind: "element",
    payload: {},
  },
  {
    name: "pricing-card",
    path: "@aio-ui/pricingcard",
    stylesheet: "@aio-ui/pricingcard/PricingCard.css",
    category: "content",
    tier: "basic",
    kind: "element",
    // Shape from `content.ts:531` — an **array** of cards: `header`, `body[]`, `price`.
    payload: [
      {
        header: "Standard",
        body: [
          { title: "Kapal Kayu Tradisional" },
          { title: "Snorkeling Session" },
          { title: "Dokumentasi Drone", className: "disabled" },
          { title: "Mulai dari Rp 450.000 / pax", className: "price-tag" },
        ],
        price: 450000,
        action: { label: "Pilih" },
      },
      {
        header: "Medium",
        className: "is-featured",
        body: [
          { title: "Speedboat Kilat (Ancol)" },
          { title: "Snorkeling & Island Tour" },
          { title: "Mulai dari Rp 750.000 / pax", className: "price-tag" },
        ],
        price: 750000,
        action: { label: "Pilih" },
      },
    ],
  },
  {
    name: "modal",
    path: "@aio-ui/modal",
    stylesheet: "@aio-ui/modal/Modal.css",
    category: "chrome",
    tier: "intermediate",
    kind: "modal",
    stage: true,
    // `destroyOnClose: true` makes a modal single-use; a mounted demo wants reuse.
    payload: "Isi modal dari payload demo.",
    config: {
      id: "demo-modal",
      title: "Modal demo",
      destroyOnClose: false,
      onReady: (controls: any) => {
        (globalThis as any).__demoModal = controls;
      },
    },
    note: "config: { id, title, destroyOnClose: false = reuse, onReady(controls) }",
  },
];

/**
 * Every entry shares one manifest shape.
 *
 * The payload is handed over as `schema` on purpose: the demo table already describes
 * what the builder takes, so no `data.content` unwrapping happens in between. That is
 * the difference between this app and the gallery, where content trees are authored as
 * nodes and the registry picks `content`.
 */
export function manifestFor(entry: iDemoEntry) {
  return (data: unknown): iComponentManifest => ({
    path: entry.path,
    stylesheet: entry.stylesheet,
    config: entry.config,
    schema: data,
  });
}
