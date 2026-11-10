# Plan — framework

> Index & shared context: [plan.md](plan.md) §0, §4.

## 1. Project: framework — `@aio-ui/*` (`packages/*`, `examples/demo`)

The framework ships independently installable packages. Its open work is cleanliness, the
publishing/install path, and the limits accepted on purpose.

### 1.1 Remaining work

#### 1.1.1 Docs and cleanliness

- `docs/framework/FIELD-TYPES.md` is out of sync with `packages/components/input/FieldTypes.ts`.
- Dead `console.log`, commented-out blocks and mojibake left in adapters.
- `Form.css` audit (chrome-only now; verify nothing field-level survived).
- `docs/generator/GoogleSheets CMS/ARCHITECTURE.MD` is empty (0 lines) — fill or delete.

#### 1.1.2 Decided but not implemented

- **IdAddress payload names.** `beforeSubmit` maps `<level>_name` → `<level>`, while the demo
  names controls `address-<level>`: ids land in the payload, resolved names do not. Pick one
  convention, then the adapter follows it.
- **Multistep notices.** `messages.multistep.*` exists in config but nothing emits it; decide
  whether step navigation should speak or stay silent (validation already covers it).

### 1.2 Publishing and on-demand install (no npm)

Decided direction: **GitHub as the only origin**, two doors from one build.

- 1.2.1 **Semver for real.** ✅ Fixed versioning at `0.1.0` via `scripts/version.mjs`;
  `version:check` runs inside `verify`. Undo with `git restore packages package.json`.
- 1.2.2 **Release pipeline.** ✅ local half: `scripts/release.mjs` writes 37 tarballs +
  `registry.json` + `layout.json` + `checksums.txt` into `.draft/release/v<ver>/`
  (dry-run by default), verified by `orchestrator/release.test.ts`. ✅ **Published:** tag
  `v0.1.0` on `sieteminerva/-aio-ui-dev` points at the orphan `cdn` branch built by
  `scripts/publish-cdn.mjs` (it unpacks the tarballs so jsDelivr serves the import map); 40
  release assets uploaded. ⏳ GitHub Actions on tag still to write.
- 1.2.3 **Import-map build target.** ✅ Delivered 2026-11-11: emitted JS names `.js`, drops CSS
  side-effect imports, the layout carries real `exports` subpaths (CSS prefers `dist/`), and the
  tag resolves on jsDelivr. Real-CDN smoke is green for both generated sites.
- 1.2.4 **Host asset maps generated, not hand-written.** One entry per manifest `path` today;
  `ComponentRegistry.loadModule` only warns when missing, so a typo silently falls back to the
  built-in preset. Derive loaders from `import.meta.glob` or generate a virtual module.
  `scope` must never be derived — it is a component decision.
- 1.2.5 **Scope vs repo owner.** `github.com/sieteminerva/-aio-ui-dev` ≠ `@aio-ui/*`. Irrelevant for
  tarball/CDN installs; only GitHub Packages would require renaming the scope. Keep the scope.
  `scripts/release.mjs` defaults to that repository; `GITHUB_REPOSITORY` overrides it for a fork.
- 1.2.6 **Pin what a site was built with.** Every preset carries
  `engine: { range: "^0.1.0", resolved: "0.1.3" }`. The generator resolves the range once and
  stores both: `resolved` is what the runtime loads (exact URLs, so a later release never
  breaks a live site), `range` documents the intent for a deliberate regeneration. In 0.x a
  minor bump is treated as breaking.

### 1.3 Known limits, deliberately deferred

- **Node ESM.** `tsc` does not rewrite relative imports, so emitted JS is extensionless
  (`import "./FormLayout"`): consumers must be bundlers. Full support means
  `moduleResolution: node16` plus `.js` extensions in every source import.
- **Apps Script cold start** (2–5 s on the first idle call) cannot be removed from the script;
  only the repeat cost is cached. The generator's first paint must not depend on it.
- **Fase 7-22 (optional).** `cascade`/`multistep`/`validation`/`calculation` could become
  installable packages instead of subpaths of `@aio-ui/form`.

### 1.4 Order here

1. **Test tag** ✅ (1.2.2) — `v0.1.0` published (tag on the `cdn` branch) dan CDN import map
   terbukti di browser. Berikutnya: otomatiskan langkah yang sama di GitHub Actions.
   **Official release** menunggu empat referensi model manual (§3.5, §3.10).
2. **Model references** — `store`, `profile`, `blog` (§3.5); the official-release gate.
3. **Docs batch** (1.1.1) — field types, dead code, `Form.css`, empty `ARCHITECTURE.MD`.

