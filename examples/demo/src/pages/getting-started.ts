import type { iPageContent, iPageController } from "@aio-ui/app";

// The contract is not restated here: it is `docs/framework/APP.md`, imported as text at
// build time. Only the demo-specific parts (install, import map, which module fills which
// slot here, the gate commands) are written in this file.
import appContract from "../../../../docs/framework/APP.md?raw";

import { mountInto, node } from "../dom";
import { pageHead, shellPage } from "../shell";

type BuildFn = (name: string, data?: any) => HTMLElement;

/**
 * Getting Started — setup, then the AioApp contract.
 *
 * Single column on purpose: it is read top to bottom once. The module and component
 * references live on their own routes, where a sidebar is useful.
 *
 * The page shows `docs/framework/APP.md` verbatim; editing that file is the only step to
 * update the contract section. The screenshots of "this demo" (install commands, import map,
 * the slot table, the gates) stay here because no package owns them.
 */

/** The contract without its own `# AioApp — Framework Entry` title: the page head is the title. */
const CONTRACT = appContract.replace(/^\s*#\s+.*\n/, "");

function section(title: string, ...children: (HTMLElement | string)[]): HTMLElement {
  const block = node("section", "doc-section");
  block.append(node("h2", undefined, title));
  for (const child of children) {
    block.append(typeof child === "string" ? node("p", "summary", child) : child);
  }
  return block;
}

function table(headers: string[], rows: string[][]): HTMLElement {
  const element = node("table", "api-config");
  const head = node("tr");
  for (const label of headers) head.append(node("th", undefined, label));
  element.append(head);

  for (const row of rows) {
    const line = node("tr");
    for (const cell of row) line.append(node("td", undefined, cell));
    element.append(line);
  }

  return element;
}

function doc(build: BuildFn): HTMLElement {
  // Every snippet on this page is the real `code-block` component: its look belongs to
  // the package, and this page only decides which text goes into it.
  const code = (snippet: string) => build("code-block", { code: snippet });

  const panel = node("div", "doc-panel");

  panel.append(
    node(
      "p",
      "summary",
      "AioApp is the only class an application instantiates. Everything it consumes — registry, router, renderer, animation, events, http, storage, theme — is a module registered on it, so an app is assembled rather than configured.",
    ),
  );

  panel.append(
    section(
      "1 · Install",
      "The packages are plain ES modules. The aggregate kits exist so an app installs three names instead of twenty:",
      code(
        [
          "npm install @aio-ui/frameworks @aio-ui/modules @aio-ui/styles",
          "",
          "# @aio-ui/frameworks  → base + core + app",
          "# @aio-ui/modules     → router, theme, http-service, event-emitter, animations, module-loader",
          "# @aio-ui/styles      → app tokens (--app-*) and the layout primitives",
        ].join("\n"),
      ),
      "Components are separate packages (@aio-ui/badge, @aio-ui/form, …), so a page only ships what it mounts.",
    ),
  );

  panel.append(
    section(
      "2 · Import map",
      "Without a bundler the browser resolves every specifier from an import map. The map must be an object with an imports key, and it has to name every package root **and** every exact subpath you import — a prefix mapping cannot add the .js extension for you:",
      code(
        [
          '<script type="importmap">',
          "{",
          '  "imports": {',
          '    "@aio-ui/frameworks": "/vendor/@aio-ui/frameworks/dist/index.js",',
          '    "@aio-ui/frameworks/core": "/vendor/@aio-ui/frameworks/dist/core/index.js",',
          '    "@aio-ui/badge/Badge.css": "/vendor/@aio-ui/badge/dist/Badge.css"',
          "  }",
          "}",
          "</script>",
        ].join("\n"),
      ),
    ),
  );

  panel.append(section("3 · The AioApp contract", build("markdown", { source: CONTRACT })));

  panel.append(
    section(
      "4 · Slots in this demo",
      "A module declares the slot it fills (static readonly slot), so registering it for the wrong role is a type error instead of a runtime surprise.",
      table(
        ["slot", "module in this demo", "config"],
        [
          ["registry", "ComponentRegistry (instance)", "asset map"],
          ["router", "HashRouter", "— (routes come from the app context)"],
          ["renderer", "DOMRenderer", "—"],
          ["animation", "AnimationsService", "behaviour defaults"],
          ["events", "EventEmitter (instance)", "—"],
          ["http", "HttpService", "url / endpoint / cache / debug"],
          ["storage", "AppStorage", "{ driver }"],
          ["theme", "ThemeRenderer", "{ themes }"],
        ],
      ),
    ),
  );

  panel.append(
    section(
      "5 · Gates",
      "The repository is a monorepo: build the packages before the examples, and run the whole gate once per batch rather than per edit.",
      code(
        [
          "npm run verify      # build every package → typecheck → bounds → api → version → tests → examples",
          "npm run build:demo  # build this demo",
          "npm run new:component <name>   # scaffold a component package",
        ].join("\n"),
      ),
    ),
  );

  return panel;
}

export class GettingStartedPage implements iPageController {
  async onPrepare(): Promise<iPageContent> {
    return shellPage({
      main: {
        ...pageHead("Getting Started", "install · import map · the AioApp contract · slots · gates"),
        "div.doc-host": {
          onCreated: (element: HTMLElement, _render: any, build: BuildFn) => mountInto(element, doc(build)),
        },
      },
    });
  }
}
