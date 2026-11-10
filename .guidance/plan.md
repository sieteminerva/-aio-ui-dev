# AIO UI Framework — plan

Long-term **why** for three projects in one repo. Shared parts come first (§0); the per-project
plans live in `plan-framework.md` (§1), `plan-gallery.md` (§2) and `plan-generator.md` (§3). Only
open work lives here; what landed is `git log` (one commit per decision, each naming its evidence)
and the architecture docs under `docs/`. The system guide is `.guidance/RAJUTAN.md`.

Last updated: 2026-11-11

Tracking pipeline: this file = **why / long-term**. Next actions live in
`.guidance/project/NEXT_TASKS.md` (queue); the 3 items being worked live in
`.guidance/project/STATUS.md`. One item lives in exactly one file (`AGENT_RULES.md` §9).

---

## 0. Shared — all three projects

### 0.1 Objective

Two layers, one source of truth:

1. **`@aio-ui/*`** — a monorepo framework whose components are independently installable,
   rendered by one registry, styled by lazily-loaded stylesheets, and built as real packages
   (`dist` JS + `.d.ts`). The form family is the reference implementation: it owns its
   engines, composes sub-modules through a manifest, and runs without the app.
2. **Webapp generator** — a wizard (`docs/generator/presentation0.md`) that turns a business profile
   into an AI-generated site definition, then emits **a preset**: the exact subset of
   components, modules, styles and data sources that one generated website needs. The user
   keeps editing content in Google Sheets; the generator never keeps access.

The preset is the contract between AI output, the Sheets CMS, and this framework.

### 0.2 Constraints

- **TypeScript ~6.0** with `verbatimModuleSyntax`, `erasableSyntaxOnly`, `noUnusedLocals/Parameters`.
- **Vite 8 / rolldown** for the examples; `lightningcss` for sheets.
- **npm workspaces**: `packages/*`, `packages/components/*`, `packages/modules/*`,
  `packages/themes/*`, `examples/*`.
- **Boundaries are mechanical** (`scripts/bounds.mjs`): package edges follow the dependency
  graph, every deep import resolves through the target's `exports` map.
- **A capability lives in a module; a component only renders.** No builder imports its own CSS.
- **Zero-cost infrastructure**: Apps Script (CMS + orchestrator), static hosting (Pages/CDN),
  no server we operate.

### 0.3 Decisions already made

| Area           | Decision                                                                                                                                                                                                                                                                                |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package layout | One package per component; sub-modules are subpaths of their owner, not packages — every `exports` subpath names one file.                                                                                                                                                              |
| Module sets    | `*_DEFINITIONS` (live definitions) + `*_MANIFEST` (refs, `scope: "form" \| "input"`); a nesting component partitions by id.                                                                                                                                                             |
| Styling        | One sheet per owner, injected once through `@aio-ui/core/Stylesheets`; field styling lives in `@aio-ui/input/input.css`, form chrome in `Form.css`.                                                                                                                                     |
| Tokens         | Declared once at `:root` (+ `[data-theme]`, where themes put `--app-*`), never per `.field`.                                                                                                                                                                                            |
| IdAddress      | Adapter-based: `native`, `aio`, `base`, opt-in via `config.address.useAdapter`. The Apps Script backend was rewritten (`.archives/idAddress-AppsScript/`): metadata-driven columns, OAuth instead of public sheets, query cache, same HTTP contract.                                    |
| Animations     | One uniform contract: `AnimationBehaviour<Options>` with `animate({ node, options, delay, signal, stopped, done })`, resolved through a registry, not a `switch`. Cancellation is an `AbortController` per run.                                                                         |
| Form messages  | Every user-facing sentence resolves through `iFormConfig.messages` (`category` → `slot` → `code`), with template strings for JSON/CMS config and functions for dynamic cases. Defaults preserve the previous wording exactly. Calculation failures report once per changed failure set. |
| Data contract  | Server responses are always `{ statusCode, success, message, data, meta? }` (`docs/generator/GoogleSheets CMS/REST_API.MD`). The wizard's build result is `{ status, meta, data: { sheet, repo, live, guide, message } }`.                                                              |
| Publish        | `tsc` per package to `dist`, `exports` conditional: `development` → source, `types`/`default` → `dist`. Built in dependency order by `scripts/build-pack.mjs`.                                                                                                                          |

## Project plans (split files)

- §1 framework → [plan-framework.md](plan-framework.md) — `@aio-ui/*`, `examples/demo`
- §2 gallery → [plan-gallery.md](plan-gallery.md) — `examples/gallery` (profile model)
- §3 generator → [plan-generator.md](plan-generator.md) — Rajutan (`orchestrator/`), incl. §3.11 `isRoot`

## 4. Verification gate (all projects)

`npm run verify` = `build:pkgs` (37 packages, dependency-ordered, `dist` + `.d.ts` + copied
CSS) → typecheck → `check:bounds` → `test` → examples build. Current: **428 tests / 46 files**
(+1 opt-in CDN smoke skipped),
boundaries clean, both builds green. Browser claims are measured (`getBoundingClientRect`,
`getComputedStyle`, DOM counts), not eyeballed.
