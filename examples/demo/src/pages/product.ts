import type { iPageContent, iPageController, iPageContext } from "@aio-ui/app";

import { demoNav, pageIntro } from "../nav";
import { themeSwitcher } from "../theme-switcher";

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

export class ProductPage implements iPageController {
  async onPrepare({ http, signal }: iPageContext): Promise<iPageContent | void> {
    const envelope = await http.get({ sheetName: "products" });

    // A newer navigation already started: drop this pass instead of painting it.
    if (signal.aborted) return;

    const products: iProductRecord[] = Array.isArray(envelope?.data) ? envelope.data : [];

    return {
      ".page": {
        content: {
          ...demoNav,
          ...pageIntro("Product", `${products.length} item · list + filter, komposisi di dalam komponen`),
          ...themeSwitcher,
          "main.product-page": {
            content: {
              ".catalog": {
                // The route names `product` in the preload plan; this node only builds it.
                onCreated: (el: HTMLElement, _render: any, build: BuildFn) => {
                  mountCatalog(el, products, build);
                },
              },
            },
          },
        },
      },
    } as iPageContent;
  }
}
