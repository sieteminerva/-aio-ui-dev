/**
 * Fixtures — two presets that exercise opposite ends of the catalogue.
 *
 * They are intentionally small: a fixture that mirrors the real wizard would
 * hide which capability came from where. Each one is also used by the tests as
 * the "does not load what it does not use" proof.
 */
import type { iWebPreset } from "./types.ts";

const engine = { range: "^0.1.0", resolved: "0.1.3" };

/** Static, animation-only site: no form, no data, no router. */
export const galleryPreset: iWebPreset = {
  id: "kriya-nusantara",
  presetSchema: 1,
  engine,
  model: "gallery",
  theme: "default",
  site: { name: "Kriya Nusantara", locale: "id" },
  pages: [
    {
      id: "home",
      route: "/",
      content: {
        "section#hero": {
          content: {
            "h1.title": {
              attrs: { animation: "typewriter", "animation-chain": "true" },
              content: "Kriya Nusantara",
            },
            masonry: { builder: "masonry", content: [] },
            carousel: { builder: "carousel", content: [] },
          },
        },
        "section#about": {
          content: `<p animation="fade-in">Dibuat oleh pengrajin lokal.</p>`,
        },
      },
    },
  ],
  wizard: { answers: { webType: "gallery" }, generatedAt: "2026-11-10T00:00:00.000Z" },
};

/** Store site: multi-page, data-driven, with every form capability switched on. */
export const storePreset: iWebPreset = {
  id: "tenun-lestari",
  presetSchema: 1,
  engine,
  model: "store",
  theme: "cyberpunk",
  site: { name: "Tenun Lestari", locale: "id" },
  pages: [
    {
      id: "home",
      route: "/",
      content: { "section#intro": { content: "Selamat datang." } },
    },
    {
      id: "catalog",
      route: "/produk",
      content: {
        grid: {
          content: {
            "div#catalog-grid": { builder: "product-card-grid", content: [] },
          },
        },
      },
    },
    {
      id: "checkout",
      route: "/checkout",
      content: {
        form: {
          builder: "form",
          content: {
            config: {
              id: "checkout",
              multistep: true,
              cascading: true,
              calculation: true,
              address: { useAdapter: "aio" },
            },
            schema: [
              {
                id: "customer",
                group: [
                  { type: "text", id: "name", label: "Nama" },
                  { type: "dropdown", id: "province", label: "Provinsi" },
                  { type: "file", id: "receipt", label: "Bukti Transfer" },
                  {
                    id: "items",
                    group: [],
                    table: { sheet: "order_items" },
                  },
                  { type: "text", id: "note", config: { popover: { info: "Catatan" } } },
                  { type: "text", id: "qty", actions: ["add", "remove"] },
                ],
              },
            ],
          },
        },
      },
    },
  ],
  data: [
    {
      id: "products",
      sheet: "products",
      endpoint: "https://script.google.com/macros/s/EXAMPLE/exec",
      params: { limit: 50, sortBy: "title" },
    },
  ],
  wizard: { answers: { webType: "ecommerce" }, generatedAt: "2026-11-10T00:00:00.000Z" },
};
