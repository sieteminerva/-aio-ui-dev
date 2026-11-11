import type { iNodeContent } from "@aio-ui/core/interface";

import { DEMO_TIERS, TIER_LABELS } from "./manifest";

/**
 * Route shell shared by every page in the demo.
 *
 * The demo is split by component *kind*, because they are not the same thing:
 *
 *   #kitchen — element components (one builder, one node)
 *   #product — page component: list (cards + filter) and detail, composed by a page
 *   #article — page component: ArticleBuilder's own slots (list / aside / detail)
 *   #form    — page component: a form schema, multistep-capable
 */
export const ROUTE_IDS = ["kitchen", "product", "article", "form"] as const;
const ROUTE_LABELS: Record<(typeof ROUTE_IDS)[number], string> = {
  kitchen: "Elements",
  product: "Product",
  article: "Article",
  form: "Form",
};

/** Hash links only: `HashRouter` listens to `hashchange`, so no click handler is needed. */
export const demoNav = {
  "nav.demo-nav": {
    content: {
      "a.brand": { attrs: { href: "#kitchen" }, content: "@aio demo" },
      ".navigations": Object.fromEntries(
        ROUTE_IDS.map((id) => [
          `a.item#nav-${id}`,
          { attrs: { href: `#${id}` }, content: ROUTE_LABELS[id] },
        ]),
      ),
    },
    // The route re-renders on every navigation, so the active item is decided once at
    // build time. `?theme=` is stripped: it is a query parameter, not part of the route.
    onCreated: (element: HTMLElement) => {
      const route = location.hash.replace(/^#/, "").split("?")[0] || "kitchen";
      element.querySelector(`a.item[href="#${route}"]`)?.classList.add("is-active");
    },
  },
};

/** `<header class="intro">` block used at the top of each page. */
export function pageIntro(title: string, meta: string) {
  return {
    "header.intro": {
      content: {
        h1: { content: title },
        p: { content: meta },
      },
    },
  };
}

/**
 * Tier sub-navigation inside the elements route.
 *
 * Plain buttons, not links: the router owns the hash, so `href="#tier-basic"` would be
 * read as a route change. A click only scrolls; an observer lights the current tier.
 */
export const tierNav = {
  "nav.tier-nav": {
    attrs: { "aria-label": "Component tiers" },
    content: Object.fromEntries(
      DEMO_TIERS.map((tier) => [
        `button.tier-link#tier-link-${tier}`,
        {
          attrs: { type: "button", "data-tier": tier },
          content: TIER_LABELS[tier],
          onCreated: (element: HTMLElement) => {
            element.addEventListener("click", () => {
              document.getElementById(`tier-${tier}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
            });
          },
        },
      ]),
    ),
    // Deferred one frame: this nav is built before the tier sections that follow it.
    onCreated: () => {
      requestAnimationFrame(() => observeTiers());
    },
  },
} as unknown as iNodeContent;

/**
 * Lights the tier chip of the section crossing the middle of the viewport.
 *
 * `rootMargin` trims 30% off the top and 55% off the bottom, so exactly one section
 * counts as "current" while scrolling instead of two half-visible ones fighting.
 */
function observeTiers(): void {
  const sections = [...document.querySelectorAll<HTMLElement>("section.tier[data-tier]")];
  const links = [...document.querySelectorAll<HTMLElement>(".tier-link[data-tier]")];
  if (!sections.length || !links.length || typeof IntersectionObserver === "undefined") return;

  const setActive = (tier: string | undefined): void => {
    links.forEach((link) => link.classList.toggle("is-active", link.dataset.tier === tier));
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.find((entry) => entry.isIntersecting);
      if (visible) setActive((visible.target as HTMLElement).dataset.tier);
    },
    { rootMargin: "-30% 0px -55% 0px" },
  );

  sections.forEach((section) => observer.observe(section));
  setActive(sections[0].dataset.tier);
}
