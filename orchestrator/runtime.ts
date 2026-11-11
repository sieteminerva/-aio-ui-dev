/**
 * RUNTIME TEMPLATE — emits the two files a generated site actually serves.
 *
 * Why a generator and not a template repo with placeholders: the file set is
 * small but its *contents* depend on the plan (import map, registrations, which
 * modules to register). Regenerating from data means a preset change never
 * leaves a stale placeholder behind.
 *
 * Why no build step: Apps Script cannot run `tsc` or Vite, and the site is
 * hosted on static storage. The browser loads ES modules directly through the
 * import map; nothing is compiled after generation.
 */
import type { iWebPreset, PresetPlan } from "./types.ts";
import type { EmittedSite } from "./emit.ts";

export interface RuntimeFiles {
  "index.html": string;
  "app.js": string;
}

export interface RuntimeInput {
  preset: iWebPreset;
  /** The same plan used to build `site`; registrations need specifiers, not URLs. */
  plan: PresetPlan;
  site: EmittedSite;
}

/**
 * Builder words that are sub-modules, not page components.
 *
 * `input` renders fields inside a form, `dropdown`/`input-controls` are field
 * modules the form asks for. Registering them as top-level components would
 * give the registry names nothing ever builds.
 */
const NON_COMPONENT_WORDS = new Set(["input", "dropdown", "input-controls"]);

/**
 * Component words each page mounts, so the generated app can preload them.
 *
 * This is the generator's half of the preload contract: it emits one `iPageDefinition` per
 * route and the app derives the preload plan from `word` + `requires` instead of guessing
 * from node payloads. A node's `builder` names the component the node *is* — it is not a
 * dependency list, and a component mounted from an `onCreated` hook is invisible to a
 * content walk. Declaring the requirements per page is what keeps such a page from
 * rendering before its components loaded.
 *
 * Words come from the preset itself (`builder` on a node), deduplicated and sorted, with
 * sub-module words (`input`, `dropdown`, …) left out: the registry builds those through a
 * parent's manifest, never from their own page entry.
 *
 * Exported so a test can compare the emitted plan with what each page actually builds: a
 * requirement the registry cannot resolve is a blank element in the client's browser.
 *
 * @param preset - Validated preset; one entry per page, in preset order.
 * @returns Route and the component words that route preloads.
 */
export function pageRequires(preset: iWebPreset): Array<{ route: string; requires: string[] }> {
  const walk = (node: unknown, found: Set<string>): void => {
    if (Array.isArray(node)) {
      node.forEach((child) => walk(child, found));
      return;
    }
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    if (typeof record.builder === "string" && !NON_COMPONENT_WORDS.has(record.builder)) {
      found.add(record.builder);
    }
    Object.values(record).forEach((child) => walk(child, found));
  };

  return preset.pages.map((page) => {
    const found = new Set<string>();
    walk(page.content, found);
    return { route: page.id, requires: [...found].sort() };
  });
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** `null`/`undefined` drop the line; empty strings are meaningful for attributes. */
function metaTag(name: string, value: string | undefined): string {
  return value ? `<meta name="${name}" content="${escapeAttribute(value)}">` : "";
}

/**
 * Emits `index.html` and `app.js` for one preset.
 *
 * @param input - Preset, its plan and its emitted assets.
 * @returns File map ready to be committed by the generator.
 */
export function emitRuntime(input: RuntimeInput): RuntimeFiles {
  const { preset, plan, site } = input;
  const title = preset.site.seo?.title || preset.site.name || preset.id;
  const description = preset.site.seo?.description || preset.site.tagline || "";

  const links = site.links.map((href) => `<link rel="stylesheet" href="${escapeAttribute(href)}">`).join("\n  ");
  // Import maps require the `imports` wrapper; a bare specifier object is
  // ignored by the browser, which then fails the first bare import.
  const importMap = JSON.stringify(site.importMap, null, 2);

  const html = `<!doctype html>
<html lang="${escapeAttribute(preset.site.locale)}" data-theme="${escapeAttribute(preset.theme)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeAttribute(title)}</title>
  ${metaTag("description", description)}
  ${links}
  <script type="importmap">
${importMap}
  </script>
</head>
<body>
  <div id="app" class="page"></div>
  <script type="module" src="./app.js"></script>
</body>
</html>
`;

  return { "index.html": html, "app.js": emitApp(preset, plan, site) };
}

/** Builds the module script: imports, registrations, app bootstrap. */
function emitApp(preset: iWebPreset, plan: PresetPlan, site: EmittedSite): string {
  const has = (capability: string): boolean => plan.capabilities.includes(capability);

  const imports = [
    `import { ComponentRegistry, DOMRenderer, AioApp } from "@aio-ui/frameworks";`,
    `import { HashRouter } from "@aio-ui/router";`,
  ];
  if (has("http-service")) imports.push(`import { HttpService } from "@aio-ui/http-service";`);
  if (has("animations")) imports.push(`import { AnimationsService } from "@aio-ui/animations";`);
  if (has("event-emitter")) imports.push(`import { EventEmitter } from "@aio-ui/event-emitter";`);

  // Lazy loaders keyed by specifier: the registry resolves a manifest's `path`
  // against this map, so the key must be the specifier, not the URL.
  const loaders = site.table
    .map((row) => `  "${row.specifier}": () => import("${row.url}")`)
    .join(",\n");

  const formModules = plan.moduleRefs
    .map((ref) => `{ id: "${ref.id}", path: "${ref.specifier}"${ref.export ? `, export: "${ref.export}"` : ""} }`)
    .join(", ");

  const registrations = plan.bindings
    .filter((binding) => !NON_COMPONENT_WORDS.has(binding.word))
    .map((binding) => {
      // No `stylesheet` here on purpose: `index.html` already links every sheet,
      // so asking the registry to load one too would only duplicate it.

      // The form is the one builder that partitions sub-modules and receives
      // `{ config, schema }` instead of raw content. `data` here is the whole
      // node (AioApp passes nodes), so the payload lives in `data.content`.
      if (binding.word === "form") {
        const modules = formModules ? `, modules: [${formModules}]` : "";
        return `registry.register("form", (data) => { const payload = data?.content ?? data; return { path: "${binding.specifier}", config: payload?.config, schema: payload?.schema ?? payload${modules} }; });`;
      }

      // No `schema` for the rest: the registry falls back to the node content,
      // which is exactly the payload those builders expect.
      return `registry.register("${binding.word}", () => ({ path: "${binding.specifier}" }));`;
    })
    .join("\n");

  const httpModule = has("http-service") && preset.data?.length
    ? `\n  .registerModule(HttpService, { url: PRESET.data[0].endpoint, cacheEnabled: true })`
    : "";
  const animationsModule = has("animations") ? `\n  .registerModule(AnimationsService)` : "";

  return `${imports.join("\n")}

/** Generated from preset.json — edit the preset, not this file. */
const PRESET = ${JSON.stringify(preset, null, 2)};

const assets = {
  modules: {
${loaders}
  },
  // Stylesheets are linked in index.html; the registry reads the same specifiers
  // from the injected links, so this map stays empty on purpose.
  styles: {},
};

const registry = new ComponentRegistry(assets);
${registrations}

const pages = Object.fromEntries(PRESET.pages.map((page) => [page.id, page.content]));

/**
 * One page definition per route. A node's "builder" names the component the node IS —
 * it is not a dependency list, and a component mounted from an onCreated hook is
 * invisible to a content walk, so each page declares what it needs in "requires".
 * The page tree itself stays in source.pages; the definition owns the route contract.
 *
 * Plain JavaScript on purpose: this file is served to a browser as-is, so no "import type"
 * and no type annotation may appear here — both are syntax errors at runtime.
 */
const pageDefinitions = ${JSON.stringify(pageRequires(preset), null, 2)};

/**
 * A node carrying a builder name is a host element: the renderer builds the
 * wrapper and stops, so the component itself must be mounted here. This is the
 * same bridge every example page writes by hand: onCreated(el, _render, build).
 */
function mount(owner) {
  if (Array.isArray(owner)) { owner.forEach(mount); return; }
  if (!owner || typeof owner !== "object") return;
  if (typeof owner.builder === "string") {
    const name = owner.builder;
    const host = owner.onCreated;
    owner.onCreated = (el, render, build) => {
      if (typeof host === "function") host(el, render, build);
      const child = build(name, owner);
      if (child && child !== el && !el.contains(child)) el.appendChild(child);
    };
    return;
  }
  for (const value of Object.values(owner)) mount(value);
}
PRESET.pages.forEach((page) => mount(page.content));

const app = new AioApp({
  container: document.querySelector("#app"),
  defaultRoute: PRESET.pages[0]?.id,
  theme: PRESET.theme,
  source: { pages },
});

pageDefinitions.forEach((definition) => app.registerPage(definition));

app
  .registerModule(registry)
  .registerModule(HashRouter)
  .registerModule(DOMRenderer)${httpModule}${animationsModule};

await app.render();
`;
}
