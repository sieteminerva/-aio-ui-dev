#!/usr/bin/env node
/**
 * Publish preparation for the workspace packages.
 *
 * Turns every package under `packages/**` into something a consumer can install:
 *
 * - a `tsconfig.build.json` that emits JS + `.d.ts` into `dist/`, mirroring the source
 *   tree — mirroring is mandatory because each `exports` subpath names one file, so a
 *   bundler would flatten the tree and break `@aio-ui/<pkg>/<Subpath>`;
 * - `exports` rewritten to *conditions* instead of replaced:
 *   `development` → source (Vite dev keeps reading `.ts` ⇒ HMR), `types` → `dist/*.d.ts`,
 *   `default` → `dist/*.js`. CSS entries are left alone: they are shipped as files, not
 *   compiled, and `files` already includes `*.css`;
 * - `build` + `prepublishOnly` scripts and `dist` added to `files`.
 *
 * `tsc` and not tsup/rollup, for the same reason: one file in, one file out, plus types.
 *
 * Usage:
 *   node scripts/build-pack.mjs            # report what would change
 *   node scripts/build-pack.mjs --apply    # write the changes
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname, posix } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APPLY = process.argv.includes("--apply");
const GROUPS = ["packages", "packages/components", "packages/modules", "packages/themes", "packages/kits"];

/** Every directory that carries a `package.json`, skipping the examples. */
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
function readManifest(dir) {
  return JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
}

/** The source path of an `exports` value, whatever shape it is in. */
function sourcePathOf(value) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") return value.development ?? value.default ?? null;
  return null;
}

/**
 * Where the package's sources live relative to the package root.
 *
 * @returns `"src"` for packages that keep sources in `src/`, `"."` for flat ones,
 * `null` when the package ships no TypeScript at all.
 * @summary It decides `rootDir` *and* how an `exports` target maps into `dist/`:
 * `./src/helper.ts` → `helper.js`, `./Input.ts` → `Input.js`.
 */
function sourceRoot(manifest) {
  const targets = Object.values(manifest.exports ?? {})
    .map(sourcePathOf)
    .filter(Boolean);
  const tsTargets = targets.filter((value) => value.endsWith(".ts"));
  if (!tsTargets.length) return null;
  return tsTargets.every((value) => value.startsWith("./src/")) ? "src" : ".";
}

/**
 * Builds an `exports` map for a package that has none.
 *
 * @param dir - Package directory.
 * @returns Subpath → source file, covering root-level modules and stylesheets.
 * @summary Most components are *flat*: they were resolved by file name, so they never
 * needed a map. A published package does need one — without `exports` the consumer gets an
 * `ERR_PACKAGE_PATH_NOT_EXPORTED` — so the map is derived from the files that are actually
 * there instead of being invented.
 */
function synthesiseExports(dir) {
  const map = {};
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (entry.name === "package.json" || entry.name.startsWith("tsconfig")) continue;
    const ts = /^(.+)\.ts$/.exec(entry.name);
    if (ts) {
      map[`./${ts[1]}`] = `./${entry.name}`;
      if (ts[1] === "index") map["."] = `./${entry.name}`;
      continue;
    }
    if (/\.css$/.test(entry.name)) map[`./${entry.name}`] = `./${entry.name}`;
  }
  return map;
}

/** Turns `./src/helper.ts` (root `src`) into `helper.js`, `./Input.ts` into `Input.js`. */
function distTarget(packagePath, root) {
  const relative = packagePath.replace(/^\.\//, "");
  const stripped = root === "src" ? relative.replace(/^src\//, "") : relative;
  const base = stripped.replace(/\.tsx?$/, "");
  return { types: `./dist/${base}.d.ts`, default: `./dist/${base}.js` };
}

/** Conditional form of one `exports` value. */
function conditional(packagePath, root) {
  if (!packagePath.endsWith(".ts")) return packagePath; // CSS and friends ship as files
  const { types, default: js } = distTarget(packagePath, root);

  // Already prepared: keep it, so re-running is a no-op.
  return { development: packagePath, types, default: js };
}

/** Whether an `exports` value is already conditional. */
function isConditional(value) {
  return value && typeof value === "object" && "development" in value;
}

/** The build config for one package. */
function buildConfig(root, extendsPath, name) {
  return {
    "//": "Generated by scripts/build-pack.mjs — one file in, one file out, plus types.",
    extends: extendsPath,
    compilerOptions: {
      noEmit: false,
      // Only meaningful for no-emit builds; must be off to emit.
      allowImportingTsExtensions: false,
      declaration: true,
      declarationMap: true,
      sourceMap: true,
      outDir: "./dist",
      rootDir: root === "src" ? "./src" : ".",
      // A package that is part of a type-level cycle (`message` → `form` → `message`) would
      // otherwise resolve its own name through `exports` → `dist/*.d.ts` and then treat that
      // output as an input (TS5055). Pointing the package at itself keeps the cycle on
      // sources.
      paths: { [`${name}/*`]: [root === "src" ? "./src/*" : "./*"] },
      // `types` is intentionally inherited from the base config: `vite/client` is what
      // declares `import.meta.env` and `*.css` side-effect imports, and dropping it made
      // those two fail as soon as the package was compiled for real.
    },
    include: root === "src" ? ["src"] : ["**/*.ts"],
    // `dist/**` and not `dist`: the emitted `.d.ts` must never be treated as an input, or
    // tsc refuses with TS5055 ("would overwrite input file") on the second build.
    exclude: ["dist/**", "**/__tests__/**", "node_modules"],
  };
}

/** Path to the shared config, as seen from one package (`../` or `../../`). */
function extendsBaseFrom(dir) {
  const depth = posix.relative(pathToPosix(ROOT), pathToPosix(dir)).split("/").length;
  return `${"../".repeat(depth)}tsconfig.base.json`;
}

/** Windows paths to POSIX so `exports`-style logic can be reused on both. */
function pathToPosix(value) {
  return value.split("\\").join("/");
}

const report = [];

for (const dir of packageDirs()) {
  const manifest = readManifest(dir);
  const name = manifest.name;

  // A flat component has no map to rewrite; derive one from its files first.
  if (!manifest.exports || !Object.keys(manifest.exports).length) {
    manifest.exports = synthesiseExports(dir);
  }

  const root = sourceRoot(manifest);

  if (!root) {
    report.push(`${name}: skip (no TypeScript export)`);
    continue;
  }

  const changes = [];
  const nextExports = {};
  let rewrote = false;

  for (const [subpath, value] of Object.entries(manifest.exports ?? {})) {
    if (isConditional(value)) {
      nextExports[subpath] = value;
      continue;
    }
    const prepared = conditional(value, root);
    if (typeof prepared === "object") rewrote = true;
    nextExports[subpath] = prepared;
  }

  // Every stylesheet the package ships must be reachable: hosts import them by specifier
  // (`@aio-ui/article/Article.css`), and a missing export is a hard resolution error.
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".css")) continue;
    const key = `./${entry.name}`;
    if (nextExports[key] === undefined) {
      nextExports[key] = key;
      rewrote = true;
    }
  }

  if (rewrote) changes.push("exports→conditional");

  const nextFiles = new Set(manifest.files ?? []);
  if (!nextFiles.has("dist")) {
    // `dist` first: it is the runtime path, the sources ride along for debugging.
    manifest.files = ["dist", ...nextFiles];
    changes.push("files+dist");
  }

  const scripts = manifest.scripts ?? {};
  if (scripts.build !== "tsc -p tsconfig.build.json") changes.push("scripts.build");
  if (scripts.prepublishOnly !== "npm run build") changes.push("prepublishOnly");

  const configPath = join(dir, "tsconfig.build.json");
  if (!existsSync(configPath)) changes.push("tsconfig.build.json");

  report.push(changes.length ? `${name}: ${changes.join(", ")}` : `${name}: ok`);

  if (!APPLY) continue;

  manifest.exports = nextExports;
  manifest.scripts = {
    ...scripts,
    build: "tsc -p tsconfig.build.json",
    prepublishOnly: "npm run build",
  };
  // The config is always rewritten: it is generated, and a stale one is worse than none.
  writeFileSync(join(dir, "package.json"), JSON.stringify(manifest, null, 2) + "\n");
  writeFileSync(configPath, JSON.stringify(buildConfig(root, extendsBaseFrom(dir), name), null, 2) + "\n");
}

console.log(report.join("\n"));
console.log(APPLY ? "\napplied" : "\ndry run — pass --apply to write");

if (process.argv.includes("--build")) buildInOrder();

/**
 * Copies every stylesheet into `dist`, mirroring its path.
 *
 * @param dir - Package root.
 * @summary Some modules import their own sheet (`Animations.ts` does), and the emitted
 * JS keeps that relative specifier — without the copy, the built package would reference a
 * file that only exists in the source tree.
 */
function copyStylesheets(dir) {
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.name === "dist" || entry.name === "node_modules") continue;
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith(".css")) continue;
      const relative = full.slice(dir.length + 1);
      const target = join(dir, "dist", relative);
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(full, target);
    }
  };
  walk(dir);
}

/**
 * Builds every package, dependencies first.
 *
 * @summary Order is not cosmetic here: a package's `exports` point at `dist/*.d.ts`, so a
 * dependent cannot typecheck until its dependency has emitted. `npm run build --workspaces`
 * does not order by peer (which is what the internal edges are now), so the sort is done
 * here — alphabetical-first was enough to fail `form` before `message`.
 */
function buildInOrder() {
  const packages = packageDirs()
    .map((dir) => {
      const manifest = readManifest(dir);
      const local = [...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.peerDependencies ?? {})].filter(
        (dep) => dep.startsWith("@aio-ui/"),
      );
      return { dir, name: manifest.name, local, hasBuild: Boolean(manifest.scripts?.build) };
    })
    .filter((entry) => entry.hasBuild);

  const byName = new Map(packages.map((entry) => [entry.name, entry]));
  const ordered = [];
  const visiting = new Set();

  const visit = (entry) => {
    if (ordered.includes(entry) || visiting.has(entry.name)) return;
    visiting.add(entry.name);
    for (const dep of entry.local) {
      const target = byName.get(dep);
      if (target) visit(target);
    }
    visiting.delete(entry.name);
    ordered.push(entry);
  };

  for (const entry of packages) visit(entry);

  const compile = (entry) => {
    copyStylesheets(entry.dir);
    const result = spawnSync(
      process.execPath,
      [join(ROOT, "node_modules", "typescript", "bin", "tsc"), "-p", "tsconfig.build.json"],
      {
        cwd: entry.dir,
        encoding: "utf8",
        shell: false,
      },
    );
    return result.status === 0 ? null : (result.stdout || "") + (result.stderr || "");
  };

  const failures = new Map();
  for (const entry of ordered) {
    const error = compile(entry);
    if (error) failures.set(entry.name, { entry, error });
  }

  // `form` and `message` are a declared type-level cycle, so the topological sort has to
  // break the loop somewhere and one of the two may compile before the other has emitted
  // `dist`. One retry costs nothing and is honest about the cycle, instead of pretending
  // the order is acyclic.
  if (failures.size) {
    for (const [name, { entry }] of [...failures]) {
      const error = compile(entry);
      if (!error) failures.delete(name);
    }
  }

  let failed = 0;
  for (const { entry, error } of failures.values()) {
    failed += 1;
    console.log(`\nFAIL ${entry.name}\n${error}`);
  }

  console.log(failed ? `\n${failed} package(s) failed` : `\nbuilt ${ordered.length} package(s)`);
  if (failed) process.exitCode = 1;
}
