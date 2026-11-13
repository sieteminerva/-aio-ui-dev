import type { iPageContent, iPageController, iPageContext, iPageReadyContext } from "@aio-ui/app";
import { releaseBuilders } from "@aio-ui/core";

import { entryForFragment } from "../docs";
import { mountInto } from "../dom";
import type { iDemoEntry } from "../manifest";
import { shellPage } from "../shell";
import { apiPanel, mountSidebar, previewPanel, usagePanel } from "./docs-panels";

type BuildFn = (name: string, data?: any) => HTMLElement;

/**
 * Elements route — the docs shell from `.archives/1x/Artboard 1.png`.
 *
 *   header "Menu Utama"   menu builder, `type: "top"` (supplied by `shellPage`)
 *   aside                 one menu builder, `type: "sidebar"`, grouped by tier
 *   main                  tab builder: Display · Cara Penggunaan · API
 *
 * Selection lives in the route fragment (`#kitchen/<name>`), so refresh and deep links work
 * without a new API: the router already splits `#route/fragment`, and this page reads it.
 * Both menus and the tab are the framework's own builders — the page only supplies data.
 */

/** Main column: one tab, three panels. Panels are elements, so the tab renders them lazily. */
function mountMain(host: HTMLElement, entry: iDemoEntry, build: BuildFn): void {
  mountInto(
    host,
    build("tab", {
      content: {
        // No `title` here: the tab prints label and title, so a title repeats the label.
        menu: [{ label: "Display" }, { label: "Usage" }, { label: "API" }],
        body: [
          {
            id: "panel-display",
            content: {
              eyebrow: `${entry.category} · ${entry.tier}`,
              title: entry.name,
              description: `build("${entry.name}", payload)`,
            },
          },
          { id: "panel-usage", content: usagePanel(entry, build) },
          { id: "panel-api", content: apiPanel(entry, build) },
        ],
      },
      config: { menuPosition: "top" },
    }),
  );

  // The live preview is filled after the tab exists: the Display panel is the first one
  // shown, and its host has to be in the document before a component mounts in it.
  const panel = host.querySelector<HTMLElement>("#panel-display");
  if (panel) panel.append(previewPanel(entry, build));
}

function kitchenContent(entry: iDemoEntry): iPageContent {
  return shellPage({
    aside: {
      onCreated: (element: HTMLElement, _render: any, build: BuildFn) =>
        mountSidebar(element, build, entry.name),
    },
    main: {
      onCreated: (element: HTMLElement, _render: any, build: BuildFn) =>
        mountMain(element, entry, build),
    },
  });
}

/**
 * `#kitchen` and `#kitchen/<name>` are the same route with two fragments: the controller
 * exists so the fragment reaches the content builder. A name that is not in the table falls
 * back to the first row instead of rendering an empty page.
 *
 * Because both fragments are one route, every switch re-creates this controller. That is
 * why it keeps the shell it rendered and destroys its builders on the way out — otherwise
 * the carousel's `setInterval` and the masonry's modal listener outlive the DOM (batch
 * 15–17). `releaseBuilders` walks the shell for pinned builders, so nested ones (a card
 * inside a grid, a panel inside the tab) go too.
 */
export class KitchenPage implements iPageController {
  /** The shell this controller rendered — its own handle on the builders it owns. */
  #shell: HTMLElement | null = null;

  async onPrepare({ fragment }: iPageContext): Promise<iPageContent | void> {
    return kitchenContent(entryForFragment(fragment));
  }

  onReady({ shell }: iPageReadyContext): void {
    this.#shell = shell;
  }

  onDestroy(): void {
    if (this.#shell) releaseBuilders(this.#shell);
    this.#shell = null;
  }
}
