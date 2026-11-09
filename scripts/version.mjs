#!/usr/bin/env node
/**
 * RAJUTAN — VERSION WRITER
 *
 * Fixed versioning: one number for the whole `@aio-ui/*` family. Peers point at
 * each other, so independent versions would mean 34 numbers that must agree
 * anyway — and one forgotten peer breaks an install.
 *
 * Usage:
 *   node scripts/version.mjs                              # report only
 *   node scripts/version.mjs --check                      # exit 1 on drift
 *   node scripts/version.mjs --apply --version 0.1.0      # write
 *
 * Everything is reversible: `--apply` only edits `package.json` files, which git
 * tracks. Undo with `git restore packages package.json`.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SCOPE = "@aio-ui/";
const SECTIONS = ["packages/components", "packages/modules", "packages/themes", "packages/utilities", "packages/styles"];

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const valueOf = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};

const targetVersion = valueOf("--version");
const apply = flag("--apply");
const check = flag("--check");

/** Every publishable package directory: workspace sections + `packages/*`. */
function packageDirs() {
  const dirs = new Set();

  const add = (dir) => {
    try {
      if (statSync(join(dir, "package.json")).isFile()) dirs.add(dir);
    } catch {
      // No manifest here.
    }
  };

  add(ROOT);
  add(join(ROOT, "packages"));
  for (const section of ["packages", ...SECTIONS]) {
    const base = join(ROOT, section);
    try {
      for (const entry of readdirSync(base, { withFileTypes: true })) {
        if (entry.isDirectory()) add(join(base, entry.name));
      }
    } catch {
      // Section absent in this checkout.
    }
  }

  return [...dirs];
}

/** Reads one manifest. */
function read(dir) {
  const path = join(dir, "package.json");
  return { dir, path, manifest: JSON.parse(readFileSync(path, "utf8")) };
}

const packages = packageDirs()
  .map(read)
  // Examples are apps, not published packages: they keep their own version.
  .filter((entry) => String(entry.manifest.name ?? "").startsWith(SCOPE));

const versions = new Map();
for (const entry of packages) {
  const current = entry.manifest.version ?? "0.0.0";
  if (!versions.has(current)) versions.set(current, []);
  versions.get(current).push(entry.manifest.name);
}

const drift = versions.size > 1;

/** Peer/dependency entries that point at a sibling package. */
function internalRefs(manifest) {
  const refs = [];
  for (const field of ["dependencies", "peerDependencies", "optionalDependencies"]) {
    const bag = manifest[field];
    if (!bag) continue;
    for (const [name, range] of Object.entries(bag)) {
      if (name.startsWith(SCOPE)) refs.push({ field, name, range });
    }
  }
  return refs;
}

if (check || !apply) {
  console.log(`[version] ${packages.length} package(s)`);
  for (const [version, names] of versions) {
    console.log(`  ${version}: ${names.length} package(s)`);
  }

  const bad = packages.flatMap((entry) =>
    internalRefs(entry.manifest)
      .filter((ref) => !/^\^\d+\.\d+\.\d+/.test(ref.range))
      .map((ref) => `${entry.manifest.name} → ${ref.field}.${ref.name} = ${ref.range}`),
  );

  if (bad.length) {
    console.log(`[version] non-semver internal ranges (${bad.length}):`);
    bad.slice(0, 10).forEach((line) => console.log(`  ${line}`));
  }

  if (drift) console.log("[version] DRIFT: packages disagree on the version");

  if (check && (drift || bad.length)) {
    console.error("[version] check failed");
    process.exit(1);
  }

  if (!apply) {
    console.log("[version] report only — pass --apply --version <x.y.z> to write");
  }
  process.exit(0);
}

if (!targetVersion || !/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(targetVersion)) {
  console.error("[version] --apply requires --version <x.y.z> (semver, pre-release allowed)");
  process.exit(1);
}

const changed = [];

for (const entry of packages) {
  const manifest = entry.manifest;
  const before = JSON.stringify(manifest);

  manifest.version = targetVersion;

  // Every internal range is rewritten, so a missing bump cannot slip through.
  for (const field of ["dependencies", "peerDependencies", "optionalDependencies"]) {
    const bag = manifest[field];
    if (!bag) continue;
    for (const name of Object.keys(bag)) {
      if (name.startsWith(SCOPE)) bag[name] = `^${targetVersion}`;
    }
  }

  if (JSON.stringify(manifest) !== before) {
    writeFileSync(entry.path, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    changed.push(relative(ROOT, entry.path));
  }
}

// The workspace root is private, but it carries the same number for tooling.
const rootPath = join(ROOT, "package.json");
const rootManifest = JSON.parse(readFileSync(rootPath, "utf8"));
if (rootManifest.version !== targetVersion) {
  rootManifest.version = targetVersion;
  writeFileSync(rootPath, `${JSON.stringify(rootManifest, null, 2)}\n`, "utf8");
  changed.push("package.json");
}

console.log(`[version] set ${targetVersion} on ${changed.length} file(s)`);
console.log("[version] undo with: git restore packages package.json");
