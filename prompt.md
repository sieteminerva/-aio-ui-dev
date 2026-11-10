# Agent handoff — Rajutan / AIO UI

Read this first, then `.guidance/project/STATUS.md`, `.guidance/RAJUTAN.md` (§9–§10) and
`.guidance/plan.md` (§3.10–§3.11). This file is the fast, current context; the guidance files are
authoritative for rules. Repository memory lives at `/memories/repo/aio-ui.md`.

## What this repo is

One monorepo, two roles:

- **AIO UI** — `packages/*`, the framework: base/core/app, components, modules, themes,
  utilities, styles, and three aggregator kits (`frameworks`, `modules`, `themes`).
- **Rajutan** — the generator: turns a business profile into a `preset.json`, then into a
  build-free website whose framework code is served from a pinned CDN tag.

Key files: engine in `.draft/preset/` (`types`, `catalogue`, `plan`, `parse`, `ai`, `emit`,
`runtime`, `generate`, `scenarios`, tests). Tooling in `scripts/` (`build-pack`, `release`,
`publish-cdn`, `version`, `bounds`, `api`, `new-component`). Notes in `.guidance/`.

## Current state (2026-11-11)

- Workspace: **37 packages**, fixed version `0.1.0`.
- Gate: `npm run verify` → exit 0. **428 tests passed, 1 opt-in skipped / 46 files.**
  The skipped one is the real-CDN smoke (`SMOKE_BASE=...`), not a failure.
- Draft engine suite: 100 tests (99 run + 1 opt-in skipped).
- **Release is live (pre-release):**
  - Repo: `sieteminerva/-aio-ui-dev` (public). `origin` points here; the old repo is the remote
    `rajutan` (do **not** push `main` there).
  - Tag `v0.1.0` points at the orphan **`cdn` branch**, not at `main`. `dist/` is gitignored, so
    `scripts/publish-cdn.mjs` unpacks the 37 tarballs onto `cdn` and moves the tag; jsDelivr then
    serves the import map.
  - 40 release assets uploaded (37 `aio-ui-*.tgz` + `registry.json` + `layout.json` +
    `checksums.txt`).
  - CDN base: `https://cdn.jsdelivr.net/gh/sieteminerva/-aio-ui-dev@v0.1.0/`
- **Real-CDN smoke is green**: store `#checkout` = form + 1 fieldset + 3 fields; gallery
  masonry = 4, carousel = 1; hosts are `div#masonry` / `div#carousel`; no console errors, styles
  load from jsDelivr.
- `.draft/` is gitignored except `.draft/preset/` (tracked engine). Generated sites live in
  `.draft/results/`; release artefacts in `.draft/release/v0.1.0/`; smoke copies in
  `.draft/smoke/` and `.draft/cdn-smoke/`.

## How the pipeline works (short)

```
wizard → orchestrator (Apps Script, engine bundled) → preset.json
      → plan() → emit()/runtime()/generate() → 5 static files
      → GitHub repo → Pages/Cloudflare; data stays in the client's Sheets `/exec`
```

Build-free delivery: `preset.json`, `index.html`, `app.js`, `server/adapter.json`, `FLOW.md`.
The framework is licensed through the CDN tag, never copied into the client repo. `dev/` is the
opt-in source hand-over; GitHub Actions is optional (only for clients who want a local build).

## Hard-won rules / traps (do not regress)

1. **Import map needs the `"imports"` wrapper.** `runtime.ts` serialises `site.importMap`
   (object), not `.imports` (map). Without the wrapper browsers ignore it.
2. **Every package root + every exact `exports` subpath must be mapped.** A prefix mapping cannot
   add `.js` (`@aio-ui/utilities/AttributeUtils` → 404). `emit.ts` `exact()` covers this.
3. **CSS subpaths prefer `dist/`.** Root CSS is not packed (`animations/Animations.css` case).
4. **`build-pack.mjs` adds `.js` to relative imports and strips CSS side-effect imports.** Only
   `.js/.json/.css` count as an extension — `Input.FormAdapter` is a basename, not an extension.
5. **A builder node is a host.** The key must be a real tag (`div#masonry`), never the builder
   word. `parsePreset()` rejects `<masonry>`-style keys; the AI prompt states the rule.
6. **Form sub-module refs need `export: "<symbol>"`**, otherwise the registry resolves the class
   (first function in the namespace), `Form` gets a truthy object with no `.hold`, and renders
   nothing when `multistep: true`.
7. **Generated runtime mounts builders itself.** `runtime.ts`/`generate.ts` inject `mount()` over
   `preset.pages` (`onCreated` → `build(name, node)`); `DOMRenderer` never builds builder nodes.
8. **Never push `main` to `rajutan`.** `git status` may show it as upstream; always push explicitly
   `git push origin main`.

## Open design — `isRoot` (needs decision, not implemented)

Default (works today): `"div#masonry": { "builder": "masonry" }` renders
`<div id="masonry"><section class="masonry">…</section></div>`.

Proposed: `isRoot: true` replaces the host, so the output **is** the component element
(`<section class="masonry">…</section>`). Full analysis and gates: `plan.md` §3.11.

Facts to start from (verify before coding):

- `DOMRenderer.contentEvaluator()` returns early for `builder` nodes; `nodeFactory()` creates the
  host from the key.
- `attachMetadata()` uses `isRoot` only for template relations; it does not move DOM.
- `AioApp.blockToNode()` already sets `isRoot: true` for page blocks — one flag, two meanings.
- The redesign of `AioApp`'s entry/render path has **not** been reviewed against this idea.

Before implementing, answer: where the swap happens (renderer / AioApp / generator `mount()`),
what happens to `id`/`class`/`attrs`/children on the key, and how metadata records, lifecycle
hooks, hydration gate and the event bridge are re-pointed. Gates are listed in §3.11.

## Work queue

From `STATUS.md` (active):

1. `store` manual reference — catalog, product, cart, checkout (in progress).
2. `profile` manual reference.
3. `blog` manual reference.

Official release waits for all four models (`gallery` exists). Test tags are allowed.

From `NEXT_TASKS.md`: review `AioApp` entry + implement `isRoot`; release workflow automation
(tag → verify → release → publish-cdn → upload); `npm i <tarball>` + Node ESM proof; model
boundary docs.

## Commands

```bash
npm run verify                 # build 37 pkgs → typecheck → bounds → api → version → tests → examples
npx vitest run .draft/preset   # engine suite
node .draft/preset/layout.mjs --out .draft/preset/layout.json
node scripts/release.mjs --version 0.1.0 --apply
node scripts/publish-cdn.mjs --apply          # cdn branch + move tag (push)

# release/barrel guard
SMOKE_BASE=https://cdn.jsdelivr.net/gh/sieteminerva/-aio-ui-dev@v0.1.0/ \
  npx vitest run .draft/preset/release.test.ts
node .draft/smoke/serve.mjs 5300              # open /.draft/cdn-smoke/store/#checkout
```

## Working agreement

- Answer in Bahasa Indonesia; be direct about trade-offs.
- Report diagnosis + plan before multi-step work; keep steps small and gated.
- Gates: `tsc`, `vitest`, `npm run verify`, then a browser probe with measured numbers (DOM counts,
  console clean). Do not claim UI behaviour without measuring.
- Tooling is reversible: dry-run by default, `--apply` writes. Undo releases with
  `rm -rf .draft/release`; regenerate with `release.mjs` + `publish-cdn.mjs --apply`.
- Do not commit `dist/` or `.draft` outputs. If the tag needs new bytes, republish via
  `publish-cdn.mjs` (moves the tag) and replace the release assets.
