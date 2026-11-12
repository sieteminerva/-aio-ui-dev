/**
 * Modules route — the view-model.
 *
 * One row per module package. Everything the page prints comes from here, so the docs
 * cannot drift from a row: adding a module means adding a row, not editing the page.
 *
 * Facts are copied from each package's `package.json` and its class declaration
 * (`static readonly slot`, constructor config, public methods). Nothing is invented.
 */

export interface iModuleFact {
  label: string;
  value: string;
}

export interface iModuleConfigRow {
  key: string;
  /** Declared type, printed in the table's type column. */
  value: string;
  meaning: string;
}

export interface iDemoModule {
  /** Sidebar label, fragment and heading. */
  name: string;
  /** npm package that ships it. */
  pkg: string;
  /** App slot the class fills; `null` for a helper an app instantiates itself. */
  slot: string | null;
  /** Exported symbols an app deals with. */
  entry: string;
  summary: string;
  /** What the module owns, as label/value pairs. */
  facts: iModuleFact[];
  /** How this demo registers it. */
  snippet: string;
  config: iModuleConfigRow[];
  notes: string[];
}

export const MODULES: iDemoModule[] = [
  {
    name: "router",
    pkg: "@aio-ui/router",
    slot: "router",
    entry: "HashRouter",
    summary:
      "Hash routing for a single-page app: one grammar for route, fragment and theme, and a redirect instead of a blank screen when the hash is unknown.",
    facts: [
      { label: "route state", value: "{ route, theme, fragment }" },
      { label: "hash grammar", value: "#route/fragment?theme=<id>" },
      { label: "unknown route", value: "redirect(defaultRoute, theme, segment)" },
      { label: "known routes", value: "pages ∪ controllers ∪ pageDefinitions (AioApp.routes)" },
    ],
    snippet: [
      "// registered as a class: it takes its routes from the app context, not from config",
      ".registerModule(HashRouter)",
      "",
      "// the router is a real module, so a route can be changed from anywhere",
      "const router = app.slots.router;",
      'router.navigate("form", "cyberpunk");',
    ].join("\n"),
    config: [
      { key: "defaultRoute", value: "string", meaning: "Route used when the hash is empty." },
      { key: "initialTheme", value: "string", meaning: "Theme id to start with." },
      { key: "validRoutes", value: "string[]", meaning: "Known routes; the app supplies them at render time." },
      { key: "onRouteChanged", value: "(state) => void", meaning: "Called after every accepted navigation." },
    ],
    notes: [
      "A section anchor such as #faq is not a route: the first segment is unknown, so the router redirects to #<defaultRoute>/faq and the default page renders. Anchor links only scroll when the target is inside the current page.",
      "navigate() writes history with pushState; redirect() uses replaceState, so a redirect never adds a back-button entry.",
    ],
  },
  {
    name: "theme",
    pkg: "@aio-ui/theme",
    slot: "theme",
    entry: "ThemeRenderer",
    summary:
      "Owns the themes an app ships and renders the one the URL asks for. A theme is a module with an id, a stylesheet and an optional activate() hook.",
    facts: [
      { label: "config", value: "{ themes: iThemeModule[] } — the first one is the fallback" },
      { label: "current", value: "getter, the active theme id" },
      { label: "ids", value: "getter, every registered theme id" },
      { label: "side effect", value: "writes --app-* tokens on the shell element" },
    ],
    snippet: [
      ".registerModule(ThemeRenderer, {",
      "  themes: [new DefaultTheme(), new CyberpunkTheme()],",
      "})",
      "",
      "// switching is the router's job: ?theme=cyberpunk is a route state",
      'router.navigate("kitchen", "cyberpunk");',
    ].join("\n"),
    config: [{ key: "themes", value: "iThemeModule[]", meaning: "Themes the app ships; index 0 is the fallback." }],
    notes: [
      "A theme cannot be swapped after render once the module has been used: register every theme up front instead of adding one later.",
      "Themes put --app-* on the shell element, which is why a component layer declares its derived tokens on :root, [data-theme] — a custom property is substituted where it is declared.",
    ],
  },
  {
    name: "http-service",
    pkg: "@aio-ui/http-service",
    slot: "http",
    entry: "HttpService",
    summary:
      "One door for data. A page asks for a sheet, the service builds the URL, caches the answer and hands back the whole envelope, so swapping mock JSON for a backend is a config change.",
    facts: [
      { label: "get()", value: "returns { success, message, data, meta }" },
      { label: "post()", value: "(query, payload) → same envelope" },
      { label: "cache", value: "enabled per instance, keyed by cachePrefix" },
      { label: "logging", value: "silent unless debug: true" },
    ],
    snippet: [
      "// this demo: static JSON that behaves like a backend",
      ".registerModule(HttpService, {",
      "  url: '',",
      "  endpoint: (query) => `${import.meta.env.BASE_URL}mock/${query.sheetName}.json`,",
      "})",
      "",
      "// in a page controller",
      "const envelope = await http.get({ sheetName: 'products' });",
      "const rows = envelope.data;",
    ].join("\n"),
    config: [
      { key: "url", value: "string", meaning: "Base URL of a real backend." },
      { key: "endpoint", value: "(query) => string", meaning: "Builds the URL yourself; used by the mock transport." },
      { key: "timeout", value: "number", meaning: "Abort a request that takes too long." },
      { key: "delay", value: "number", meaning: "Artificial latency, so a loading state is visible." },
      { key: "cacheEnabled", value: "boolean", meaning: "Serve repeat queries from memory/storage." },
      { key: "cachePrefix", value: "string", meaning: "Namespace for the cache keys." },
      { key: "cacheTtlDays", value: "number", meaning: "How long a cached answer stays valid." },
      { key: "debug", value: "boolean", meaning: "Print request/response diagnostics." },
    ],
    notes: [
      "The service is silent by default on purpose: a data module should not own the console.",
      "A page receives http + an AbortSignal in iPageContext, so a newer navigation can cancel an older fetch instead of painting a stale result.",
    ],
  },
  {
    name: "event-emitter",
    pkg: "@aio-ui/event-emitter",
    slot: "events",
    entry: "EventEmitter, PageEvents",
    summary:
      "The app-wide bus. Components and pages publish through it instead of reaching for each other, and the host subscribes once.",
    facts: [
      { label: "subscribe", value: "on(event, callback)" },
      { label: "publish", value: "emit(event, data)" },
      { label: "unsubscribe", value: "off(event, callback) / clear()" },
      { label: "page events", value: "PageEvents — lifecycle names shared by pages" },
    ],
    snippet: [
      ".registerModule(new EventEmitter())",
      "",
      "// a component publishes, the host listens",
      'emitter.on("product:add", ({ product }) => announce(product.title));',
      'emitter.emit("product:add", { product });',
    ].join("\n"),
    config: [],
    notes: [
      "The demo keeps the instance on globalThis.__emitter as a debug handle, next to __app.",
      "Emit the same shape you subscribe with: the bus is typed by event name only, so a mismatch is a runtime bug, not a compile error.",
    ],
  },
  {
    name: "animations",
    pkg: "@aio-ui/animations",
    slot: "animation",
    entry: "AnimationsService",
    summary:
      "Declarative animation behaviours driven by data attributes. After a render the app initialises the service, which scans the tree and mounts only what the markup asks for.",
    facts: [
      { label: "behaviours", value: "typewriter, staggerFade, scramble, fade, loadingPlaceholder" },
      { label: "scan", value: "scan(root) → the nodes it mounted" },
      { label: "per node", value: "mount(node) / unmount(node) / trigger(node)" },
      { label: "extend", value: "use(behaviour) or config.behaviours" },
    ],
    snippet: [
      ".registerModule(AnimationsService)",
      "",
      '// opt in from markup: <h1 data-animation="typewriter">…</h1>',
      "",
      "// a component that adds nodes late mounts them itself",
      "service.mount(section);",
    ].join("\n"),
    config: [
      { key: "typewriter", value: "TypewriterOptions", meaning: "Defaults for the typewriter behaviour." },
      { key: "staggerFade", value: "StaggerFadeOptions", meaning: "Defaults for staggering a list." },
      { key: "scramble", value: "ScrambleOptions", meaning: "Defaults for the scramble effect." },
      { key: "fade", value: "FadeInOptions", meaning: "Defaults for the fade behaviour." },
      { key: "loadingPlaceholder", value: "LoadingPlaceholderOptions", meaning: "Defaults for skeleton placeholders." },
      { key: "delay", value: "number", meaning: "Global start delay." },
      { key: "behaviours", value: "AnimationBehaviour[]", meaning: "Extra behaviours registered at construction." },
    ],
    notes: [
      "Animations.css ships with the package; the host links it like any other stylesheet.",
      "A behaviour is opt-in per node. Nothing animates unless the markup says so, which keeps a reduced-motion visitor out of the pipeline.",
    ],
  },
  {
    name: "module-loader",
    pkg: "@aio-ui/module-loader",
    slot: null,
    entry: "ModuleLoader, ModuleRegistry",
    summary:
      "Lifecycle for optional features: load, track and destroy module instances on top of a plain registry. Dependency order and reverse-order teardown live here, not in the feature.",
    facts: [
      { label: "registry", value: "ModuleRegistry — id → definition, no lifecycle" },
      { label: "loader", value: "ModuleLoader — load / unload / loadedIds" },
      { label: "ordering", value: "a definition may declare its dependencies" },
      { label: "duplicates", value: "policy: warn (default) | error | first | last" },
    ],
    snippet: [
      "// not an app slot: a feature container instantiates it itself",
      'const loader = new ModuleLoader("form", FORM_MODULES);',
      "",
      'const feature = loader.load("validation", { form, builder: "form" });',
      "loader.unloadAll();",
    ].join("\n"),
    config: [
      { key: "duplicate", value: "RegistryDuplicatePolicy", meaning: "What to do when two definitions share an id." },
    ],
    notes: [
      "A missing module is a normal state, not an error: the loader returns null and the caller decides whether that is fatal.",
      "It fills no app slot — @aio-ui/form uses it for its adapter stack, and any feature with optional pieces can do the same.",
    ],
  },
];

/** Unknown fragment falls back to the first module instead of an empty page. */
export function moduleForFragment(fragment?: string | null): iDemoModule {
  return MODULES.find((row) => row.name === fragment) ?? MODULES[0];
}

export function moduleHash(name: string): string {
  return `#modules/${name}`;
}
