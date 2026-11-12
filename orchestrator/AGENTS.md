> **STEP 0 — memory recovery + claim (mandatory, first action of any session):** `git log --oneline -12`,
> then `git status --short`, then open the active checkpoint — `/memories/session/<task>.md`,
> falling back to `.guidance/project/STATUS.md`. **Then read the claim board
> `.guidance/project/AGENTS.md` and take your row before the first edit** — overlapping a live row
> is a stop-and-ask, not an override. Only then plan. Every finished action category leaves
> **3 pointer lines** (`CHANGED →`, `PROVED →`, `NEXT →`); see `.guidance/AGENT_RULES.md` §10
> (checkpoint) and §11 (claims).

# AGENTS.md — Generator band (`orchestrator/**`)

Rajutan: turns a business profile into a `preset.json`, then a **build-free** website whose
framework code is served from a pinned CDN tag.

## Engine (`orchestrator/`)

`types` → `catalogue` → `plan` → `parse` → `ai` → `emit` → `runtime` → `generate`, plus
`scenarios` and tests. `orchestrator/` is tracked (the rest of `.draft/` is gitignored).

## Pipeline

```
wizard → orchestrator (Apps Script, engine bundled) → preset.json
      → plan() → emit()/runtime()/generate() → 5 static files
      → GitHub repo → Pages/Cloudflare; data stays in the client's Sheets `/exec`
```

Generated output = `preset.json`, `index.html`, `app.js`, `server/adapter.json`, `FLOW.md`.
The framework is licensed via the CDN tag, never copied into the client repo.

## Hard rules (do not regress)

1. **Import map needs the `"imports"` wrapper.** `runtime.ts` serialises `site.importMap`
   (object), not `.imports` (map) — without the wrapper browsers ignore it.
2. **Map every package root + every exact `exports` subpath.** `emit.ts` `exact()` covers this.
3. **CSS subpaths prefer `dist/`.**
4. **A builder node key must be a real tag** (`div#masonry`); `parsePreset()` rejects
   `<masonry>`-style keys.
5. **Form sub-module refs need `export: "<symbol>"`** — otherwise `Form` renders nothing when
   `multistep: true`.
6. **Generated runtime mounts builders itself** (`mount()` over `preset.pages`); `DOMRenderer`
   never builds builder nodes.

## Commands

```bash
npx vitest run orchestrator                 # engine suite
node orchestrator/layout.mjs --out orchestrator/layout.json
node scripts/release.mjs --version 0.1.0 --apply
node scripts/publish-cdn.mjs --apply         # cdn branch + move tag (push)
SMOKE_BASE=https://cdn.jsdelivr.net/gh/sieteminerva/-aio-ui-dev@v0.1.0/ \
  npx vitest run orchestrator/release.test.ts
node .draft/smoke/serve.mjs 5300             # open /.draft/cdn-smoke/store/#checkout
```

## Release state (pre-release, live)

Repo `sieteminerva/-aio-ui-dev` (public; `origin`). Tag `v0.1.0` points at the orphan **`cdn`**
branch (jsDelivr serves the import map). 40 release assets. CDN base:
`https://cdn.jsdelivr.net/gh/sieteminerva/-aio-ui-dev@v0.1.0/`. Never push `main` to the
`rajutan` remote.

## Read when relevant

`docs/generator/apps-script-integration.md` (backend/Sheets/Gemini flow), `orchestrator/README.md`,
`orchestrator/prompt.content.md`. Do **not** read `packages/components/**` docs unless the task
changes the framework contract.
