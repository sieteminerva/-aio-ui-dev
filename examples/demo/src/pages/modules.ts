import type { iPageContent, iPageController, iPageContext } from "@aio-ui/app";

import type { iDemoModule } from "../modules";
import { MODULES, moduleForFragment, moduleHash } from "../modules";
import { node } from "../dom";
import { pageHead, shellPage } from "../shell";

type BuildFn = (name: string, data?: any) => HTMLElement;

/**
 * Modules route — the docs shell with a module table instead of a component table.
 *
 *   aside   one `menu` (`type: "sidebar"`) listing the six module packages
 *   main    header + the selected module's README, rendered by the `markdown` builder
 *
 * Selection lives in the fragment (`#modules/router`), exactly like `#kitchen/<name>`, so
 * deep links and refresh work without a second routing API.
 *
 * The document itself is not written here: `src/modules.ts` imports each package README as
 * text, and `markdown` turns it into DOM. Editing the README is the only step to update the
 * page.
 */

/**
 * Sidebar.
 *
 * One `menu` with `type: "sidebar"`: the brand is the first navigation (the module split
 * treats entry 0 as the brand), and every other entry is one module. `onNavigate` swallows
 * the brand click, because there is no "modules index" page to go back to.
 */
function mountSidebar(host: HTMLElement, build: BuildFn, activeName: string): void {
  const navigations = [
    { label: "Modules", href: "#modules" },
    ...MODULES.map((row) => ({
      label: row.name,
      href: moduleHash(row.name),
      ...(row.name === activeName ? { className: "is-active" } : {}),
    })),
  ];

  const menu = build("menu", {
    content: { navigations },
    config: {
      type: "sidebar",
      // The brand has no destination; a bare route (no fragment) is what the menu passes.
      onNavigate: (href?: string) => !String(href ?? "").includes("/"),
    },
  });

  if (typeof (host as any).mount === "function") (host as any).mount(menu);
  else host.appendChild(menu);
}

function modulesContent(module: iDemoModule): iPageContent {
  return shellPage({
    aside: {
      onCreated: (element: HTMLElement, _render: any, build: BuildFn) => mountSidebar(element, build, module.name),
    },
    main: {
      ...pageHead(module.name, `${module.pkg} · slot: ${module.slot ?? "none"} · ${module.entry}`),
      "div.module-doc": {
        onCreated: (element: HTMLElement, _render: any, build: BuildFn) => {
          const panel = node("div", "doc-panel");
          panel.appendChild(build("markdown", { source: module.readme }));
          element.appendChild(panel);
        },
      },
    },
  });
}

export class ModulesPage implements iPageController {
  async onPrepare({ fragment }: iPageContext): Promise<iPageContent> {
    return modulesContent(moduleForFragment(fragment));
  }
}
