> **STEP 0 — memory recovery + claim (mandatory, first action of any session):** `git log --oneline -12`,
> then `git status --short`, then open the active checkpoint — `/memories/session/<task>.md`,
> falling back to `.guidance/project/STATUS.md`. **Then read the claim board
> `.guidance/project/AGENTS.md` and take your row before the first edit** — overlapping a live row
> is a stop-and-ask, not an override. Only then plan. Every finished action category leaves
> **3 pointer lines** (`CHANGED →`, `PROVED →`, `NEXT →`); see `.guidance/AGENT_RULES.md` §10
> (checkpoint) and §11 (claims).

# AGENTS.md — Tooling band (`scripts/**`)

CLI that supports development, packaging, and release. **Everything is dry-run by default;
`--apply` writes.** Keep that guarantee.

`scripts/README.md` is the operator view — every command with its input and output path. Change
it in the same commit as a flag or an output path.

## Scripts

| Script              | Purpose                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| `build-pack.mjs`    | report / `--apply` packaging; `--build` (= `build:pkgs`) builds all 38 TypeScript packages, adds `.js` to relative imports, strips CSS side-effect imports |
| `release.mjs`       | build release artefacts for one explicit version (`--version 0.1.2 --apply`)                                    |
| `publish-cdn.mjs`   | unpack the 39 tarballs onto the orphan `cdn` branch, render its `README.md`, **tag the new version** (`--apply`), then push |
| `version.mjs`       | version report / `--check` (currently a fixed `0.1.1` across 39 packages)                                       |
| `bounds.mjs`        | dependency-boundary check (`check:bounds`)                                                                     |
| `api.mjs`           | public-API surface check (`check:api`); `--write` regenerates `docs/framework/api-map.json`                     |
| `new-component.mjs` | scaffold a component from `templates/component/`                                                               |

Package count: the workspace is **39 packages** (5 core + 22 components + 6 modules + 3 themes
+ 3 kits). `build:pkgs` builds 38 — `@aio-ui/styles` is CSS-only and has no build script.

## Rules

- Never make a script destructive by default; require `--apply` for writes/pushes.
- **Never move a tag jsDelivr already served.** Its tag URLs are `immutable, max-age=31536000`,
  so the old bytes keep being served and a stale `registry.json` keeps the old `integrity`
  hashes. Ship a new version instead (`version.mjs --apply --version x.y.z`).
- Release order is: `version.mjs --apply` → produce artefacts (`release.mjs --version x.y.z`
  → `--apply`) → `npm run verify` → `publish-cdn.mjs --apply` → upload the assets to a GitHub
  release. Artefacts come **first**: `orchestrator/release.test.ts` reads them (it skips when
  the directory is absent). Undo a release with `rm -rf .draft/release`.
- `@cdn` is cached 12 h and a wildcard purge does not evict a file — purge the exact URL.
- Only `.js/.json/.css` count as an extension when rewriting specifiers (a dotted basename like
  `Input.FormAdapter` is **not** an extension).
- Do not commit `dist/` or `.draft/` outputs.

## Verify

`npm run verify` (which calls several of these) must stay exit 0. For a script change, run the
specific script dry-run first, then `--apply` only against a scratch output dir.
