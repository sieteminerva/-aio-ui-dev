> **STEP 0 — memory recovery (mandatory, first action of any session):** `git log --oneline -12`,
> then `git status --short`, then open the active checkpoint — `/memories/session/<task>.md`,
> falling back to `.guidance/project/STATUS.md`. Only then plan. Every finished action category
> leaves **3 pointer lines** (`CHANGED →`, `PROVED →`, `NEXT →`); see `.guidance/AGENT_RULES.md` §10.

# AGENTS.md — Tooling band (`scripts/**`)

CLI that supports development, packaging, and release. **Everything is dry-run by default;
`--apply` writes.** Keep that guarantee.

## Scripts

| Script              | Purpose                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------- |
| `build-pack.mjs`    | build + pack all 37 packages; adds `.js` to relative imports, strips CSS side-effect imports |
| `release.mjs`       | build release artefacts (`--version 0.1.0 --apply`)                                          |
| `publish-cdn.mjs`   | unpack 37 tarballs onto orphan `cdn` branch and **move the tag** (`--apply`), then push      |
| `version.mjs`       | version report / `--check` (fixed `0.1.0`)                                                   |
| `bounds.mjs`        | dependency-boundary check (`check:bounds`)                                                   |
| `api.mjs`           | public-API surface check (`check:api`)                                                       |
| `new-component.mjs` | scaffold a component from `templates/component/`                                             |

## Rules

- Never make a script destructive by default; require `--apply` for writes/pushes.
- Release order is: `release.mjs --apply` → `publish-cdn.mjs --apply` → upload assets to the
  GitHub pre-release. Undo a release with `rm -rf .draft/release`.
- Only `.js/.json/.css` count as an extension when rewriting specifiers (a dotted basename like
  `Input.FormAdapter` is **not** an extension).
- Do not commit `dist/` or `.draft/` outputs.

## Verify

`npm run verify` (which calls several of these) must stay exit 0. For a script change, run the
specific script dry-run first, then `--apply` only against a scratch output dir.
