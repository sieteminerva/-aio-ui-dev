#!/usr/bin/env node
/**
 * CDN PUBLISHER — put the built packages behind the version tag.
 *
 * jsDelivr serves repository files, but `dist/` is gitignored on `main`, so a
 * tag on `main` 404s for every import-map URL. This script rebuilds the tag
 * content from the release tarballs (exactly what consumers install) on a
 * dedicated orphan `cdn` branch:
 *
 *   <repo>/packages/components/form/dist/Form.js
 *   <repo>/packages/styles/src/index.css
 *   <repo>/registry.json  layout.json  checksums.txt
 *
 * It then moves the version tag onto that commit. The release assets stay
 * attached to the tag name, and `registry.base` keeps pointing at `@v<version>/`.
 *
 * Usage:
 *   node scripts/publish-cdn.mjs                 # dry run: assemble the tree
 *   node scripts/publish-cdn.mjs --apply         # commit, tag, push
 *   node scripts/publish-cdn.mjs --apply --remote origin
 */
import { execSync } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const valueOf = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};

const apply = flag("--apply");
const remote = valueOf("--remote") ?? "origin";
const version = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version;
const releaseDir = join(ROOT, ".draft", "release", `v${version}`);
const treeDir = join(ROOT, ".draft", "cdn-tree");
const worktree = join(ROOT, ".draft", "cdn-worktree");
const tag = `v${version}`;

if (!existsSync(join(releaseDir, "registry.json"))) {
  console.error(`[cdn] no artefacts at ${releaseDir}. Run release.mjs --apply first.`);
  process.exit(1);
}

const registry = JSON.parse(readFileSync(join(releaseDir, "registry.json"), "utf8"));

// ---- 1. Assemble the tree from the tarballs --------------------------------
rmSync(treeDir, { recursive: true, force: true });
for (const [name, entry] of Object.entries(registry.packages)) {
  const tarball = join(releaseDir, entry.tarball.split("/").pop());
  const target = join(treeDir, entry.dir);
  mkdirSync(target, { recursive: true });
  // Windows `tar` treats `C:\...` as a remote host, so pass repo-relative paths.
  const fromRoot = (path) => relative(ROOT, path).replace(/\\/g, "/");
  execSync(`tar -xzf "${fromRoot(tarball)}" -C "${fromRoot(target)}" --strip-components=1`, {
    cwd: ROOT,
    stdio: "pipe",
  });
  if (!existsSync(join(target, "package.json"))) {
    console.error(`[cdn] ${name}: tarball did not unpack into ${entry.dir}`);
    process.exit(1);
  }
}
for (const file of ["registry.json", "layout.json", "checksums.txt"]) {
  copyFileSync(join(releaseDir, file), join(treeDir, file));
}
console.log(`[cdn] assembled ${Object.keys(registry.packages).length} packages for ${tag}`);

if (!apply) {
  console.log(`[cdn] dry run — tree at ${treeDir}; pass --apply to commit and push`);
  process.exit(0);
}

// ---- 2. Commit on an orphan `cdn` branch -----------------------------------
rmSync(worktree, { recursive: true, force: true });
execSync(`git worktree add -f --detach "${worktree}" HEAD`, { cwd: ROOT, stdio: "pipe" });
try {
  execSync("git checkout --orphan cdn", { cwd: worktree, stdio: "pipe" });
} catch {
  // The branch already exists from a previous publish; reuse it.
  execSync("git checkout -f cdn", { cwd: worktree, stdio: "pipe" });
}
try {
  execSync("git rm -rf . --quiet", { cwd: worktree, stdio: "pipe" });
} catch {
  // Nothing tracked yet on a brand-new orphan branch.
}

// Node's own recursive copy: no `cp` in cmd.exe.
cpSync(treeDir, worktree, { recursive: true });
execSync("git add -A", { cwd: worktree, stdio: "pipe" });
execSync(`git -c user.name=cdn -c user.email=cdn@local commit -m "cdn: ${tag}"`, {
  cwd: worktree,
  stdio: "pipe",
});
execSync(`git tag -f ${tag}`, { cwd: worktree, stdio: "pipe" });

// ---- 3. Push the branch and the moved tag ----------------------------------
execSync(`git push ${remote} cdn --force`, { cwd: worktree, stdio: "inherit" });
execSync(`git push ${remote} refs/tags/${tag} --force`, { cwd: worktree, stdio: "inherit" });

execSync(`git worktree remove --force "${worktree}"`, { cwd: ROOT, stdio: "pipe" });
rmSync(treeDir, { recursive: true, force: true });
console.log(`[cdn] pushed cdn branch + ${tag} to ${remote}`);
console.log(`[cdn] verify: https://cdn.jsdelivr.net/gh/<owner>/<repo>@${tag}/registry.json`);
