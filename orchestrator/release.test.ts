/**
 * RELEASE CHECK — the artefacts must describe a site that can actually load.
 *
 * Skipped when `.draft/release/v<version>/` is absent (a clean checkout has no
 * artefacts). Produce them first:
 *
 *   node scripts/release.mjs --version 0.1.0 --apply
 *
 * Three questions this answers, in order:
 * 1. Does the registry describe every workspace package, barrels included?
 * 2. Does every JS subpath, tarball and checksum point at a real file?
 * 3. Is the barrel import closed? `@aio-ui/frameworks` re-exports bare
 *    specifiers (`@aio-ui/core`, …); if one is missing from the import map the
 *    browser stops at the barrel even though the site "looks" generated.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createCdnResolver, emitPlan } from "./emit.ts";
import type { PackageLayout } from "./emit.ts";
import { generateSite } from "./generate.ts";
import { plan } from "./plan.ts";
import { pageRequires } from "./runtime.ts";
import { galleryScenario, storeScenario } from "./scenarios.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const WORKSPACE_VERSION = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version as string;
const RELEASE = join(ROOT, ".draft", "release", `v${WORKSPACE_VERSION}`);
const available = existsSync(join(RELEASE, "registry.json"));

interface RegistryEntry {
  dir: string;
  subpaths: Record<string, string>;
  tarball: string;
  integrity?: string;
}

interface Registry {
  version: string;
  base: string;
  packages: Record<string, RegistryEntry>;
}

/** Aggregators whose `export *` makes the import map a closure, not a list. */
const BARRELS = ["@aio-ui/frameworks", "@aio-ui/modules", "@aio-ui/themes"];

/** The directories `scripts/release.mjs` treats as publishable sections. */
const SECTIONS = [
  "packages",
  "packages/components",
  "packages/modules",
  "packages/themes",
  "packages/kits",
  "packages/utilities",
  "packages/styles",
];

/**
 * Every `@aio-ui/*` package the workspace declares.
 *
 * Derived rather than counted: a hardcoded total turns `code-block` into a failing test the
 * day it is added, which is the opposite of what this check is for.
 */
function workspacePackages(): string[] {
  const names: string[] = [];
  for (const section of SECTIONS) {
    const dir = join(ROOT, section);
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const manifest = join(dir, entry.name, "package.json");
      if (!existsSync(manifest)) continue;
      const name = JSON.parse(readFileSync(manifest, "utf8")).name as string | undefined;
      if (name?.startsWith("@aio-ui/")) names.push(name);
    }
  }
  return names;
}

describe.skipIf(!available)("release artefacts", () => {
  const registry: Registry = JSON.parse(readFileSync(join(RELEASE, "registry.json"), "utf8"));
  const layout: PackageLayout = JSON.parse(readFileSync(join(RELEASE, "layout.json"), "utf8"));
  const base = registry.base.endsWith("/") ? registry.base : `${registry.base}/`;

  /** URL under the release base → repo-relative path. */
  const repoPath = (url: string): string => join(ROOT, url.slice(base.length));

  it("describes every workspace package, barrels included", () => {
    expect(Object.keys(registry.packages).sort()).toEqual(workspacePackages().sort());
    for (const name of BARRELS) expect(registry.packages[name], name).toBeDefined();
  });

  it("points every subpath and tarball at a real file", () => {
    const missing: string[] = [];
    for (const [name, entry] of Object.entries(registry.packages)) {
      for (const [subpath, file] of Object.entries(entry.subpaths)) {
        // Wildcard exports describe a pattern, not a file.
        if (file.includes("*")) continue;
        if (!existsSync(join(ROOT, entry.dir, file))) {
          missing.push(`${name}${subpath === "." ? "" : `/${subpath}`} → ${entry.dir}/${file}`);
        }
      }
      const tarball = entry.tarball.split("/").pop();
      if (tarball && !existsSync(join(RELEASE, tarball))) missing.push(`${name} tarball ${tarball}`);
    }
    expect(missing).toEqual([]);
  });

  it("matches every tarball against checksums.txt", () => {
    const lines = readFileSync(join(RELEASE, "checksums.txt"), "utf8").trim().split("\n");
    expect(lines).toHaveLength(Object.keys(registry.packages).length);

    const bad: string[] = [];
    for (const line of lines) {
      const [hash, file] = line.trim().split(/\s+/);
      const actual = createHash("sha256").update(readFileSync(join(RELEASE, file))).digest("hex");
      if (actual !== hash) bad.push(file);
    }
    expect(bad).toEqual([]);
  });

  for (const [label, preset] of [
    ["gallery", galleryScenario.preset],
    ["store", storeScenario.preset],
  ] as const) {
    describe(`${label} site import map`, () => {
      const site = emitPlan(plan(preset), createCdnResolver({ base, layout }));

      it("resolves every mapped specifier to a real file", () => {
        const missing = Object.entries(site.importMap.imports)
          .filter(([, url]) => url.startsWith(base))
          .filter(([, url]) => !existsSync(repoPath(url)));
        expect(missing).toEqual([]);
      });

      it("keeps the barrel import closed", () => {
        const barrel = site.importMap.imports["@aio-ui/frameworks"];
        expect(barrel, "@aio-ui/frameworks must be mapped").toBeTruthy();

        const source = readFileSync(repoPath(barrel), "utf8");
        const imports = [...source.matchAll(/from\s+["'](@aio-ui\/[^"']+)["']/g)].map((match) => match[1]);
        expect(imports.length).toBeGreaterThan(0);

        const missing = imports.filter((specifier) => !(specifier in site.importMap.imports));
        expect(missing).toEqual([]);
      });

      it("closes every bare import reachable from the mapped files", () => {
        // A prefix alone cannot add `.js`: `@aio-ui/utilities/AttributeUtils`
        // would become `…/dist/AttributeUtils` and 404. Every bare subpath used
        // by a loaded module must therefore have an exact entry.
        const seen = new Set<string>();
        const pending = Object.values(site.importMap.imports).filter(
          (url) => url.startsWith(base) && url.endsWith(".js"),
        );
        const missing: string[] = [];

        while (pending.length) {
          const url = pending.pop()!;
          if (seen.has(url)) continue;
          seen.add(url);

          const source = readFileSync(repoPath(url), "utf8");
          for (const [, specifier] of source.matchAll(/(?:from\s*|import\s*\(\s*)["'](@aio-ui\/[^"']+)["']/g)) {
            const exact = site.importMap.imports[specifier];
            if (exact) {
              if (exact.startsWith(base) && exact.endsWith(".js")) pending.push(exact);
              continue;
            }
            const hasSubpath = specifier.split("/").length > 2;
            // Bare roots and extensionless subpaths both need an exact key.
            if (!hasSubpath || !/\.[a-z]+$/i.test(specifier)) missing.push(specifier);
          }
        }

        expect(missing).toEqual([]);
        expect(seen.size).toBeGreaterThan(10);
      });

      it("resolves every prefix to a directory that exists", () => {
        const missing = Object.entries(site.importMap.imports)
          .filter(([key]) => key.endsWith("/"))
          .filter(([, url]) => !existsSync(repoPath(url)));
        expect(missing).toEqual([]);
      });

      it("registers and maps every component a page requires", () => {
        // A requirement is what the emitted page definition preloads. If the word has no
        // registration the build is a no-op; if its specifier is not in the import map the
        // browser cannot fetch it. Both surface as a blank element, not as a 404 in CI.
        const missing: string[] = [];

        for (const page of pageRequires(preset)) {
          for (const word of page.requires) {
            const binding = site.bindings.find((entry) => entry.word === word);
            if (!binding) {
              missing.push(`${page.route}: "${word}" has no registration`);
              continue;
            }
            if (!(binding.specifier in site.importMap.imports)) {
              missing.push(`${page.route}: "${word}" → ${binding.specifier} is not in the import map`);
            }
          }
        }

        expect(missing).toEqual([]);
      });
    });
  }

  it("writes a locally servable copy of both sites", () => {
    // The real smoke test: serve the repo root at :5300, open `/.draft/smoke/<site>/`.
    const localBase = "http://localhost:5300/";
    const resolver = createCdnResolver({ base: localBase, layout });
    const out = join(ROOT, ".draft", "smoke");

    for (const [label, preset] of [
      ["gallery", galleryScenario.preset],
      ["store", storeScenario.preset],
    ] as const) {
      rmSync(join(out, label), { recursive: true, force: true });
      const generated = generateSite({ preset, resolver });
      for (const [file, content] of Object.entries(generated.files)) {
        const target = join(out, label, file);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, content, "utf8");
      }
    }

    expect(existsSync(join(out, "gallery", "index.html"))).toBe(true);
    expect(existsSync(join(out, "store", "app.js"))).toBe(true);
  });

  // The real gate: assets come from the published tag, not the repo mirror.
  // Run with SMOKE_BASE=https://cdn.jsdelivr.net/gh/<owner>/<repo>@v<version>/.
  const cdnBase = process.env.SMOKE_BASE;
  it.skipIf(!cdnBase)("writes a copy that loads from the tagged CDN", () => {
    const resolver = createCdnResolver({ base: cdnBase!, layout });
    const out = join(ROOT, ".draft", "cdn-smoke");

    for (const [label, preset] of [
      ["gallery", galleryScenario.preset],
      ["store", storeScenario.preset],
    ] as const) {
      rmSync(join(out, label), { recursive: true, force: true });
      const generated = generateSite({ preset, resolver });
      for (const [file, content] of Object.entries(generated.files)) {
        const target = join(out, label, file);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, content, "utf8");
      }
    }

    expect(existsSync(join(out, "store", "index.html"))).toBe(true);
  });
});
