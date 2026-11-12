import type { iPageContent, iPageController } from "@aio-ui/app";

import { mountInto, node } from "../dom";
import { pageHead, shellPage } from "../shell";

/**
 * Getting Started — setup, then the AioApp contract.
 *
 * Single column on purpose: it is read top to bottom once. The module and component
 * references live on their own routes, where a sidebar is useful.
 *
 * Every fact here is taken from `@aio-ui/app` (types.ts) and from this demo's own entry
 * file, so the page describes what the packages really do.
 */

function section(title: string, ...children: (HTMLElement | string)[]): HTMLElement {
  const block = node("section", "doc-section");
  block.append(node("h2", undefined, title));
  for (const child of children) {
    block.append(typeof child === "string" ? node("p", "summary", child) : child);
  }
  return block;
}

function code(snippet: string): HTMLElement {
  return node("pre", "snippet", snippet);
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

function doc(): HTMLElement {
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
          '{',
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

  panel.append(
    section(
      "3 · Register and mount",
      "The entry keeps two lists: component registrations and the preload plan. Nothing is handed to AioApp as a constructor dependency.",
      code(
        [
          "const components = new ComponentRegistry(assetMap);",
          'components.register("badge", manifestFor(badgeRow));',
          "",
          "const app = new AioApp({",
          '  container: "#app",',
          '  defaultRoute: "home",',
          "  source: { pages },",
          "})",
          "  .registerModule(components, componentRoutes)  // registry + preload plan",
          "  .registerModule(HashRouter)",
          "  .registerModule(DOMRenderer)",
          "  .registerModule(AnimationsService)",
          "  .registerModule(HttpService, { url: '/api' })",
          "  .registerModule(ThemeRenderer, { themes: [new DefaultTheme()] })",
          "  .registerModule(new EventEmitter());",
          "",
          "await app.render();",
        ].join("\n"),
      ),
    ),
  );

  panel.append(
    section(
      "AioApp config",
      "Only content and general options belong here. A module takes its own config at the place it is registered, so this interface stays stable no matter how many modules an app installs.",
      table(
        ["key", "type", "meaning"],
        [
          ["container", "HTMLElement | string", "Mount point, resolved once at render()."],
          ["defaultRoute", "string", "Route used when the hash is empty or unknown. Defaults to home."],
          ["theme", "string", "Initial theme id. Defaults to default."],
          ["debug", "boolean", "Resolved slots, preload graph and misses on the debug channel."],
          ["source", "iAppSource", "{ pages, menu?, footer? } — the content the app renders."],
        ],
      ),
    ),
  );

  panel.append(
    section(
      "Slots",
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
      "Routes",
      "A route is content, a controller, or both. Content is a plain node tree; a controller exists when the route needs the fragment, the network or its own lifecycle.",
      code(
        [
          "// 1. content only — declared once",
          "const pages = { form: formContent() };",
          "",
          "// 2. a controller: prepare() runs once per render, before preload",
          "class BlogPage implements iPageController {",
          "  async onPrepare({ fragment, http, signal }) {",
          "    const envelope = await http.get({ sheetName: 'blog' });",
          "    if (signal.aborted) return;",
          "    return shellPage({ main: articleList(envelope.data, fragment) });",
          "  }",
          "}",
          "app.registerPage('blog', BlogPage);",
        ].join("\n"),
      ),
      "A page context carries route, page, fragment, theme, builders, http and an AbortSignal. Returning nothing from onPrepare falls back to the content declared in source.pages.",
    ),
  );

  panel.append(
    section(
      "Preload",
      "The app preloads the components a route can mount. A node's builder names what that node is, so anything built later — inside onCreated, or composed by a page-level component — has to be named in the route plan:",
      code(
        [
          "const componentRoutes: iComponentRoute[] = [",
          "  { route: 'kitchen', components: [...elementNames, 'menu', 'fab-menu'] },",
          "  { route: 'product', components: ['product', 'menu', 'fab-menu'] },",
          "];",
          "",
          ".registerModule(components, componentRoutes)",
        ].join("\n"),
      ),
      "A missing entry fails the render on a cold load, not later — the builder was never loaded.",
    ),
  );

  panel.append(
    section(
      "Gates",
      "The repository is a monorepo: build the packages before the examples, and run the whole gate once per batch rather than per edit.",
      code(
        [
          "npm run verify      # build 37 packages → typecheck → bounds → api → version → tests → examples",
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
        ...pageHead("Getting Started", "install · import map · AioApp config · slots · routes"),
        "div.doc-host": {
          onCreated: (element: HTMLElement) => mountInto(element, doc()),
        },
      },
    });
  }
}
