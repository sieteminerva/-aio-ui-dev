#!/usr/bin/env node
/**
 * LAYOUT PRODUCER — `layout.json` for `createCdnResolver()`.
 *
 * `createCdnResolver()` needs to know two things per package: the repository
 * directory it lives in, and the file that answers its bare specifier. Both are
 * derivable from a workspace scan, so they are generated rather than written by
 * hand per deployment.
 *
 * Usage:
 *   node .draft/preset/layout.mjs            # print JSON to stdout
 *   node .draft/preset/layout.mjs --out f.json
 *
 * Output shape (`PackageLayout` in `emit.ts`):
 *   { "@aio-ui/form": { "dir": "packages/components/form", "entry": "dist/Form.js" } }
 *
 * `entry` is read from the package's own `exports["."].default`, so it always
 * matches what that package actually publishes.
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SECTIONS = [
  "packages",
  "packages/components",
  "packages/modules",
  "packages/themes",
  "packages/kits",
  "packages/utilities",
  "packages/styles",
];

/** Every directory that holds a package.json, workspace-style. */
function candidates() {
  const found = new Set();

  const add = (dir) => {
    try {
      if (statSync(join(dir, "package.json")).isFile()) found.add(dir);
    } catch {
      // No package.json here; a plain folder.
    }
  };

  add(ROOT);
  for (const section of SECTIONS) {
    const base = join(ROOT, section);
    try {
      for (const entry of readdirSync(base, { withFileTypes: true })) {
        if (entry.isDirectory()) add(join(base, entry.name));
      }
    } catch {
      // Section does not exist in this repo.
    }
  }

  return [...found];
}

/** Reads `{ name, dir, entry }` for one package; skips non-publishable ones. */
function readPackage(dir) {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  } catch {
    return null;
  }

  const name = manifest.name;
  if (!name || !name.startsWith("@")) return null;

  /** A conditional export block, or a plain string. */
  const fileOf = (value) =>
    typeof value === "string" ? value : value && typeof value === "object" ? value.default : undefined;

  const exportsMap = manifest.exports ?? {};

  /** The package's own export map, flattened: `"./Form" → "dist/Form.js"`. */
  const subpaths = {};
  for (const [key, value] of Object.entries(exportsMap)) {
    const file = fileOf(value);
    if (typeof file !== "string") continue;
    let target = file.replace(/^\.\//, "");
    // CSS always ships under `dist/`; a root sheet is a source file, not the
    // published one.
    if (target.endsWith(".css") && existsSync(join(dir, "dist", target))) {
      target = `dist/${target}`;
    } else if (!existsSync(join(dir, target)) && existsSync(join(dir, "dist", target))) {
      target = `dist/${target}`;
    }
    subpaths[key] = target;
  }

  // Prefer the root export; scaffolded components only declare a named one
  // (`"./Accordion"`), so fall back to the first `.js` entry in the map.
  let entry = fileOf(exportsMap["."]);
  if (!entry || !entry.endsWith(".js")) {
    entry = Object.entries(exportsMap)
      .filter(([key]) => !key.endsWith(".css"))
      .map(([, value]) => fileOf(value))
      .find((file) => typeof file === "string" && file.endsWith(".js"));
  }

  const relDir = relative(ROOT, dir).replace(/\\/g, "/");

  // CSS-only package (`@aio-ui/styles`): publish its sheets, no module entry.
  if (!entry || !entry.endsWith(".js")) {
    const hasCss = Object.keys(exportsMap).some((key) => key.endsWith(".css"));
    return hasCss ? { name, dir: relDir, stylesRoot: "src", subpaths } : null;
  }

  return {
    name,
    dir: relDir,
    entry: entry.replace(/^\.\//, ""),
    stylesRoot: "dist",
    // A package may publish only named subpaths (`@aio-ui/accordion/Accordion`).
    // The fallback entry above is then a subpath file, not a valid bare import.
    bare: Boolean(exportsMap["."]),
    subpaths,
  };
}

const layout = {};
for (const dir of candidates()) {
  const info = readPackage(dir);
  if (info)
    layout[info.name] = {
      dir: info.dir,
      ...(info.entry ? { entry: info.entry } : {}),
      ...(info.stylesRoot ? { stylesRoot: info.stylesRoot } : {}),
      ...(info.bare === false ? { bare: false } : {}),
      ...(info.subpaths ? { subpaths: info.subpaths } : {}),
    };
}

const json = `${JSON.stringify(layout, null, 2)}\n`;
const outIndex = process.argv.indexOf("--out");

if (outIndex !== -1 && process.argv[outIndex + 1]) {
  writeFileSync(process.argv[outIndex + 1], json, "utf8");
  console.error(`[layout] wrote ${Object.keys(layout).length} packages`);
} else {
  process.stdout.write(json);
}
