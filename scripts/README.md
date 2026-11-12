# `scripts/`

Node CLIs that build the packages, guard the contracts, and produce a release. No dependencies
beyond Node 20 — every file is a single `.mjs` with a usage block at the top.

**Everything is dry-run by default; `--apply` (or `--write`) is what touches the disk or the
remote.** Keep that guarantee when adding a script.

## Commands

| Command | What it does | Input | Output |
| --- | --- | --- | --- |
| `node scripts/build-pack.mjs` | Reports the packaging changes each package needs (`exports` conditions, `build`/`prepublishOnly`, `files`, `tsconfig.build.json`). No writes. | `packages/**/package.json`, `packages/**/src/**` | stdout only |
| `node scripts/build-pack.mjs --apply` | As above, plus rewrites the manifests and writes a fresh `tsconfig.build.json` per package. | `packages/**/package.json` | `packages/**/package.json`, `packages/**/tsconfig.build.json` |
| `node scripts/build-pack.mjs --build` · `npm run build:pkgs` | Builds every TypeScript package in dependency order (`tsc -p tsconfig.build.json`), copies each stylesheet into `dist`, adds the `.js` extension to relative specifiers and drops CSS side-effect imports from the emitted JS. | `packages/**/src/**`, `packages/**/tsconfig.build.json` | `packages/**/dist/**` (JS + `.d.ts` + copied CSS) |
| `node scripts/bounds.mjs` · `npm run check:bounds` | Five boundary checks: package edges follow the dependency graph, `@aio-ui/app` imports core as types only, deep imports resolve through `exports`, `import.meta.glob` only in the host, no `paths`/`alias`. Read-only; exits 1 on a violation. | `packages/**/*.ts`, `packages/**/package.json`, `tsconfig*.json`, `examples/**/vite.config.ts` | stdout + exit code |
| `node scripts/api.mjs` | Prints each barrel's public surface. | `packages/**/src/index.ts` | stdout only |
| `node scripts/api.mjs --check` · `npm run check:api` | Fails when a barrel uses `export *` (kits are the documented exception) or its surface drifts from the approved map. | `packages/**/src/index.ts`, `docs/framework/api-map.json` | stdout + exit code |
| `node scripts/api.mjs --write` | Regenerates the approved surface map. Run it without stdout redirection (it refuses a non-tty). | `packages/**/src/index.ts` | `docs/framework/api-map.json` |
| `node scripts/version.mjs` · `npm run version:report` | Prints the version of every package and flags drift. | `package.json`, `packages/**/package.json` | stdout only |
| `node scripts/version.mjs --check` · `npm run version:check` | Same, but exits 1 on drift or a non-semver peer. | as above | stdout + exit code |
| `node scripts/version.mjs --apply --version 0.1.2` | Writes one fixed version across the family (root + 39 packages). Reversible with `git restore`. | `package.json`, `packages/**/package.json` | the same 40 files |
| `node scripts/release.mjs --version 0.1.2` · `npm run release:plan` | Plans a release: target, package count, first packages. `--version` is **required**. | `package.json`, `packages/**/package.json`, `packages/**/dist/**` | stdout only |
| `node scripts/release.mjs --version 0.1.2 --apply` | Packs every package and writes the release artefacts. | `packages/**/dist/**`, `packages/**/package.json` | `.draft/release/v0.1.2/` → 39 `aio-ui-<name>-<version>.tgz` + `registry.json` + `layout.json` + `checksums.txt` |
| `node scripts/publish-cdn.mjs` | Dry run: unpacks the tarballs into a staging tree and stops. | `.draft/release/v<version>/` (version taken from the root manifest) | `.draft/cdn-tree/` |
| `node scripts/publish-cdn.mjs --apply [--remote origin]` | Assembles the tree, commits it on the orphan `cdn` branch, tags `v<version>`, force-pushes branch + tag. **Never re-run for a tag jsDelivr already served** — bump the version instead. | `.draft/release/v<version>/` | branch `cdn` + tag `v<version>` on the remote; temporary `.draft/cdn-worktree/` is removed |
| `node scripts/new-component.mjs <kebab-name>` | Scaffolds a component package from the templates. `--title "Human Name"`, `--no-test`, `--force`, `--dry`, `--dir <path>`. | `templates/component/*.tpl` | `packages/components/<kebab-name>/` (`Component.ts`, `Component.css`, `README.md`, `package.json`, `__tests__/`) |

`scripts/AGENTS.md` is the band rule file; this table is the operator view.

## Chains

| Goal | Run |
| --- | --- |
| Full gate | `npm run verify` → build:pkgs → typecheck → bounds → api → version → test → gallery build |
| Release | `version.mjs --apply --version x.y.z` → `npm run verify` → `release.mjs --version x.y.z --apply` → `publish-cdn.mjs --apply` → upload the assets to a GitHub release |
| New component | `npm run new:component <name>` → fill the template → `npm run build:pkgs` → `npm run verify` |

## Notes

- Artifacts live in `.draft/` (gitignored): `release/`, `cdn-tree/`, `cdn-worktree/`, `smoke/`.
  `rm -rf .draft/release` undoes a release build.
- On Windows this repository aliases `node` to `winpty node.exe`, which dies with
  "stdout is not a tty" when output is redirected — use `node.exe` for redirected runs.
  `api.mjs --write` must not be redirected at all.
- Adding a `packages` entry means `check:api`, `version:check` and `release.mjs` all count it
  automatically; only a hardcoded list would go stale, so there is none.
