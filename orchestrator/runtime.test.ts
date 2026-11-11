import { describe, expect, it } from "vitest";
import { emitSite } from "./emit.ts";
import type { AssetResolver } from "./emit.ts";
import { galleryPreset, storePreset } from "./fixtures.ts";
import { plan } from "./plan.ts";
import { emitRuntime } from "./runtime.ts";

const fake: AssetResolver = {
  module: (specifier) => `https://cdn.test/mods/${specifier.replace(/[@/]/g, "_")}`,
  style: (specifier) => `https://cdn.test/styles/${specifier.replace(/[@/]/g, "_")}`,
};

function build(preset: typeof galleryPreset) {
  const planned = plan(preset);
  return emitRuntime({ preset, plan: planned, site: emitSite(preset, fake) });
}

describe("emitRuntime — index.html", () => {
  const { "index.html": html } = build(galleryPreset);

  it("links every stylesheet the plan resolved", () => {
    const site = emitSite(galleryPreset, fake);
    site.links.forEach((href) => expect(html).toContain(`href="${href}"`));
  });

  it("inlines the import map", () => {
    expect(html).toContain('<script type="importmap">');
    // The `imports` wrapper is mandatory; without it browsers ignore the map.
    expect(html).toContain('"imports": {');
    expect(html).toContain('"@aio-ui/frameworks"');
  });

  it("carries the site copy into title, description and theme", () => {
    expect(html).toContain("<title>Kriya Nusantara</title>");
    expect(html).toContain('data-theme="default"');
    expect(html).toContain('lang="id"');
  });

  it("escapes copy that could break out of an attribute", () => {
    const preset = {
      ...galleryPreset,
      site: { name: 'Kriya "Nusantara" <script>', locale: "id" },
    };
    const { "index.html": escaped } = build(preset as typeof galleryPreset);
    expect(escaped).toContain("&quot;Nusantara&quot; &lt;script&gt;");
    expect(escaped).not.toContain("<script>alert");
  });
});

describe("emitRuntime — app.js", () => {
  it("registers only the components the pages use", () => {
    const { "app.js": app } = build(galleryPreset);
    expect(app).toContain('registry.register("masonry"');
    expect(app).toContain('registry.register("carousel"');
    expect(app).not.toContain('registry.register("form"');
  });

  it("does not import modules the preset never asked for", () => {
    const { "app.js": app } = build(galleryPreset);
    expect(app).toContain('from "@aio-ui/animations"');
    expect(app).not.toContain('from "@aio-ui/http-service"');
  });

  it("wires the form with its sub-modules and keeps field modules out of the registry", () => {
    const { "app.js": app } = build(storePreset);

    expect(app).toContain('registry.register("form"');
    expect(app).toContain('{ id: "validation", path: "@aio-ui/form/validation-adapter", export: "validationFormAdapter" }');
    expect(app).toContain('{ id: "dropdown", path: "@aio-ui/input/dropdown/module", export: "dropdownInputModule" }');

    // Field-level modules are not page components.
    expect(app).not.toContain('registry.register("dropdown"');
    expect(app).not.toContain('registry.register("input"');
  });

  it("mounts builder nodes instead of leaving empty host elements", () => {
    const { "app.js": app } = build(storePreset);
    expect(app).toContain("function mount(owner)");
    expect(app).toContain("PRESET.pages.forEach((page) => mount(page.content));");
    expect(app).toContain("const child = build(name, owner);");
  });

  it("registers HttpService with the preset's endpoint", () => {
    const { "app.js": app } = build(storePreset);
    expect(app).toContain('import { HttpService } from "@aio-ui/http-service";');
    expect(app).toContain("registerModule(HttpService, { url: PRESET.data[0].endpoint");
  });

  it("boots the app with the first page as the default route", () => {
    const { "app.js": app } = build(galleryPreset);
    expect(app).toContain("defaultRoute: PRESET.pages[0]?.id");
    expect(app).toContain("await app.render();");
  });
});

describe("emitRuntime — page definitions", () => {
  it("declares one page definition per route and hands it to registerPage", () => {
    const { "app.js": app } = build(storePreset);

    expect(app).toContain('import type { iPageDefinition } from "@aio-ui/frameworks";');
    expect(app).toContain("const pageDefinitions: iPageDefinition[] = [");
    // The definition owns the route contract; the content still comes from source.pages.
    expect(app).toContain("pageDefinitions.forEach((definition) => app.registerPage(definition));");
    expect(app).toContain(".registerModule(registry)");
    // Route objects are gone: `requires` is the preload source now.
    expect(app).not.toContain("iComponentRoute");
    expect(app).not.toContain("componentRoutes");
  });

  it("lists the words a route actually uses, deduplicated and sorted", () => {
    const { "app.js": app } = build(galleryPreset);
    const plan = /const pageDefinitions: iPageDefinition\[\] = (\[[\s\S]*?\n\]);/.exec(app);

    expect(plan).not.toBeNull();
    const definitions = JSON.parse(plan![1]) as Array<{ route: string; requires: string[] }>;
    expect(definitions.map((entry) => entry.route)).toEqual(galleryPreset.pages.map((page) => page.id));
    definitions.forEach((entry) => {
      expect(entry.requires).toEqual([...new Set(entry.requires)].sort());
      expect(entry.requires).toContain("masonry");
    });
  });

  it("keeps field-level modules out of the page requirements", () => {
    const { "app.js": app } = build(storePreset);
    const plan = /const pageDefinitions: iPageDefinition\[\] = (\[[\s\S]*?\n\]);/.exec(app);
    const words = (JSON.parse(plan![1]) as Array<{ requires: string[] }>).flatMap((entry) => entry.requires);

    expect(words).toContain("form");
    expect(words).not.toContain("input");
    expect(words).not.toContain("dropdown");
    expect(words).not.toContain("input-controls");
  });
});
