import type { iPageContent, iPageController, iPageContext } from "@aio-ui/app";

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
          { id: "panel-api", content: apiPanel(entry) },
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
 */
export class KitchenPage implements iPageController {
  async onPrepare({ fragment }: iPageContext): Promise<iPageContent | void> {
    return kitchenContent(entryForFragment(fragment));
  }
}
