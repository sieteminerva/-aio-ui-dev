import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createCdnResolver } from "./emit.ts";
import type { PackageLayout } from "./emit.ts";
import { generateSite, PresetGenerationError } from "./generate.ts";
import { parsePreset } from "./parse.ts";
import { SCENARIOS, galleryScenario, storeScenario } from "./scenarios.ts";
import type { iWebPreset } from "./types.ts";

/**
 * Golden-output tests.
 *
 * They assert behaviour *and* write the generated sites to `.draft/results/`,
 * because the flow is easier to judge from real files than from string
 * assertions. Nothing here touches the network: the resolver points at the
 * release URL the site will use once the first tag exists.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const RESULTS = join(HERE, "..", ".draft", "results");

const layout = JSON.parse(readFileSync(join(HERE, "layout.json"), "utf8")) as PackageLayout;
const resolver = createCdnResolver({
  base: "https://cdn.jsdelivr.net/gh/sieteminerva/-aio-ui-dev@v0.1.3/",
  layout,
});

/** Writes one generated site, replacing whatever was there before. */
function write(name: string, files: Record<string, string>): void {
  const root = join(RESULTS, name);
  rmSync(root, { recursive: true, force: true });

  for (const [path, content] of Object.entries(files)) {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content, "utf8");
  }
}

function read(name: string, path: string): string {
  return readFileSync(join(RESULTS, name, path), "utf8");
}

describe("generateSite — writes real folders", () => {
  it("generates every scenario into .draft/results", () => {
    const index: string[] = ["# Generated sites", ""];

    SCENARIOS.forEach((scenario) => {
      const generated = generateSite({ preset: scenario.preset, resolver });
      write(scenario.name, generated.files);

      index.push(`## ${scenario.name}`);
      index.push("");
      index.push(`- model: \`${scenario.preset.model}\``);
      index.push(`- files: ${Object.keys(generated.files).join(", ")}`);
      index.push("");
    });

    writeFileSync(join(RESULTS, "README.md"), `${index.join("\n")}\n`, "utf8");

    // The physical artefacts are the point: assert they exist on disk.
    expect(read("gallery-static_v1", "index.html")).toContain("<title>");
    expect(read("store-dynamic_v1", "app.js")).toContain("registry.register(\"form\"");
    expect(read("store-dynamic_v1", "server/adapter.json")).toContain("\"mode\": \"dynamic\"");
  });
});

describe("generated site — static", () => {
  const generated = generateSite({ preset: galleryScenario.preset, resolver });

  it("ships the five served files plus a Vite copy", () => {
    expect(Object.keys(generated.files).sort()).toEqual([
      "FLOW.md",
      "app.js",
      "dev/index.html",
      "dev/src/main.ts",
      "dev/vite.config.ts",
      "index.html",
      "preset.json",
      "server/adapter.json",
    ]);
  });

  it("marks the adapter static with no sources", () => {
    const adapter = JSON.parse(generated.files["server/adapter.json"]);
    expect(adapter.static).toBe(true);
    expect(adapter.sources).toEqual([]);
  });

  it("uses the AI's SEO copy in the document head", () => {
    const html = generated.files["index.html"];
    expect(html).toContain("<title>Kriya Nusantara — Kriya Tangan Lokal</title>");
    expect(html).toContain('content="Galeri kriya tangan dari pengrajin lokal, dikurasi per daerah."');
  });

  it("says so in FLOW.md", () => {
    expect(generated.files["FLOW.md"]).toContain("fully static");
  });
});

describe("generated site — dynamic", () => {
  const generated = generateSite({ preset: storeScenario.preset, resolver });

  it("describes the server contract for each data source", () => {
    const adapter = JSON.parse(generated.files["server/adapter.json"]);
    expect(adapter.static).toBe(false);
    expect(adapter.sources).toHaveLength(1);
    expect(adapter.sources[0]).toMatchObject({
      id: "products",
      sheet: "products",
      mode: "dynamic",
    });
    expect(adapter.cache.layers).toHaveLength(3);
  });

  it("wires HttpService and the form with its sub-modules", () => {
    const app = generated.files["app.js"];
    expect(app).toContain('import { HttpService } from "@aio-ui/http-service";');
    expect(app).toContain("registerModule(HttpService");
    expect(app).toContain('{ id: "multistep", path: "@aio-ui/form/multistep-adapter", export: "multistepFormAdapter" }');
  });

  it("mounts every builder node in both served and dev files", () => {
    for (const file of ["app.js", "dev/src/main.ts"]) {
      const source = generated.files[file];
      expect(source).toContain("mount(page.content)");
      expect(source).toContain("owner.onCreated");
    }
  });

  it("pins every asset URL to the engine release", () => {
    const html = generated.files["index.html"];
    expect(html).toContain("cdn.jsdelivr.net/gh/sieteminerva/-aio-ui-dev@v0.1.3/");
  });
});

describe("generated site — round trip", () => {
  it("preset.json parses back into the same document", () => {
    const generated = generateSite({ preset: storeScenario.preset, resolver });
    const roundTripped = JSON.parse(generated.files["preset.json"]);

    const { preset, issues } = parsePreset(roundTripped);
    expect(issues).toEqual([]);
    expect(preset).toEqual(storeScenario.preset);
  });

  it("refuses to generate when the plan has blockers", () => {
    const broken: iWebPreset = {
      ...galleryScenario.preset,
      pages: [{ id: "home", route: "/", content: { x: { builder: "chart-3d", content: [] } } }],
    };

    expect(() => generateSite({ preset: broken, resolver })).toThrow(PresetGenerationError);
  });

  it("refuses to generate when a specifier cannot be resolved", () => {
    const offline = createCdnResolver({ base: "https://cdn.test/", layout: {} });
    expect(() => generateSite({ preset: galleryScenario.preset, resolver: offline })).toThrow(
      PresetGenerationError,
    );
  });
});
