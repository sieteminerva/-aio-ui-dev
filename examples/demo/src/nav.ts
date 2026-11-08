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
