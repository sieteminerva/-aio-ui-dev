#!/usr/bin/env node
/**
 * Boundary gate.
 *
 * Enforces `docs/framework/BOUNDARIES.md` mechanically, so a violation fails the build instead
 * of relying on review. Five checks:
 *
 *   1. package-to-package edges follow the dependency graph,
 *   2. `@aio-ui/app` imports `@aio-ui/core` as types only (no code rides along),
 *   3. every deep import resolves through the target package's `exports` map, or to a
 *      real file when the package has no map (components are flat),
 *   4. `import.meta.glob` only exists in the host application,
 *   5. no `paths` aliases in tsconfig and no `alias` entries in a Vite config.
 *
 * Usage: `npm run check:bounds`
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Allowed target categories per source category. `*` means anything. */
const ALLOWED = {
  styles: [],
  utilities: ["core"],
  core: ["utilities"],
  base: ["core", "utilities"],
  modules: ["core", "utilities"],
  // A theme is an installable add-on: it may use core types and nothing else. The theme
  // engine (`@aio-ui/theme`) consumes themes; themes never consume the engine.
  themes: ["core", "utilities"],
  components: ["base", "core", "utilities", "modules", "themes", "components"],
  app: ["core"],
  // A kit is a pure aggregator: it re-exports other packages and holds no logic, so it
  // is allowed to point at any category. Nothing may depend on a kit.
  kits: "*",
  examples: "*",
};

/** Aggregator package names — the only packages that live under `packages/kits`. */
const KIT_NAMES = new Set(["frameworks", "modules", "themes"]);

/** Files the scanner reads. */
const SOURCE = /\.(ts|tsx|mts|js|mjs)$/;
const SKIP = new Set(["node_modules", "dist", ".git", "__tests__"]);

/** Maps a repository path to a category + package folder. */
function describe(path) {
  const parts = relative(ROOT, path).split(/[\\/]/);
  const [root, group, leaf] = parts;

  if (root === "examples") return { category: "examples", dir: join(ROOT, "examples", group) };
  if (root !== "packages" || !group) return null;

  if (group === "modules") return { category: "modules", dir: join(ROOT, "packages", "modules", leaf ?? "") };
  if (group === "themes") return { category: "themes", dir: join(ROOT, "packages", "themes", leaf ?? "") };
  if (group === "components") return { category: "components", dir: join(ROOT, "packages", "components", leaf ?? "") };
  if (group === "kits") return { category: "kits", dir: join(ROOT, "packages", "kits", leaf ?? "") };
  return { category: group, dir: join(ROOT, "packages", group) };
}

const violations = [];

/** Walks source files under a directory. */
function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (SOURCE.test(entry)) yield full;
  }
}

/** Category of a `@aio-ui/...` specifier. */
function categoryOf(specifier) {
  const [scope, name, ...rest] = specifier.replace(/\?.*$/, "").split("/");
  if (scope !== "@aio-ui" || !name) return null;

  const category =
    name === "module-loader"
      ? "modules"
      : name === "theme" || name.startsWith("theme-")
        ? "themes"
        : ["frameworks", "modules", "themes"].includes(name) && KIT_NAMES.has(name)
          ? "kits"
          : ["core", "base", "app", "utilities", "styles"].includes(name)
            ? name
            : "components";

  return { category, package: name, sub: rest.join("/") || undefined };
}

/** Checks that a subpath is declared (or resolves to a file when no map exists). */
function subpathResolves(name, sub) {
  const clean = sub.replace(/\?.*$/, "");
  const mounted = join(ROOT, "node_modules", "@aio-ui", name);
  const dir = existsSync(mounted)
    ? mounted
    : (["components", "modules", "themes", "kits"]
        .map((group) => join(ROOT, "packages", group, name))
        .find((candidate) => existsSync(candidate)) ?? join(ROOT, "packages", "components", name));

  const manifestPath = join(dir, "package.json");
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (manifest.exports) return Boolean(manifest.exports[`./${clean}`]);
  }

  return ["", ".ts", ".tsx", ".css"].some((ext) => existsSync(join(dir, `${clean}${ext}`)));
}

/** Drops block comments and full-line comments, so prose is never mistaken for code. */
function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/** Scans one file. */
function scan(file) {
  const { category } = describe(file);
  const text = stripComments(readFileSync(file, "utf8"));
  const label = relative(ROOT, file).replace(/\\/g, "/");

  if (category !== "examples" && /import\.meta\.glob/.test(text)) {
    violations.push(`${label}: import.meta.glob outside the host application`);
  }

  const statements = text.matchAll(/^\s*(import|export)\s+([\s\S]*?)from\s*["']([^"']+)["']/gm);
  for (const [, , clause, specifier] of statements) {
    const target = categoryOf(specifier);
    if (!target) continue;

    const allowed = ALLOWED[category] ?? [];
    if (allowed !== "*" && !allowed.includes(target.category)) {
      violations.push(`${label}: ${category} → ${target.category} is not allowed (${specifier})`);
    }

    // A kit is an entry point for consumers only; workspace code uses the real packages.
    if (target.category === "kits" && category !== "kits" && category !== "examples") {
      violations.push(`${label}: ${category} must not depend on the kit @aio-ui/${target.package}`);
    }

    if (category === "app" && target.category === "core" && !/^\s*type\b/.test(clause)) {
      violations.push(`${label}: app must import core as types only (${specifier})`);
    }

    if (target.sub && !subpathResolves(target.package, target.sub)) {
      violations.push(`${label}: ${specifier} is not a declared export of @aio-ui/${target.package}`);
    }
  }
}

// ---- 1–4: package edges, type-only app, exports, globs -------------------
for (const group of ["packages", "examples"]) {
  for (const file of walk(join(ROOT, group))) scan(file);
}

// ---- 5: aliases ----------------------------------------------------------
const tsconfigPath = join(ROOT, "tsconfig.base.json");
if (existsSync(tsconfigPath) && /"paths"\s*:/.test(readFileSync(tsconfigPath, "utf8"))) {
  violations.push("tsconfig.base.json: `paths` aliases are not allowed (workspace links only)");
}

for (const config of ["vite.config.ts", join("examples", "gallery", "vite.config.ts")]) {
  const full = join(ROOT, config);
  if (existsSync(full) && /\balias\s*:/.test(readFileSync(full, "utf8"))) {
    violations.push(`${config}: Vite \`alias\` is not allowed (workspace links only)`);
  }
}

if (violations.length) {
  console.error(`\n✖ ${violations.length} boundary violation(s):\n`);
  for (const line of violations) console.error(`  ${line}`);
  process.exit(1);
}

console.log("✓ boundaries clean");
