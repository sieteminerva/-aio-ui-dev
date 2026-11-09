/**
 * SCENARIOS — the two flows the generator must support, built end to end.
 *
 * Each scenario starts from the *AI contract* (not from a hand-written preset),
 * so the pipeline exercised here is the real one:
 *
 *   iAiSiteContent → parseAiContent → assemblePreset → generateSite
 *
 * They are also the fixtures behind `.draft/results/*`: running the test suite
 * writes real folders that can be opened in a browser.
 */
import { assemblePreset, assertAiContent } from "./ai.ts";
import type { iAiSiteContent, PresetAssembly } from "./ai.ts";
import type { iWebPreset } from "./types.ts";

const ENGINE = { range: "^0.1.0", resolved: "0.1.3" };
const GENERATED_AT = "2026-11-10T00:00:00.000Z";

function assemble(
  content: iAiSiteContent,
  base: Omit<PresetAssembly, "engine" | "generatedAt" | "answers">,
): iWebPreset {
  return assemblePreset(assertAiContent(content), {
    ...base,
    engine: ENGINE,
    answers: base.model === "store" ? { webType: "ecommerce" } : { webType: "gallery" },
    generatedAt: GENERATED_AT,
  });
}

/** Static website: content is baked into `preset.json`, no backend at all. */
export const galleryScenario = {
  name: "gallery-static_v1",
  preset: assemble(
    {
      contentSchema: 1,
      site: {
        tagline: "Kriya tangan dari pengrajin lokal Indonesia.",
        seo: {
          title: "Kriya Nusantara — Kriya Tangan Lokal",
          description: "Galeri kriya tangan dari pengrajin lokal, dikurasi per daerah.",
          keywords: ["kriya", "pengrajin", "lokal"],
        },
      },
      pages: [
        {
          id: "home",
          route: "/",
          seo: { title: "Beranda" },
          content: {
            "section#hero": {
              content: {
                "h1.title": {
                  attrs: { animation: "typewriter", "animation-chain": "true" },
                  content: "Kriya Nusantara",
                },
                "p.lead": {
                  attrs: { animation: "fade-in" },
                  content: "Setiap anyaman membawa nama pengrajinnya.",
                },
                masonry: { builder: "masonry", content: [] },
                carousel: { builder: "carousel", content: [] },
              },
            },
            "section#about": {
              content: "Kami bekerja langsung dengan 40 pengrajin di enam provinsi.",
            },
          },
        },
      ],
      notes: ["Alamat dan kontak tidak disebutkan pada jawaban wizard."],
    },
    {
      id: "kriya-nusantara",
      model: "gallery",
      theme: "default",
      site: { name: "Kriya Nusantara", locale: "id" },
    },
  ),
};

/** Dynamic website: catalog and checkout read from the client's own Sheet. */
export const storeScenario = {
  name: "store-dynamic_v1",
  preset: assemble(
    {
      contentSchema: 1,
      site: {
        tagline: "Tenun tangan, dikirim dari penenun ke rumah Anda.",
        seo: {
          title: "Tenun Lestari — Tenun Tangan",
          description: "Tenun tangan langsung dari penenun Nusa Tenggara.",
        },
      },
      pages: [
        {
          id: "home",
          route: "/",
          content: {
            "section#intro": {
              content: {
                "h1.title": { content: "Tenun Lestari" },
                "p.lead": { content: "Kain tenun tangan, tanpa perantara." },
              },
            },
          },
        },
        {
          id: "catalog",
          route: "/produk",
          seo: { title: "Katalog" },
          content: {
            "section#catalog": {
              content: {
                "h2.title": { content: "Katalog" },
                "div#catalog-grid": { builder: "product-card-grid", content: [] },
              },
            },
          },
        },
        {
          id: "checkout",
          route: "/checkout",
          seo: { title: "Pemesanan" },
          content: {
            "section#checkout": {
              content: {
                "h2.title": { content: "Pemesanan" },
                "div#checkout-form": {
                  builder: "form",
                  content: {
                    config: {
                      id: "order",
                      multistep: true,
                      cascading: true,
                      calculation: true,
                      address: { useAdapter: "aio" },
                    },
                    schema: [
                      {
                        id: "buyer",
                        title: "Data Pembeli",
                        group: [
                          { type: "text", id: "name", label: "Nama" },
                          { type: "tel", id: "phone", label: "WhatsApp" },
                          { type: "dropdown", id: "province", label: "Provinsi" },
                        ],
                      },
                      {
                        id: "items",
                        title: "Pesanan",
                        group: [
                          { type: "text", id: "sku", label: "Kode Kain" },
                          { type: "number", id: "qty", label: "Jumlah" },
                          { type: "file", id: "receipt", label: "Bukti Transfer" },
                        ],
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      ],
      notes: ["Harga dan stok berasal dari sheet products; halaman memakai data id products."],
    },
    {
      id: "tenun-lestari",
      model: "store",
      theme: "cyberpunk",
      site: { name: "Tenun Lestari", locale: "id" },
      data: [
        {
          id: "products",
          sheet: "products",
          endpoint: "https://script.google.com/macros/s/EXAMPLE_TENUN/exec",
          params: { limit: 50, sortBy: "title" },
        },
      ],
    },
  ),
};

export const SCENARIOS = [galleryScenario, storeScenario];
