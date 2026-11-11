/**
 * The one page shell every demo route renders.
 *
 *   header   menu builder, `type: "top"` — the same menu on all four routes
 *   body     one column, or `.docs` (aside + main) when the caller passes an aside
 *
 * The shell owns no component knowledge: the caller hands over the body as page content.
 * `#kitchen` passes the docs aside; `#product`, `#article` and `#form` are single-column.
 */
import type { iPageContent } from "@aio-ui/app";

import { themeSwitcher } from "./theme-switcher";

type BuildFn = (name: string, data?: any) => HTMLElement;

/** The route part of the hash: `#product/17?theme=cyberpunk` → `product`. */
export function currentRoute(): string {
  return location.hash.replace(/^#/, "").split("?")[0].split("/")[0] || "kitchen";
}

/** Brand first (the menu splits its flat list that way), then one link per route. */
const TOP_NAV = [
  { label: "@aio demo", href: "#kitchen", route: "" },
  { label: "Elements", href: "#kitchen", route: "kitchen" },
  { label: "Product", href: "#product", route: "product" },
  { label: "Article", href: "#article", route: "article" },
  { label: "Form", href: "#form", route: "form" },
];

function mountTopMenu(host: HTMLElement, build: BuildFn): void {
  const route = currentRoute();
  const navigations = TOP_NAV.map(({ label, href, route: id }) => ({
    label,
    href,
    ...(id && id === route ? { className: "is-active" } : {}),
  }));

  const child = build("menu", {
    content: { navigations },
    // `menu` swallows clicks by default; here its own navigation is exactly right — it
    // sets the hash and the router follows.
    config: { type: "top", onNavigate: () => false },
  });
  host.appendChild(child instanceof HTMLElement ? child : (child as any).element);
}

export interface iShellPage {
  /** Body of the main column. */
  main: Record<string, unknown>;
  /** Optional left column. When present the body uses the `.docs` split. */
  aside?: Record<string, unknown>;
}

export function shellPage({ main, aside }: iShellPage): iPageContent {
  const body: Record<string, unknown> = {
    "header.docs-top": {
      onCreated: (element: HTMLElement, _render: any, build: BuildFn) => mountTopMenu(element, build),
    },
  };

  if (aside) {
    body[".docs"] = { content: { ".docs-aside": aside, "main.docs-main": main } };
  } else {
    body["main.docs-main"] = main;
  }

  return { ".page": { content: { ...body, ...themeSwitcher } } } as unknown as iPageContent;
}

/**
 * Title block for the single-column routes.
 *
 * A `header`, not a `div`. The shared stylesheet centres every `header`, so `style.css`
 * resets the alignment: a page title belongs to the left edge of its column.
 */
export function pageHead(title: string, meta: string): Record<string, unknown> {
  return {
    "header.docs-head": {
      content: {
        h1: { content: title },
        "p.meta": { content: meta },
      },
    },
  };
}
