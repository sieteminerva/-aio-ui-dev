#!/usr/bin/env node
/**
 * Public-surface gate.
 *
 * A package barrel (`index.ts` → `exports["."]`) is the one file a consumer actually
 * reads, so it is the one place where a mistake becomes a permanent promise. This script
 * makes that promise explicit and reviewable:
 *
 *   1. a barrel may not use `export *` — the wildcard silently publishes whatever the
 *      implementation file happens to export today (selectors, normalisers, element
 *      types), and it hides collisions instead of reporting them;
 *   2. the names each barrel publishes must match `docs/api-map.json`, so *adding* to
 *      the public surface becomes a visible diff someone has to approve, not a side
 *      effect of a refactor.
 *
 * Kits are the documented exception: `export * from "@aio-ui/<pkg>"` is how an
 * aggregator works, and it inherits the curated surface of the package it points at.
 *
 * Usage:
 *   node scripts/api.mjs            # report the surface
 *   node scripts/api.mjs --check    # fail when the map is stale or a barrel is wild
 *   node scripts/api.mjs --write    # regenerate docs/api-map.json
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MAP_PATH = join(ROOT, "docs", "api-map.json");
const GROUPS = ["packages", "packages/components", "packages/modules", "packages/themes", "packages/kits"];

const CHECK = process.argv.includes("--check");
const WRITE = process.argv.includes("--write");

/** Every package directory in the workspace (examples excluded on purpose). */
function packageDirs() {
  const dirs = [];
  for (const group of GROUPS) {
    const base = join(ROOT, group);
    if (!existsSync(base)) continue;
    for (const entry of readdirSync(base, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dir = join(base, entry.name);
      if (existsSync(join(dir, "package.json"))) dirs.push(dir);
    }
  }
  return dirs;
}

/** Reads a package manifest. */
function manifestOf(dir) {
  return JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
}

/**
 * Parses a barrel into its three possible statements.
 * `wild` and `names` are kept apart so the report can name the offending line.
 */
function parseBarrel(source) {
  const wild = [];
  const values = [];
  const types = [];

  // A brace list may be wrapped over several lines; flatten it so one statement is
  // one line, otherwise a reformat would look like a removed export.
  const text = source.replace(/\{([\s\S]*?)\}/g, (whole) => whole.replace(/\s*\r?\n\s*/g, " "));

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("export")) continue;

    const star = trimmed.match(/^export \* (?:as \w+ )?from ["']([^"']+)["']/);
    if (star) {
      wild.push({ specifier: star[1], line: trimmed });
      continue;
    }

    const named = trimmed.match(/^export (type )?\{([^}]+)\} from ["']([^"']+)["']/);
    if (!named) continue;

    const bucket = named[1] ? types : values;
    for (const raw of named[2].split(",")) {
      const name = raw
        .trim()
        .split(/\s+as\s+/)
        .pop();
      if (name) bucket.push(name);
    }
  }

  return { wild, values, types };
}

/** Specifiers a barrel re-exports from, `./x` normalised to `./x`. */
function shapeOf(dir) {
  const manifest = manifestOf(dir);
  const root = manifest.exports?.["."];
  const barrel = root && typeof root === "object" ? root.development : root;
  if (!barrel) return null;

  const full = join(dir, barrel);
  if (!existsSync(full)) return null;

  const { wild, values, types } = parseBarrel(readFileSync(full, "utf8"));
  return {
    barrel,
    wild: wild.map((entry) => entry.specifier),
    wildLines: wild,
    values: [...new Set(values)].sort(),
    types: [...new Set(types)].sort(),
  };
}

const isKit = (dir) => dir.includes(join("packages", "kits"));

/**
 * Every JS target an `exports` map promises must exist once `dist` is built.
 *
 * This is not pedantry: moving a barrel into `src/` changes `rootDir`, which moves every
 * emitted file, and the map keeps pointing at the old path. Nothing typechecks a
 * published package's paths, so the check has to live here.
 *
 * @returns One line per target that is declared but missing.
 */
function brokenTargets(dir, manifest) {
  const dist = join(dir, "dist");
  if (!existsSync(dist)) return [];

  const broken = [];
  for (const [subpath, value] of Object.entries(manifest.exports ?? {})) {
    const target = typeof value === "string" ? value : value.default;
    if (!target || target.includes("*") || !target.startsWith("./dist/")) continue;
    if (!existsSync(join(dir, target.slice(2))))
      broken.push(`${manifest.name}${subpath === "." ? "" : subpath} → ${target}`);
  }
  return broken;
}

/**
 * Checks that emitted JS is loadable outside a bundler.
 *
 * Two rules, both learned the hard way:
 *
 * 1. a relative specifier must name the file (`.js`) — Node refuses extensionless ones and
 *    a browser import map does no guessing at all, so a barrel that re-exports `./X` would
 *    404 over HTTP;
 * 2. no stylesheet may be imported from JS — a browser rejects `text/css` as a module. CSS
 *    ships as files and the host links them.
 *
 * @returns One line per offending specifier.
 */
function distSpecifierProblems(dir, manifest) {
  const dist = join(dir, "dist");
  if (!existsSync(dist)) return [];

  const problems = [];
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith(".js")) continue;

      const text = readFileSync(full, "utf8");
      // Comments are code-shaped but not code: `base` still carries a commented-out import,
      // and failing on that would train people to ignore the gate.
      const code = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
      const where = full.slice(dir.length + 1).replace(/\\/g, "/");

      for (const match of code.matchAll(/(?:from\s*|import\s*\(\s*)["'](\.{1,2}\/[^"']+)["']/g)) {
        if (!/\.[A-Za-z0-9]+$/.test(match[1])) {
          problems.push(`${manifest.name}/${where}: relative specifier without extension (${match[1]})`);
        }
      }

      for (const match of code.matchAll(/^\s*import\s+["'][^"']+\.css["'];?\s*$/gm)) {
        problems.push(`${manifest.name}/${where}: JS imports a stylesheet (${match[0].trim()})`);
      }
    }
  };

  walk(dist);
  return problems;
}

const problems = [];
const surface = {};

for (const dir of packageDirs().sort()) {
  const name = manifestOf(dir).name;
  const manifest = manifestOf(dir);
  const shape = shapeOf(dir);
  if (!shape) continue;

  for (const line of brokenTargets(dir, manifest)) {
    problems.push(`declared export is missing on disk: ${line}`);
  }

  for (const line of distSpecifierProblems(dir, manifest)) {
    problems.push(line);
  }

  surface[name] = {
    kind: isKit(dir) ? "aggregator" : "package",
    barrel: shape.barrel.replace(/\\/g, "/"),
    ...(shape.wild.length ? { reexports: shape.wild } : {}),
    values: shape.values,
    types: shape.types,
  };

  if (shape.wild.length && !isKit(dir)) {
    for (const entry of shape.wildLines) {
      problems.push(`${name}: \`export *\` in a package barrel publishes undeclared names (${entry.line})`);
    }
  }

  if (shape.wild.length && isKit(dir)) {
    for (const specifier of shape.wild) {
      if (!specifier.startsWith("@aio-ui/")) {
        problems.push(`${name}: an aggregator may only re-export other @aio-ui packages (${specifier})`);
      }
    }
  }

  if (!shape.wild.length && !shape.values.length && !shape.types.length) {
    // A CSS-only package has no names to publish; anything else that publishes nothing is
    // a barrel that lost its content in a refactor.
    const cssOnly = shape.barrel.endsWith(".css");
    if (!cssOnly) problems.push(`${name}: barrel exports nothing (${shape.barrel})`);
  }
}

/** Stable text form, so `--check` compares strings and not objects. */
function serialise(data) {
  return `${JSON.stringify(data, null, 2)}\n`;
}

if (WRITE) {
  const sorted = Object.fromEntries(Object.entries(surface).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(MAP_PATH, serialise({ packages: sorted }));
  console.log(`[api] wrote ${Object.keys(sorted).length} package surface(s) to docs/api-map.json`);
}

if (CHECK) {
  if (!existsSync(MAP_PATH)) {
    problems.push("docs/api-map.json is missing — run `node scripts/api.mjs --write`");
  } else {
    const expected = JSON.parse(readFileSync(MAP_PATH, "utf8")).packages ?? {};
    const sorted = Object.fromEntries(Object.entries(surface).sort(([a], [b]) => a.localeCompare(b)));

    for (const [name, shape] of Object.entries(sorted)) {
      const recorded = expected[name];
      if (!recorded) {
        problems.push(`${name}: not in docs/api-map.json (new public surface, needs approval)`);
        continue;
      }
      const before = { values: recorded.values ?? [], types: recorded.types ?? [], reexports: recorded.reexports ?? [] };
      const after = { values: shape.values, types: shape.types, reexports: shape.reexports ?? [] };
      for (const key of ["values", "types", "reexports"]) {
        const added = after[key].filter((value) => !before[key].includes(value));
        const removed = before[key].filter((value) => !after[key].includes(value));
        if (added.length) problems.push(`${name}: ${key} added → ${added.join(", ")}`);
        if (removed.length) problems.push(`${name}: ${key} removed → ${removed.join(", ")}`);
      }
    }

    for (const name of Object.keys(expected)) {
      if (!sorted[name]) problems.push(`${name}: in docs/api-map.json but no longer built`);
    }
  }
}

if (!CHECK && !WRITE) {
  for (const [name, shape] of Object.entries(surface)) {
    const parts = shape.values.length + shape.types.length;
    const hint = shape.reexports ? `re-exports ${shape.reexports.join(", ")}` : `${parts} name(s)`;
    console.log(`${name.padEnd(26)} ${hint}`);
  }
}

if (problems.length && CHECK) {
  console.error(`\n✖ ${problems.length} public-surface problem(s):\n`);
  for (const line of problems) console.error(`  ${line}`);
  console.error("\n  Fix the barrel, or accept the change with `node scripts/api.mjs --write`.\n");
  process.exit(1);
}

if (!CHECK) console.log(`✓ ${Object.keys(surface).length} curated surface(s)`);
else if (!problems.length) console.log(`✓ ${Object.keys(surface).length} curated surface(s) match docs/api-map.json`);
