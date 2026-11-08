import type { iComponentManifest } from "@aio-ui/core/ComponentRegistry";

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
  kind: "element" | "modal";
  /** Payload handed to `build(name, payload)`. */
  payload: any;
  /** Config merged into the builder (selectors, callbacks, per-build options). */
  config?: Record<string, any>;
  /** Set when the payload shape is a best guess rather than a verified contract. */
  note?: string;
}

const image = (label: string) => `https://placehold.co/600x400/222/fff?text=${encodeURIComponent(label)}`;

export const DEMO: iDemoEntry[] = [
  {
    // First row is the output of `node scripts/new-component.mjs badge` — kept in the
    // table so the scaffold stays proven against the real registry, not just typechecked.
    name: "badge",
    path: "@aio-ui/badge/Badge",
    stylesheet: "@aio-ui/badge/Badge.css",
    category: "content",
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
    path: "@aio-ui/accordion/Accordion",
    stylesheet: "@aio-ui/accordion/Accordion.css",
    category: "content",
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
    path: "@aio-ui/carousel/Carousel",
    stylesheet: "@aio-ui/carousel/Carousel.css",
    category: "content",
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
    name: "tab",
    path: "@aio-ui/tab/Tab",
    stylesheet: "@aio-ui/tab/Tab.css",
    category: "layout",
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
    path: "@aio-ui/section/Section",
    category: "layout",
    kind: "element",
    // Shape from `.archives/travel-trip/content.ts:296` — one section, content is an
    // array of columns, and each column has its own `content` array.
    payload: {
      id: "demo-section",
      className: "demo",
      content: [
        {
          className: "column full",
          content: [
            { eyebrow: "Eyebrow", title: "Judul section", description: "Deskripsi section.", imageUrl: image("Section") },
          ],
        },
      ],
    },
    note: "no stylesheet; needs global styles",
  },
  {
    name: "footer",
    path: "@aio-ui/footer/Footer",
    stylesheet: "@aio-ui/footer/Footer.css",
    category: "layout",
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
  {
    name: "menu",
    path: "@aio-ui/menu/Menu",
    stylesheet: "@aio-ui/menu/Menu.css",
    category: "navigation",
    kind: "element",
    payload: {
      content: {
        navigations: [{ href: "#kitchen", label: "Kitchen", title: "Kitchen" }],
        actions: [],
      },
    },
  },
  {
    name: "fab-menu",
    path: "@aio-ui/fabmenu/FabMenu",
    stylesheet: "@aio-ui/fabmenu/FabMenu.css",
    category: "navigation",
    kind: "element",
    // `FabMenu.prepare` reads `content.actions` and `content.title` — no wrapper.
    payload: {
      title: "Actions",
      actions: [{ label: "Satu" }, { label: "Dua" }, { label: "Tiga" }],
    },
  },
  {
    name: "mode-switcher",
    path: "@aio-ui/modeswitcher/ModeSwitcher",
    stylesheet: "@aio-ui/modeswitcher/ModeSwitcher.css",
    category: "chrome",
    kind: "element",
    payload: {},
  },
  {
    name: "pricing-card",
    path: "@aio-ui/pricingcard/PricingCard",
    stylesheet: "@aio-ui/pricingcard/PricingCard.css",
    category: "content",
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
    name: "product-card",
    path: "@aio-ui/product/ProductCard",
    stylesheet: "@aio-ui/product/ProductCard.css",
    category: "content",
    kind: "element",
    // Shape from `content.ts:692` — a flat product row.
    payload: {
      uid: "dsr7524x",
      name: "O-Neck Standard",
      category: "T-Shirt",
      title: "Standard O-neck",
      description: "Kaos katun combed 30s.",
      price: 85000,
      colors: [
        { name: "white", value: "#ffffff" },
        { name: "black", value: "#212121" },
        { name: "violet", value: "#9966cc" },
      ],
      artwork: { src: image("Product") },
    },
  },
  {
    name: "product-grid",
    path: "@aio-ui/product/ProductGrid",
    category: "content",
    kind: "element",
    // `ProductGrid.prepare` reads `data.content.data ?? data.content`.
    payload: {
      content: {
        data: [
          { uid: "p1", title: "Standard O-neck", price: 85000, colors: [{ name: "white", value: "#ffffff" }], artwork: { src: image("Grid 1") } },
          { uid: "p2", title: "Premium Tee", price: 120000, colors: [{ name: "black", value: "#212121" }], artwork: { src: image("Grid 2") } },
        ],
      },
    },
    note: "no stylesheet",
  },
  {
    name: "modal",
    path: "@aio-ui/modal/Modal",
    stylesheet: "@aio-ui/modal/Modal.css",
    category: "chrome",
    kind: "modal",
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
