import type { iPageContent, iPageController, iPageContext } from "@aio-ui/app";

import { pageHead, shellPage } from "../shell";
import { stateBlock } from "../states";

/**
 * Product page — filters + one composition.
 *
 * The page owns what only a page can know: where the data came from, how the catalog is
 * narrowed, and what "add to cart" means. Everything else belongs to `product`:
 * `ProductBuilder` composes the grid and the detail view from its own sub-modules, so this
 * file never names either builder and never swaps them itself.
 */

type BuildFn = (name: string, data?: any) => HTMLElement;

interface iProductRecord {
  uid?: string;
  category?: string;
  title?: string;
  name?: string;
  color?: { name?: string };
}

function mountCatalog(host: HTMLElement, products: iProductRecord[], build: BuildFn): void {
  const categories = ["all", ...new Set(products.map((product) => product.category).filter(Boolean) as string[])];

  let activeCategory = "all";

  const filters = document.createElement("div");
  filters.className = "filters";
  filters.setAttribute("role", "toolbar");
  filters.setAttribute("aria-label", "Filter by category");

  const status = document.createElement("p");
  status.className = "catalog-status";
  status.setAttribute("role", "status");

  const catalogHost = document.createElement("div");
  catalogHost.className = "catalog-body";

  const announce = (message: string): void => {
    status.textContent = message;
  };

  const listOf = (): iProductRecord[] =>
    activeCategory === "all" ? products : products.filter((product) => product.category === activeCategory);

  const render = (): void => {
    catalogHost.replaceChildren();

    // One node, one registration: the list ⇄ detail composition happens inside it, driven
    // by the sub-modules `productModules()` declares on the registration.
    const catalog = build("product", {
      content: { items: listOf() },
      config: {
        onAddToCart: ({ product, color }: { product: iProductRecord; color?: { name?: string } }) => {
          announce(`Ditambahkan: ${product.title ?? product.name}${color?.name ? ` (${color.name})` : ""}`);
        },
      },
    });

    catalogHost.appendChild(catalog);
  };

  categories.forEach((category) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "filter";
    chip.dataset.category = category;
    chip.textContent = category === "all" ? "Semua" : category;
    chip.setAttribute("aria-pressed", String(category === activeCategory));
    chip.classList.toggle("active", category === activeCategory);

    chip.addEventListener("click", () => {
      activeCategory = category;
      filters.querySelectorAll<HTMLButtonElement>(".filter").forEach((node) => {
        const isActive = node.dataset.category === category;
        node.classList.toggle("active", isActive);
        node.setAttribute("aria-pressed", String(isActive));
      });
      announce("");
      render();
    });

    filters.appendChild(chip);
  });

  host.append(filters, status, catalogHost);
  render();
}

/**
 * The route paints its shell first and fills the catalog when the data arrives, so the
 * loading block is a frame the visitor actually sees rather than a hidden `await`.
 *
 * The three outcomes share one host: loading → catalog | empty | error. Nothing is thrown
 * out of here; a failed fetch is content, not a blank page.
 */
async function hydrateCatalog(
  host: HTMLElement,
  build: BuildFn,
  http: iPageContext["http"],
  signal: AbortSignal,
): Promise<void> {
  host.append(stateBlock("loading", { title: "Memuat katalog…", detail: "GET mock/products.json" }));

  try {
    const envelope = await http.get({ sheetName: "products" });

    // A newer navigation already started: drop this pass instead of painting it.
    if (signal.aborted) return;

    const products: iProductRecord[] = Array.isArray(envelope?.data) ? envelope.data : [];

    if (!products.length) {
      host.replaceChildren(
        stateBlock("empty", {
          title: "Katalog kosong",
          detail: "Sumber data tidak berisi item, jadi filter dan grid tidak dirender.",
        }),
      );
      return;
    }

    const catalog = document.createElement("div");
    catalog.className = "catalog";
    mountCatalog(catalog, products, build);
    host.replaceChildren(catalog);
  } catch (error) {
    if (signal.aborted) return;
    host.replaceChildren(
      stateBlock("error", { title: "Katalog gagal dimuat", detail: (error as Error).message }),
    );
  }
}

export class ProductPage implements iPageController {
  async onPrepare({ http, signal }: iPageContext): Promise<iPageContent> {
    return shellPage({
      main: {
        ...pageHead("Product", "page component · list + filter, komposisi di dalam builder"),
        "div.product-host": {
          onCreated: (host: HTMLElement, _render: any, build: BuildFn) => {
            void hydrateCatalog(host, build, http, signal);
          },
        },
      },
    });
  }
}
