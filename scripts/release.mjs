#!/usr/bin/env node
/**
 * RAJUTAN — RELEASE PRODUCER (local, dry-run by default)
 *
 * Turns a built workspace into the artefacts a generated site needs, without
 * publishing to npm:
 *
 *   .draft/release/v<version>/
 *     aio-ui-<name>-<version>.tgz   one per package   (installable by URL)
 *     registry.json                 specifier → tarball + integrity + subpaths
 *     layout.json                   package → dir/entry/stylesRoot/bare
 *     checksums.txt                 sha256 per tarball
 *
 * Usage:
 *   node scripts/release.mjs --version 0.1.0            # plan only
 *   node scripts/release.mjs --version 0.1.0 --apply    # write artefacts
 *
 * Nothing here talks to GitHub. Uploading the folder as a Release asset is the
 * separate (and equally reversible) step; this script only decides *what* a
 * release contains.
 */
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SCOPE = "@aio-ui/";
const SECTIONS = [
  "packages/components",
  "packages/modules",
  "packages/themes",
  "packages/kits",
  "packages/utilities",
  "packages/styles",
];

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const valueOf = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};

const version = valueOf("--version");
const apply = flag("--apply");
const repository = process.env.GITHUB_REPOSITORY || "sieteminerva/-aio-ui-dev";
const outDir = version ? join(ROOT, ".draft", "release", `v${version}`) : null;

if (!version || !/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error("[release] --version <x.y.z> is required (semver, pre-release allowed)");
  process.exit(1);
}

/** Every publishable package directory. */
function packageDirs() {
  const dirs = [];
  const add = (dir) => {
    try {
      if (existsSync(join(dir, "package.json"))) dirs.push(dir);
    } catch {
      // Unreadable directory.
    }
  };

  add(join(ROOT, "packages"));
  for (const section of ["packages", ...SECTIONS]) {
    const base = join(ROOT, section);
    try {
      for (const entry of readdirSync(base, { withFileTypes: true })) {
        if (entry.isDirectory()) add(join(base, entry.name));
      }
    } catch {
      // Section does not exist.
    }
  }
  return dirs;
}

const packages = packageDirs()
  .map((dir) => ({ dir, manifest: JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) }))
  .filter((entry) => String(entry.manifest.name ?? "").startsWith(SCOPE));

// Gate 1: every package carries the released version, otherwise the tarballs
// and the registry would disagree with their own manifests.
const mismatched = packages.filter((entry) => entry.manifest.version !== version);
if (mismatched.length) {
  console.error(
    `[release] ${mismatched.length} package(s) are not at ${version}. ` +
      `Run: node scripts/version.mjs --apply --version ${version}`,
  );
  process.exit(1);
}

// Gate 2: `dist` must exist for the packages the generator points at.
const missingDist = packages.filter((entry) => {
  const rootExport = entry.manifest.exports?.["."];
  const entryFile = typeof rootExport === "string" ? rootExport : rootExport?.default;
  if (!entryFile || !entryFile.endsWith(".js")) return false;
  return !existsSync(join(entry.dir, entryFile.replace(/^\.\//, "")));
});

if (missingDist.length) {
  console.error(`[release] ${missingDist.length} package(s) have no built entry. Run: npm run build:pkgs`);
  missingDist.slice(0, 5).forEach((entry) => console.error(`  - ${entry.manifest.name}`));
  process.exit(1);
}

/** Flattens a conditional export value to its published file. */
function fileOf(value) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") return value.default;
  return undefined;
}

/** `./Form` → `dist/Form.js`; `./Form.css` → `dist/Form.css`; `.` → root entry. */
function subpathsOf(manifest, dir) {
  const map = {};
  const exportsMap = manifest.exports ?? {};

  for (const [key, value] of Object.entries(exportsMap)) {
    const file = fileOf(value);
    if (!file) continue;
    let target = file.replace(/^\.\//, "");
    // CSS always ships under `dist/` (the build copies sheets there); a source
    // file at the package root is not part of the tarball.
    if (target.endsWith(".css") && existsSync(join(dir, "dist", target))) {
      target = `dist/${target}`;
    } else if (!existsSync(join(dir, target)) && existsSync(join(dir, "dist", target))) {
      target = `dist/${target}`;
    }
    map[key === "." ? "." : key] = target;
  }
  return map;
}

console.log(`[release] target v${version} · ${packages.length} package(s) · repo ${repository}`);

if (!apply) {
  for (const entry of packages.slice(0, 5)) {
    console.log(`  ${entry.manifest.name} → ${relative(ROOT, entry.dir)}`);
  }
  if (packages.length > 5) console.log(`  … ${packages.length - 5} more`);
  console.log(`[release] dry run — pass --apply to write ${relative(ROOT, outDir)}`);
  process.exit(0);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const registry = {
  version,
  repository,
  base: `https://cdn.jsdelivr.net/gh/${repository}@v${version}/`,
  generatedAt: new Date().toISOString(),
  packages: {},
};

const checksums = [];
const layout = {};

for (const entry of packages) {
  const name = entry.manifest.name;
  const dir = relative(ROOT, entry.dir).replace(/\\/g, "/");
  const exportMap = entry.manifest.exports ?? {};

  // `npm pack` is the same tool a consumer's installer runs, so the tarball
  // layout matches `files[]` exactly — no hand-rolled archive.
  // A single quoted command string is the only form that survives this
  // workspace path (it contains spaces) on every platform.
  // The `./` prefix is required: npm parses a two-segment relative path
  // (`packages/app`) as GitHub shorthand `owner/repo` and packs over ssh
  // instead of the local directory.
  const output = execSync(`npm pack "./${entry.dir}" --pack-destination "${outDir}" --json`, { cwd: ROOT, encoding: "utf8" });
  const [packed] = JSON.parse(output);

  const tarballPath = join(outDir, packed.filename);
  const sha256 = createHash("sha256").update(readFileSync(tarballPath)).digest("hex");
  checksums.push(`${sha256}  ${packed.filename}`);

  const subpaths = subpathsOf(entry.manifest, entry.dir);
  registry.packages[name] = {
    dir,
    subpaths,
    tarball: `https://github.com/${repository}/releases/download/v${version}/${packed.filename}`,
    integrity: packed.integrity,
    size: packed.size,
  };

  // Layout mirrors the generator's resolver: `entry` is a JS root only, every
  // subpath keeps its real file, and styles live in `dist` for TS packages but
  // `src` for the CSS-only package.
  const rootEntry = subpaths["."]?.endsWith(".js")
    ? subpaths["."]
    : Object.values(subpaths).find((file) => file.endsWith(".js"));
  layout[name] = {
    dir,
    ...(rootEntry ? { entry: rootEntry } : {}),
    stylesRoot: rootEntry ? "dist" : "src",
    ...(rootEntry && subpaths["."] ? {} : { bare: false }),
    subpaths,
  };
}

writeFileSync(join(outDir, "registry.json"), `${JSON.stringify(registry, null, 2)}\n`, "utf8");
writeFileSync(join(outDir, "layout.json"), `${JSON.stringify(layout, null, 2)}\n`, "utf8");
writeFileSync(join(outDir, "checksums.txt"), `${checksums.join("\n")}\n`, "utf8");

console.log(`[release] wrote ${checksums.length} tarball(s) + registry.json + layout.json + checksums.txt`);
console.log(`[release] next: create tag v${version}, then upload ${relative(ROOT, outDir)} as release assets`);
console.log("[release] undo with: rm -rf .draft/release");
