# Live CDN repository

Operational guide for the published `@aio-ui/*` packages: what is live, which repository and tag
serve it, the commands that publish it, and the checks that must pass before anything is pushed.

Last verified: **2026-11-13** — `v0.1.1` is the current tag: 7/7 sampled CDN URLs return `200`,
`@v0.1.1`, `@cdn` and `@5a7fc27` all report **39** packages with an identical registry, the CDN
`checksums.txt` is byte-identical to the local one, and the GitHub release holds **42** assets
(39 `aio-ui-<name>-0.1.1.tgz` + `registry.json` + `layout.json` + `checksums.txt`). The `v0.1.0`
tag stays frozen at the old 37-package commit — expected, not a defect: jsDelivr pins a served tag
permanently, so a fix ships as a **new version** (§8). Installing from a clone is §3, the branch
README is §2.1.

## 1. What is live

| Piece          | Value                                                                                           |
| -------------- | ----------------------------------------------------------------------------------------------- |
| Repository     | `https://github.com/sieteminerva/-aio-ui-dev` (public)                                          |
| Default branch | `main` — source only; `dist/` is gitignored                                                     |
| CDN branch     | `cdn` — orphan branch, contains the unpacked tarballs (`packages/**/dist`, CSS, `package.json`) |
| Version tag    | `v0.1.1` at `5a7fc27` — points at the `cdn` commit, **not** at `main`                           |
| CDN base       | `https://cdn.jsdelivr.net/gh/sieteminerva/-aio-ui-dev@v0.1.1/`                                  |
| Branch README  | `…@v0.1.1/README.md` — generated at publish time, see §2.1                                      |
| Release assets | 42 files: 39 `aio-ui-<name>-0.1.1.tgz` + `registry.json` + `layout.json` + `checksums.txt`      |
| Packages       | 39 (base/core/app/styles/utilities, 22 components, 6 modules, 3 themes, 3 kits)                 |

Why the split: jsDelivr serves **repository files**, and `dist/` is not committed on `main`.
`scripts/publish-cdn.mjs` rebuilds the tag content from the release tarballs on `cdn`, so the
import map works while `main` stays source-only. Release assets are for `npm i`; the CDN is for
the browser import map.

> **Resolved 2026-11-13.** `v0.1.0` was published and then force-moved; jsDelivr had already
> pinned it, so that tag keeps serving the first commit it saw (37 packages, old `integrity`).
> Batch 13 stopped repairing it and published `v0.1.1`. Never move a tag jsDelivr has served —
> bump the version. `@cdn` and `@<commit-sha>` are the only refs that revalidate.

## 2. Live URLs

```text
registry     https://cdn.jsdelivr.net/gh/sieteminerva/-aio-ui-dev@v0.1.1/registry.json
layout       https://cdn.jsdelivr.net/gh/sieteminerva/-aio-ui-dev@v0.1.1/layout.json
checksums    https://cdn.jsdelivr.net/gh/sieteminerva/-aio-ui-dev@v0.1.1/checksums.txt
readme       https://cdn.jsdelivr.net/gh/sieteminerva/-aio-ui-dev@v0.1.1/README.md

# bare package root → <dir>/<entry>
@aio-ui/frameworks   …@v0.1.1/packages/kits/frameworks/dist/index.js
@aio-ui/form         …@v0.1.1/packages/components/form/dist/index.js

# exact export subpath → <dir>/<real file>
@aio-ui/form/Input.FormAdapter
    …@v0.1.1/packages/components/form/dist/Input.FormAdapter.js
@aio-ui/input/dropdown/module
    …@v0.1.1/packages/components/input/dist/Dropdown/Dropdown.InputModule.js

# stylesheet → dist/ (never the source root)
@aio-ui/form/Form.css
    …@v0.1.1/packages/components/form/dist/Form.css
```

URL = `base` + `layout[pkg].dir` + the file from that package's `exports` map. Prefixes alone
(`@aio-ui/utilities/` → `…/utilities/dist/`) cannot add `.js`; the import map therefore carries
every exact subpath too (`emit.ts` → `createCdnResolver().exact()`).

`@v0.1.1` is the current tag. jsDelivr also accepts `@0.1.1` (it normalises), but generated sites
always use the tag name recorded as `engine.resolved`.

### 2.1 Branch README

`publish-cdn.mjs` renders `templates/cdn/README.md.tpl` into `README.md` on the `cdn` branch, so
the published branch documents itself instead of depending on a guide that never ships there. The
package table is generated from `registry.json` at publish time (name, directory, root entry,
release asset), so it cannot go stale; the rest covers import-map refs, offline install from the
release assets with the peer closure, updates, and tag immutability.

Verified: `curl -sI …@v0.1.1/README.md` → `200`, body reports `Version 0.1.1` / `Packages 39`.

## 3. Installing locally (the packages are not on npm)

No `@aio-ui/*` package is published to the npm registry, so `npm i @aio-ui/core` fails. A
project consumes the framework from this repository. Two facts follow from that:

- `dist/` is gitignored — a fresh clone has **no** `dist/`, and nothing is importable until
  `npm run build:pkgs` has run once.
- The workspace is **39 packages** in six globs: `packages/*` (5: `app`, `base`, `core`,
  `styles`, `utilities`), `packages/components/*` (22), `packages/modules/*` (6),
  `packages/themes/*` (3), `packages/kits/*` (3), plus `examples/*` (2 apps).

### 3.1 Clone and build once

```bash
git clone https://github.com/sieteminerva/-aio-ui-dev.git aio-ui
cd aio-ui
npm install          # workspace install: 39 packages + 2 examples
npm run build:pkgs   # writes dist/ (JS + .d.ts + copied CSS) for every TS package
npm run verify       # optional gate: typecheck → bounds → api → version → tests → examples
```

`npm run build:pkgs` builds **38** of the 39: `@aio-ui/styles` is CSS-only and has no build
script. `check:api` and `version:check` still report 39.

### 3.2 Consume it from another project

**A. `file:` dependencies (bundled app).** Declare every package you need. Components depend on
each other through `peerDependencies` (`@aio-ui/base`, `@aio-ui/core`, …); npm resolves a peer to
the installed copy only when that copy is declared locally, otherwise it tries the registry and
404s.

```json
{
  "dependencies": {
    "@aio-ui/core": "file:../aio-ui/packages/core",
    "@aio-ui/base": "file:../aio-ui/packages/base",
    "@aio-ui/code-block": "file:../aio-ui/packages/components/code-block"
  }
}
```

Then `npm install`. `file:` copies at install time, so re-run it after every framework pull.

> Do **not** consume `@aio-ui/frameworks` / `@aio-ui/modules` / `@aio-ui/themes` as `file:`
> deps: the kits declare real `dependencies` on unpublished packages, so npm would go to the
> registry. Import the individual packages instead, or use option B.

**B. Workspace link (framework and app in one repo).** Add the app as another workspace member —
this is what `examples/demo` and `examples/gallery` do:

```bash
mkdir -p examples/my-app && cd examples/my-app && npm init -y
cd ../.. && npm install     # links every @aio-ui/* into node_modules
```

Imports then resolve through the workspace symlinks; `npm run build:pkgs` is the only rebuild
step (a new `exports` entry additionally needs a dev-server restart — Vite caches the map).

**C. Browser import map (no bundler).** Serve the built files and map each specifier to the file
`layout.json` names for it:

```html
<script type="importmap">
  {
    "imports": {
      "@aio-ui/core/interface": "/aio-ui/packages/core/dist/interface.js",
      "@aio-ui/code-block": "/aio-ui/packages/components/code-block/dist/index.js",
      "@aio-ui/code-block/CodeBlock.css": "/aio-ui/packages/components/code-block/dist/CodeBlock.css"
    }
  }
</script>
```

A prefix cannot add `.js`, so map every package root **and** every exact `exports` subpath.

### 3.3 Update to the newest repository state

```bash
cd aio-ui
git switch main
git pull --ff-only      # fast-forward only: main is never rewritten
npm install             # required when a package or dependency was added
npm run build:pkgs      # dist/ is not tracked, so this always follows a pull
npm run verify          # optional
```

If a package was **added or renamed**, refresh the map the generator and installer read:

```bash
node orchestrator/layout.mjs --out orchestrator/layout.json
```

In the consuming project, run `npm install` again for `file:` deps and add a `file:` entry for
any package that did not exist before.

### 3.4 Package list — name → directory → entry

Generated from `orchestrator/layout.json`, so it matches what the resolver and the CDN serve.
The CDN URL of any row is the tag base + `Directory` + the file, e.g.
`…@v0.1.1/packages/components/code-block/dist/index.js`.

| Package                    | Directory                          | Entry (`exports["."]`) | Stylesheet subpath                                                                                                                                                                                 |
| -------------------------- | ---------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@aio-ui/app`              | `packages/app`                     | `dist/index.js`        | —                                                                                                                                                                                                  |
| `@aio-ui/base`             | `packages/base`                    | `dist/index.js`        | —                                                                                                                                                                                                  |
| `@aio-ui/core`             | `packages/core`                    | `dist/index.js`        | —                                                                                                                                                                                                  |
| `@aio-ui/styles`           | `packages/styles`                  | — (CSS only)           | `index.css` → `src/index.css` (+ `variables`, `typography`, `components`, `layout`, `icon`)                                                                                                        |
| `@aio-ui/utilities`        | `packages/utilities`               | `dist/index.js`        | —                                                                                                                                                                                                  |
| `@aio-ui/accordion`        | `packages/components/accordion`    | `dist/index.js`        | `Accordion.css` → `dist/Accordion.css`                                                                                                                                                             |
| `@aio-ui/article`          | `packages/components/article`      | `dist/index.js`        | `Article.css` → `dist/Article.css`                                                                                                                                                                 |
| `@aio-ui/badge`            | `packages/components/badge`        | `dist/index.js`        | `Badge.css` → `dist/Badge.css`                                                                                                                                                                     |
| `@aio-ui/carousel`         | `packages/components/carousel`     | `dist/index.js`        | `Carousel.css` → `dist/Carousel.css`                                                                                                                                                               |
| `@aio-ui/code-block`       | `packages/components/code-block`   | `dist/index.js`        | `CodeBlock.css` → `dist/CodeBlock.css`                                                                                                                                                             |
| `@aio-ui/fabmenu`          | `packages/components/fabmenu`      | `dist/index.js`        | `FabMenu.css` → `dist/FabMenu.css`                                                                                                                                                                 |
| `@aio-ui/footer`           | `packages/components/footer`       | `dist/index.js`        | `Footer.css` → `dist/Footer.css`                                                                                                                                                                   |
| `@aio-ui/form`             | `packages/components/form`         | `dist/index.js`        | `Form.css` → `dist/Form.css`                                                                                                                                                                       |
| `@aio-ui/id-address`       | `packages/components/id-address`   | `dist/index.js`        | `id-address.css` → `dist/id-address.css`                                                                                                                                                           |
| `@aio-ui/input`            | `packages/components/input`        | `dist/index.js`        | `input.css` → `dist/input.css`, `dropdown.css` → `dist/Dropdown/Dropdown.css`, `file-uploader.css` → `dist/FileUploader/FileUploader.css`, `controls.css` → `dist/InputControls/inputControls.css` |
| `@aio-ui/markdown`         | `packages/components/markdown`     | `dist/index.js`        | `Markdown.css` → `dist/Markdown.css`                                                                                                                                                               |
| `@aio-ui/masonry`          | `packages/components/masonry`      | `dist/index.js`        | `Masonry.css` → `dist/Masonry.css`                                                                                                                                                                 |
| `@aio-ui/menu`             | `packages/components/menu`         | `dist/index.js`        | `Menu.css` → `dist/Menu.css`                                                                                                                                                                       |
| `@aio-ui/message`          | `packages/components/message`      | `dist/index.js`        | `Message.css` → `dist/Message.css`                                                                                                                                                                 |
| `@aio-ui/modal`            | `packages/components/modal`        | `dist/index.js`        | `Modal.css` → `dist/Modal.css`                                                                                                                                                                     |
| `@aio-ui/modeswitcher`     | `packages/components/modeswitcher` | `dist/index.js`        | `ModeSwitcher.css` → `dist/ModeSwitcher.css`                                                                                                                                                       |
| `@aio-ui/pricingcard`      | `packages/components/pricingcard`  | `dist/index.js`        | `PricingCard.css` → `dist/PricingCard.css`                                                                                                                                                         |
| `@aio-ui/product`          | `packages/components/product`      | `dist/index.js`        | `ProductCard.css`, `ProductDetail.css`, `ProductGrid.css` → `dist/`                                                                                                                                |
| `@aio-ui/rating`           | `packages/components/rating`       | `dist/index.js`        | `Rating.css` → `dist/Rating.css`                                                                                                                                                                   |
| `@aio-ui/section`          | `packages/components/section`      | `dist/index.js`        | `Section.css` → `dist/Section.css`                                                                                                                                                                 |
| `@aio-ui/tab`              | `packages/components/tab`          | `dist/index.js`        | `Tab.css` → `dist/Tab.css`                                                                                                                                                                         |
| `@aio-ui/table`            | `packages/components/table`        | `dist/index.js`        | `Table.css` → `dist/Table.css`                                                                                                                                                                     |
| `@aio-ui/animations`       | `packages/modules/animations`      | `dist/index.js`        | `Animations.css` → `dist/Animations.css`                                                                                                                                                           |
| `@aio-ui/event-emitter`    | `packages/modules/event-emitter`   | `dist/index.js`        | —                                                                                                                                                                                                  |
| `@aio-ui/http-service`     | `packages/modules/http-service`    | `dist/index.js`        | —                                                                                                                                                                                                  |
| `@aio-ui/module-loader`    | `packages/modules/module-loader`   | `dist/index.js`        | —                                                                                                                                                                                                  |
| `@aio-ui/router`           | `packages/modules/router`          | `dist/index.js`        | —                                                                                                                                                                                                  |
| `@aio-ui/theme`            | `packages/modules/theme`           | `dist/index.js`        | —                                                                                                                                                                                                  |
| `@aio-ui/theme-cyberpunk`  | `packages/themes/cyberpunk`        | `dist/index.js`        | `CyberpunkTheme.css` → `dist/src/CyberpunkTheme.css`                                                                                                                                               |
| `@aio-ui/theme-default`    | `packages/themes/default`          | `dist/index.js`        | —                                                                                                                                                                                                  |
| `@aio-ui/theme-horizontal` | `packages/themes/horizontal`       | `dist/index.js`        | —                                                                                                                                                                                                  |
| `@aio-ui/frameworks`       | `packages/kits/frameworks`         | `dist/index.js`        | —                                                                                                                                                                                                  |
| `@aio-ui/modules`          | `packages/kits/modules`            | `dist/index.js`        | —                                                                                                                                                                                                  |
| `@aio-ui/themes`           | `packages/kits/themes`             | `dist/index.js`        | —                                                                                                                                                                                                  |

## 4. Prerequisites (do not skip)

1. **Public repository.** jsDelivr cannot serve private repos. If it must stay private, host the
   CDN tree on GitHub Pages/Cloudflare instead and change `registry.base`.
2. **Right remote.** `origin` must be the publish repository:
   ```bash
   git remote -v
   # origin  https://github.com/sieteminerva/-aio-ui-dev.git
   # rajutan https://github.com/sieteminerva/rajutan.git   ← older repo, never push main here
   ```
3. **Credentials.** Git Credential Manager (browser login) or a PAT with `repo` scope. CI must use
   `GIT_TERMINAL_PROMPT=0` and/or a token, never an interactive prompt.
4. **Clean, committed `main`.** The tag is built from release artefacts, but source must compile
   from the commit you intend to publish.
5. **Tooling.** Node 20+, Git, and `tar` on PATH (Git for Windows ships bsdtar). The publisher
   passes repo-relative paths because Windows `tar` treats `C:\...` as a remote host.
6. **Version alignment.** Every package must already be at the target version:
   ```bash
   npm run version:report
   npm run version:check
   ```
7. **Green gate.** `npm run verify` must pass (build 38 TS packages → typecheck → bounds → api →
   version → tests → example builds; `@aio-ui/styles` is CSS-only).
8. **Fresh layout.** `layout.json` describes packages by directory and exports; regenerate it
   before packaging so a moved package cannot produce a stale map.
9. **Coordinates.** `scripts/release.mjs` defaults to `sieteminerva/-aio-ui-dev`. Override with
   `GITHUB_REPOSITORY=<owner>/<repo>` when publishing a fork; the base URL is written into
   `registry.json` and into every generated import map.

## 5. Procedure — publish (or refresh) a release

Run from the repository root.

### Step 1 — gate

```bash
npm run verify
```

### Step 2 — build every package

```bash
npm run build:pkgs
```

This emits `dist` (JS + `.d.ts` + copied CSS), adds `.js` to relative imports, and strips CSS
side-effect imports. `dist/` stays untracked.

### Step 3 — regenerate the layout map

```bash
node orchestrator/layout.mjs --out orchestrator/layout.json
```

### Step 4 — build release artefacts

```bash
node scripts/release.mjs --version 0.1.1            # dry run: prints the target and first packages
node scripts/release.mjs --version 0.1.1 --apply    # writes .draft/release/v0.1.1/
```

Expected output: `39 tarball(s) + registry.json + layout.json + checksums.txt`.

Sanity checks:

```bash
node -e 'const r=require("./.draft/release/v0.1.1/registry.json"); console.log(r.repository, Object.keys(r.packages).length)'
cd .draft/release/v0.1.1 && sha256sum -c checksums.txt | grep -v ': OK$' ; cd -
```

> A release directory that does not exist yet is normal before Step 4, but it makes
> `orchestrator/release.test.ts` **skip its 15 contract tests** rather than fail — re-run that
> file after Step 4 to prove the artefacts.

### Step 5 — publish the CDN tree and the tag

```bash
node scripts/publish-cdn.mjs            # dry run: assembles .draft/cdn-tree and stops
node scripts/publish-cdn.mjs --apply    # commit on `cdn`, tag, push branch + tag
```

What it does:

1. unpacks every tarball into `.draft/cdn-tree/<package dir>` (exactly what `npm i` gets);
2. copies `registry.json`, `layout.json`, `checksums.txt` to the tree root;
3. renders `README.md` from `templates/cdn/README.md.tpl` (version, tag, package table from
   `registry.json`);
4. creates/refreshes the orphan `cdn` branch in a temporary worktree;
5. commits, moves tag `v<version>` onto that commit, force-pushes `cdn` and the tag.

> **Never re-move a tag jsDelivr already served.** It pins the tag to the first commit it saw
> (`immutable, max-age=31536000`) and ignores purges, so the ref would report a new commit while
> the CDN kept answering the old files. Re-publishing the same version is only safe before the
> first probe; after that, bump (`node scripts/version.mjs --apply --version 0.1.2`) and push a
> new tag. This is how `v0.1.1` came to exist.

### Step 6 — create/refresh the GitHub release and upload assets

The CDN does not need the assets, but `npm i` and the generator do. Use the GitHub UI or CLI:

```bash
gh release create v0.1.1 .draft/release/v0.1.1/* \
  --prerelease --title "v0.1.1 (pre-release)" \
  --notes "Build-free artefacts for @aio-ui 0.1.1"
```

Web UI equivalent: **Releases → Draft a new release → tag `v0.1.1` → attach all 42 files →
pre-release**. A new version gets a **new** release; the `v0.1.0` release keeps its 42 assets.

Refreshing assets of an _existing_ release: delete the old assets first (uploading the same name
returns `422 already_exists`), then upload the new set. With the REST API:

```bash
# requires GITHUB_TOKEN in the environment (never paste tokens into chat)
curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
  "https://api.github.com/repos/sieteminerva/-aio-ui-dev/releases/<release-id>/assets?per_page=100"
```

### Step 7 — purge and verify jsDelivr

```bash
curl -s "https://purge.jsdelivr.net/gh/sieteminerva/-aio-ui-dev@v0.1.1/registry.json" > /dev/null
sleep 3

for u in registry.json \
  packages/core/dist/index.js \
  packages/utilities/dist/AttributeUtils.js \
  packages/kits/frameworks/dist/index.js \
  packages/components/input/dist/Dropdown/Dropdown.InputModule.js \
  packages/modules/animations/dist/Animations.css \
  packages/components/form/dist/Form.css; do
  printf '%s %s\n' "$(curl -s -o /dev/null -w '%{http_code}' "https://cdn.jsdelivr.net/gh/sieteminerva/-aio-ui-dev@v0.1.1/$u")" "$u"
done
```

Every line must be `200`.

### Step 8 — real-CDN smoke test

Generate copies whose import map points at the published tag, then serve the files locally:

```bash
SMOKE_BASE=https://cdn.jsdelivr.net/gh/sieteminerva/-aio-ui-dev@v0.1.1/ \
  npx vitest run orchestrator/release.test.ts

node .draft/smoke/serve.mjs 5300
# open http://localhost:5300/.draft/cdn-smoke/store/#checkout
# open http://localhost:5300/.draft/cdn-smoke/gallery/#home
```

Pass criteria: store form renders a fieldset with fields; gallery mounts masonry and carousel;
hosts are `div#masonry` / `div#carousel` (no custom elements); console has no error, warning or
404; stylesheet links point at `cdn.jsdelivr.net`.

### Step 9 — commit and push source/docs

```bash
git add -A
git commit -m "chore(release): v0.1.1"
git push origin main
```

Never push `main` to the old `rajutan` remote.

## 6. Updating an existing version vs a new version

| Situation                          | Action                                                                                   |
| ---------------------------------- | ---------------------------------------------------------------------------------------- |
| Same version, bytes not served yet | Steps 2–8 with the same `--version`; safe only **before** the first probe of the new tag |
| New version                        | `node scripts/version.mjs --apply --version 0.1.2` → steps 2–8 with the new number       |
| Only docs/scripts changed          | Normal commit to `main`; no CDN work                                                     |
| A site must stay on the old engine | Do nothing — presets pin `engine.resolved`; regeneration is explicit                     |

## 7. Rollback

- **Restore an earlier CDN tree:** move the `cdn` **branch** back to the previous commit. The tag
  cannot be repaired once jsDelivr has served it — publish a new version instead.
  ```bash
  git push origin <old-cdn-commit>:refs/heads/cdn --force
  curl -s "https://purge.jsdelivr.net/gh/sieteminerva/-aio-ui-dev@cdn/registry.json" > /dev/null
  ```
- **Remove local artefacts:** `rm -rf .draft/release .draft/cdn-tree .draft/cdn-worktree`.
- **Undo a version bump:** `git restore packages package.json package-lock.json`.
- Do not rewrite `main`; revert with a new commit.

## 8. Troubleshooting

| Symptom                                           | Cause                                                                                                         | Fix                                                                                                                                                                        |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every package URL 404s, `registry.json` 404s      | Tag still points at `main` (no `dist`)                                                                        | Run `publish-cdn.mjs --apply`                                                                                                                                              |
| One subpath 404s (`dropdown/module`)              | URL derived from the specifier                                                                                | Check `layout.subpaths`; resolver must use `exports`                                                                                                                       |
| A stylesheet 404s at the package root             | CSS export names a source file                                                                                | Prefer `dist/` for CSS in `release.mjs` / `layout.mjs`                                                                                                                     |
| Browser ignores the import map                    | Missing `"imports"` wrapper                                                                                   | `runtime.ts` serialises `site.importMap`                                                                                                                                   |
| `tar (child): Cannot connect to …`                | Absolute Windows path passed to tar                                                                           | Use repo-relative paths (the script already does)                                                                                                                          |
| `422 already_exists` on upload                    | Asset name already present                                                                                    | Delete the old asset, then upload                                                                                                                                          |
| jsDelivr keeps serving the old bytes              | CDN cache                                                                                                     | Purge the URL(s), wait a few seconds, hard-reload                                                                                                                          |
| `@cdn` still reports the previous version         | Branch refs are cached `s-maxage=43200` (12 h); a wildcard purge does not always evict the file               | Purge the **exact** file (`…@cdn/registry.json`), then re-probe                                                                                                            |
| Moved the tag, jsDelivr still serves the old tree | jsDelivr pins a tag to a commit (`immutable, max-age=31536000`); purge reports `finished` and changes nothing | Closed in `v0.1.1`: never force-move a served tag. Publish a **new version** (`version.mjs --apply --version 0.1.2`) or point `registry.base` at `@<commit-sha>` / `@cdn`. |
| Old registry + new assets (`integrity` mismatch)  | A tag's registry was cached before the assets were replaced                                                   | Treat that tag as unusable; publish a new version                                                                                                                          |
| jsDelivr 404s the whole repo                      | Repository is private or tag missing                                                                          | Make it public / check `git ls-remote`                                                                                                                                     |

## 9. Pre-flight checklist

```text
[ ] origin → sieteminerva/-aio-ui-dev (rajutan is only the legacy remote)
[ ] working tree committed
[ ] npm run verify  → exit 0
[ ] npm run build:pkgs
[ ] layout.json regenerated (39 packages)
[ ] release.mjs --apply → 39 tarballs + 3 files
[ ] checksums 39/39 OK
[ ] publish-cdn.mjs --apply → cdn branch + tag pushed
[ ] branch README published (curl …/@v<version>/README.md → 200, correct version)
[ ] release assets uploaded (42 files) and marked pre-release
[ ] purge + all CDN URLs 200
[ ] real-CDN smoke: store form + gallery masonry/carousel, console clean
[ ] main pushed to origin
```

## 10. References

- `scripts/release.mjs` — tarballs, `registry.json`, `layout.json`, `checksums.txt`
- `scripts/publish-cdn.mjs` — orphan `cdn` branch, branch README, tag, push
- `orchestrator/emit.ts` — `createCdnResolver()`: base + `dir` + `exports` subpaths + prefixes
- `orchestrator/release.test.ts` — counts, checksums, every URL on disk, import-map closure
- `orchestrator/prompt.content.md` — agent handoff
- `.guidance/RAJUTAN.md` §6–§8 — pipeline and commands
