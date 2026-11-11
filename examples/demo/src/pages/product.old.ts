import type { iPageContent, iPageController, iPageContext } from "@aio-ui/app";

import { demoNav, pageIntro } from "../nav";
import { themeSwitcher } from "../theme-switcher";

/**
 * Product page — a page component made of three modules.
 *
 *   filter block  → narrows the list (data comes from the same array)
 *   list          → `product-grid`, one `product-card` per record
 *   detail        → `product-detail`, one record, with back + add-to-cart
 *
 * The page owns composition and navigation between the modules; each module owns only
 * its own node. That is the same division `ArticleBuilder` uses internally, just at the
 * page level, so a card never has to know where its detail lives.
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

  const listHost = document.createElement("div");
  listHost.className = "catalog-list";

  const detailHost = document.createElement("div");
  detailHost.className = "catalog-detail";
  detailHost.hidden = true;

  const announce = (message: string): void => {
    status.textContent = message;
  };

  const closeDetail = (): void => {
    detailHost.hidden = true;
    detailHost.replaceChildren();
    listHost.hidden = false;
    announce("");
  };

  const openDetail = (product: iProductRecord): void => {
    detailHost.hidden = false;
    detailHost.replaceChildren();
    listHost.hidden = true;

    const detail = build("product-detail", {
      schema: product,
      config: {
        onBack: closeDetail,
        onAddToCart: ({ product: item, color }: { product: iProductRecord; color?: { name?: string } }) => {
          announce(`Ditambahkan: ${item.title ?? item.name}${color?.name ? ` (${color.name})` : ""}`);
        },
      },
    });

    detailHost.appendChild(detail);
    detailHost.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const renderList = (): void => {
    const list = activeCategory === "all"
      ? products
      : products.filter((product) => product.category === activeCategory);

    listHost.replaceChildren();
    listHost.appendChild(
      build("product-grid", {
        content: { data: list },
        config: { onOpen: openDetail },
      }),
    );
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
      closeDetail();
      renderList();
    });

    filters.appendChild(chip);
  });

  host.append(filters, status, detailHost, listHost);
  renderList();
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
          ...pageIntro("Product", `${products.length} item · list + filter + detail, komposisi di level halaman`),
          ...themeSwitcher,
          "main.product-page": {
            content: {
              ".catalog": {
                // Declarations: both modules are built by this node's handler.
                builder: ["product-grid", "product-detail"],
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
