/**
 * GENERATOR — turns one preset into the physical file set of a website.
 *
 * This is the step that makes the flow inspectable: instead of trusting unit
 * tests on strings, every run writes a real folder that can be opened in a
 * browser (static files) or handed to the orchestrator (which commits it to the
 * client's repository).
 *
 * Output layout (per site):
 *
 *   preset.json          the document the AI + orchestrator produced
 *   index.html           import map + stylesheet links + mount point
 *   app.js               registrations and app bootstrap (no build step)
 *   server/adapter.json  what the dynamic half must serve (sheets, cache plan)
 *   FLOW.md              how the files relate: static content vs live data
 *   dev/                 the same site as a Vite project, for local editing
 *
 * A site with no `data[]` is fully static: `index.html` + `app.js` already are
 * the website. A site with `data[]` adds `server/adapter.json`, which is the
 * contract the Apps Script deployment (or any backend) implements.
 *
 * `dev/` exists because the build-free files point at published URLs: until a
 * tag is released they cannot be opened. The Vite copy resolves `@aio-ui/*` from
 * the workspace (`development` export condition), so it runs today.
 */
import { emitPlan } from "./emit.ts";
import type { AssetResolver, EmittedSite } from "./emit.ts";
import { plan } from "./plan.ts";
import { emitRuntime } from "./runtime.ts";
import type { iWebPreset, PresetPlan } from "./types.ts";

export interface GenerateInput {
  preset: iWebPreset;
  /** Where module/style specifiers live (CDN, release folder, dev server). */
  resolver: AssetResolver;
}

/** One generated website: relative path → file content. */
export interface GeneratedSite {
  files: Record<string, string>;
  plan: PresetPlan;
  site: EmittedSite;
}

/** Thrown when a preset cannot produce a website; carries the blocking issues. */
export class PresetGenerationError extends Error {
  readonly details: string[];

  constructor(details: string[]) {
    super(`Cannot generate site: ${details.join("; ")}`);
    this.name = "PresetGenerationError";
    this.details = details;
  }
}

/**
 * Generates every file for one preset.
 *
 * @param input - Preset plus its asset resolver.
 * @returns File map and the intermediate plan/emitted views.
 * @throws {PresetGenerationError} When planning or resolution found a blocker.
 */
export function generateSite(input: GenerateInput): GeneratedSite {
  const planned = plan(input.preset);
  const emitted = emitPlan(planned, input.resolver);

  const blockers = [
    ...planned.issues.map((issue) => `${issue.code}: ${issue.detail}`),
    ...emitted.missing.map((specifier) => `UNRESOLVED: ${specifier}`),
  ];
  if (blockers.length) throw new PresetGenerationError(blockers);

  const runtime = emitRuntime({ preset: input.preset, plan: planned, site: emitted });

  return {
    files: {
      "preset.json": `${JSON.stringify(input.preset, null, 2)}\n`,
      "index.html": runtime["index.html"],
      "app.js": runtime["app.js"],
      "server/adapter.json": `${JSON.stringify(buildAdapter(input.preset, planned), null, 2)}\n`,
      "FLOW.md": buildFlow(input.preset, planned, emitted),
      ...buildDevProject(input.preset, planned),
    },
    plan: planned,
    site: emitted,
  };
}

/**
 * Emits the Vite copy of the same site.
 *
 * @summary Static imports replace the import map, so Vite can resolve
 * `@aio-ui/*` from the workspace and serve the site with no released tag.
 * This is the file set a developer receives when they want to edit locally.
 */
function buildDevProject(preset: iWebPreset, planned: PresetPlan): Record<string, string> {
  const styles = [...planned.baseStyles, ...planned.assets.flatMap((asset) => asset.styles)];
  const styleImports = [...new Set(styles)].map((style) => `import "${style}";`).join("\n");

  const loaders = planned.assets
    .map((asset) => `    "${asset.specifier}": () => import("${asset.specifier}")`)
    .join(",\n");

  const has = (capability: string): boolean => planned.capabilities.includes(capability);
  const imports = [
    `import { ComponentRegistry } from "@aio-ui/core";`,
    `import { DOMRenderer } from "@aio-ui/core";`,
    `import { AioApp } from "@aio-ui/app";`,
    `import { HashRouter } from "@aio-ui/router";`,
  ];
  if (has("http-service")) imports.push(`import { HttpService } from "@aio-ui/http-service";`);
  if (has("animations")) imports.push(`import { AnimationsService } from "@aio-ui/animations";`);

  const formModules = planned.moduleRefs
    .map((ref) => `{ id: "${ref.id}", path: "${ref.specifier}"${ref.export ? `, export: "${ref.export}"` : ""} }`)
    .join(", ");

  const registrations = planned.bindings
    .filter((binding) => !["input", "dropdown", "input-controls"].includes(binding.word))
    .map((binding) => {
      // The CSS is imported at the top of this file, so the manifest declares no
      // stylesheet: a second loader would inject the same sheet twice.
      if (binding.word === "form") {
        return `registry.register("form", (data: any) => { const payload = data?.content ?? data; return { path: "${binding.specifier}", config: payload?.config, schema: payload?.schema ?? payload, modules: [${formModules}] }; });`;
      }
      return `registry.register("${binding.word}", () => ({ path: "${binding.specifier}" }));`;
    })
    .join("\n");

  const httpModule = has("http-service") && preset.data?.length
    ? `\n  .registerModule(HttpService, { url: PRESET.data[0].endpoint, cacheEnabled: true })`
    : "";
  const animationsModule = has("animations") ? `\n  .registerModule(AnimationsService)` : "";

  return {
    "dev/index.html": `<!doctype html>
<html lang="${preset.site.locale}" data-theme="${preset.theme}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${preset.site.seo?.title || preset.site.name}</title>
</head>
<body>
  <div id="app" class="page"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
`,

    "dev/vite.config.ts": `import { defineConfig } from "vite";\n\nexport default defineConfig({\n  server: { port: 5199, strictPort: true },\n});\n`,

    "dev/src/main.ts": `${styleImports}
${imports.join("\n")}

/** Generated from preset.json; Vite resolves @aio-ui/* from the workspace. */
const PRESET = ${JSON.stringify(preset, null, 2)};

const assets = {
  modules: {
${loaders}
  },
  styles: {},
};

const registry = new ComponentRegistry(assets as any);
${registrations}

const pages = Object.fromEntries(PRESET.pages.map((page) => [page.id, page.content]));

// A builder node is a host element: the renderer stops there, so the component
// is mounted with the same bridge every example page uses.
function mount(owner: any): void {
  if (Array.isArray(owner)) { owner.forEach(mount); return; }
  if (!owner || typeof owner !== "object") return;
  if (typeof owner.builder === "string") {
    const name = owner.builder;
    const host = owner.onCreated;
    owner.onCreated = (el: HTMLElement, render: any, build: any) => {
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
  container: document.querySelector("#app") as HTMLElement,
  defaultRoute: PRESET.pages[0]?.id,
  theme: PRESET.theme,
  // Dev only: surface render failures instead of swallowing them silently.
  debug: true,
  source: { pages },
})
  .registerModule(registry)
  .registerModule(HashRouter)
  .registerModule(DOMRenderer)${httpModule}${animationsModule};

await app.render();
`,
  };
}

/**
 * Builds the server-side contract for the dynamic half of a site.
 *
 * @summary A static preset produces an empty `sources` list, which is the
 * signal that no backend is needed. Each source names the sheet, the endpoint
 * and the cache plan, so the Apps Script side can be generated from this file
 * instead of being hand-configured.
 */
function buildAdapter(preset: iWebPreset, planned: PresetPlan): Record<string, unknown> {
  const sources = (preset.data ?? []).map((source) => ({
    id: source.id,
    sheet: source.sheet,
    endpoint: source.endpoint,
    params: source.params ?? {},
    mode: "dynamic",
    /** Columns are validated by the CMS against its own HEADERS cache. */
    contract: "GET ?sheet=<sheet>&page&limit&sortBy&order&lang&apiKey → { statusCode, success, message, data, meta }",
  }));

  return {
    site: preset.id,
    model: preset.model,
    generatedFrom: {
      presetSchema: preset.presetSchema,
      engine: preset.engine,
    },
    static: sources.length === 0,
    sources,
    /**
     * Cache plan, mirroring the CMS technical detail: header schema lives in
     * the Apps Script DocumentCache + in-memory props, the browser keeps a
     * localStorage copy, and published assets are immutable per tag.
     */
    cache: {
      layers: [
        { layer: "browser", store: "localStorage", keyPrefix: `preset:${preset.id}`, ttlDays: 1 },
        { layer: "apps-script", store: "CacheService", ttlSeconds: 21600, scope: "per sheet + query" },
        { layer: "cdn", strategy: "immutable", note: `assets pinned to ${preset.engine.resolved}` },
      ],
      invalidation: "HEADERS update marks the cache outdated; clients refetch with ?v=<stamp>",
    },
    capabilities: planned.capabilities,
  };
}

/** Human-readable map of the flow, shipped next to the site for the operator. */
function buildFlow(preset: iWebPreset, planned: PresetPlan, emitted: EmittedSite): string {
  const dynamic = (preset.data ?? []).length > 0;

  return `# ${preset.site.name} — generated site

Model: \`${preset.model}\`   Theme: \`${preset.theme}\`   Engine: \`${preset.engine.resolved}\`

## Files

| File | Role |
|---|---|
| \`preset.json\` | Source of truth; regenerate from this file. |
| \`index.html\` | Import map + stylesheet links + mount point. No build step. |
| \`app.js\` | Registers exactly ${planned.bindings.length} builder(s) and boots the app. |
${dynamic ? "| `server/adapter.json` | Sheets, endpoints and cache plan for the dynamic half. |\n" : "| — | No server adapter: this site is fully static. |\n"}| \`FLOW.md\` | This file. |

## Flow

\`\`\`
${dynamic ? "browser ──▶ index.html ──▶ app.js ──▶ @aio-ui components\n   ▲                                   │\n   │                                   ▼\nlocalStorage cache ◀────────── HttpService ──▶ Apps Script /exec ──▶ Google Sheets" : "browser ──▶ index.html ──▶ app.js ──▶ @aio-ui components\n                                   │\n                                   ▼\n                            static content in preset.json"}
\`\`\`

## Loaded from

${emitted.table.map((row) => `- \`${row.specifier}\`${row.styles.length ? ` (+ ${row.styles.length} stylesheet)` : ""}`).join("\n")}

## Regenerate

\`\`\`bash
node orchestrator/layout.mjs --out orchestrator/layout.json   # asset map
# then run the generator against this preset.json
\`\`\`
`;
}
