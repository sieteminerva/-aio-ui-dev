import type { iPageContent, iPageController, iPageContext } from "@aio-ui/app";

import { mountInto, node } from "../dom";
import { MODULES, moduleForFragment, moduleHash, type iDemoModule } from "../modules";
import { pageHead, shellPage } from "../shell";

type BuildFn = (name: string, data?: any) => HTMLElement;

/**
 * Modules route — the docs shell with a module table instead of a component table.
 *
 *   asides   one `menu` (`type: "sidebar"`) listing the six module packages
 *   main     header + the selected module's docs
 *
 * Selection lives in the fragment (`#modules/router`), exactly like `#kitchen/<name>`,
 * so deep links and refresh work without a second routing API.
 */

function factList(facts: iDemoModule["facts"]): HTMLElement {
  const list = node("dl", "facts");
  for (const fact of facts) {
    list.append(node("dt", undefined, fact.label), node("dd", undefined, fact.value));
  }
  return list;
}

/** Config keys, or the reason there are none — never an empty table. */
function configTable(module: iDemoModule): HTMLElement {
  if (!module.config.length) {
    return node("p", "summary", "No config: this module takes what the app context provides.");
  }

  const table = node("table", "api-config");
  const head = node("tr");
  head.append(node("th", undefined, "key"), node("th", undefined, "type"), node("th", undefined, "what it does"));
  table.append(head);

  for (const row of module.config) {
    const line = node("tr");
    line.append(node("td", undefined, row.key), node("td", undefined, row.value), node("td", undefined, row.meaning));
    table.append(line);
  }

  return table;
}

function notesList(notes: string[]): HTMLElement {
  const list = node("ul", "limits");
  for (const note of notes) list.append(node("li", undefined, note));
  return list;
}

/** The docs column: summary, facts, how the demo registers it, config, then the traps. */
function moduleDoc(module: iDemoModule): HTMLElement {
  const panel = node("div", "doc-panel");

  panel.append(node("p", "summary", module.summary), factList(module.facts));

  panel.append(node("h2", undefined, "Register"));
  panel.append(node("pre", "snippet", module.snippet));

  panel.append(node("h2", undefined, "Config"));
  panel.append(configTable(module));

  if (module.notes.length) {
    panel.append(node("h2", undefined, "Notes"));
    panel.append(notesList(module.notes));
  }

  return panel;
}

function mountMain(host: HTMLElement, module: iDemoModule): void {
  mountInto(host, moduleDoc(module));
}

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

  mountInto(
    host,
    build("menu", {
      content: { navigations },
      config: {
        type: "sidebar",
        // The brand has no destination; a bare route (no fragment) is what the menu passes.
        onNavigate: (href?: string) => !String(href ?? "").includes("/"),
      },
    }),
  );
}

function modulesContent(module: iDemoModule): iPageContent {
  return shellPage({
    aside: {
      onCreated: (element: HTMLElement, _render: any, build: BuildFn) => mountSidebar(element, build, module.name),
    },
    main: {
      ...pageHead(module.name, `${module.pkg} · slot: ${module.slot ?? "none"} · ${module.entry}`),
      "div.module-doc": {
        onCreated: (element: HTMLElement) => mountMain(element, module),
      },
    },
  });
}

export class ModulesPage implements iPageController {
  async onPrepare({ fragment }: iPageContext): Promise<iPageContent> {
    return modulesContent(moduleForFragment(fragment));
  }
}
