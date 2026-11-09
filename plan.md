# AIO UI Framework — plan

Single tracking document. **Only open work lives here**; what already landed is in `git log`
(one commit per decision, each naming its evidence) and in the architecture docs under
`docs/`.

Last updated: 2026-11-09

---

## 1. Objective

A monorepo framework (`@aio-ui/*`) whose components are independently installable, rendered
by one registry, styled by lazily-loaded stylesheets, and published as real packages (`dist`
JS + `.d.ts`). The form family (`form` + `input` + `id-address` + `table`/`message` bridges)
is the reference implementation: it owns its engines, composes sub-modules through a
manifest, and runs without the app.

## 2. Constraints

- **TypeScript ~6.0** with `verbatimModuleSyntax`, `erasableSyntaxOnly`, `noUnusedLocals/Parameters`.
- **Vite 8 / rolldown** for the examples; `lightningcss` for sheets.
- **npm workspaces**: `packages/*`, `packages/components/*`, `packages/modules/*`,
  `packages/themes/*`, `examples/*`.
- **Boundaries are mechanical** (`scripts/bounds.mjs`): package edges follow the dependency
  graph, every deep import resolves through the target's `exports` map.
- **A capability lives in a module; a component only renders.** No builder imports its own CSS.

## 3. Decisions already made

| Area | Decision |
| --- | --- |
| Package layout | One package per component; sub-modules are subpaths of their owner, not packages — every `exports` subpath names one file. |
| Module sets | `*_DEFINITIONS` (live definitions) + `*_MANIFEST` (refs, `scope: "form" \| "input"`); a nesting component partitions by id. |
| Styling | One sheet per owner, injected once through `@aio-ui/core/Stylesheets`; field styling lives in `@aio-ui/input/input.css`, form chrome in `Form.css`. |
| Tokens | Declared once at `:root` (+ `[data-theme]`, where themes put `--app-*`), never per `.field`. |
| IdAddress | Adapter-based: `native` (platform controls), `aio` (this framework's markup), `base` (headless). Opt-in via `config.address.useAdapter`. |
| Publish | `tsc` per package to `dist` (JS + `.d.ts`), `exports` conditional: `development` → source, `types`/`default` → `dist`. Built in dependency order by `scripts/build-pack.mjs`. |

## 4. Remaining work

### 4.1 Docs and cleanliness (Fase 6)

- `docs/FIELD-TYPES.md` is out of sync with `packages/components/input/FieldTypes.ts`.
- Dead `console.log`, commented-out blocks and mojibake left in adapters.
- `Form.css` audit (it is chrome-only now; verify nothing field-level survived).
- `packages/components/form/FormModuleRegistry_plan.md` still sits inside the package — move
  to `docs/` or delete.

### 4.2 Decided but not implemented

- **IdAddress payload names.** `beforeSubmit` maps `<level>_name` → `<level>`, while the demo
  names its controls `address-<level>`: ids land in the payload, resolved *names* do not.
  Needs one naming convention, then the adapter follows it.

### 4.3 Publishing (blocking the install test)

- **Scope ≠ repo owner.** Repo is `github.com/sieteminerva/rajutan`; GitHub Packages requires
  the npm scope to equal the owner, so `@aio-ui/*` cannot publish there. Either rename the
  scope (34 names + peers + every import) or publish to npmjs.
- **Versions are all `0.0.0`** — publishable once, and `peerDependencies: "^0.0.0"` matches
  exactly `0.0.0`, so every bump must be applied across all packages at once.

### 4.4 Known limits, deliberately deferred

- **Node ESM.** `tsc` does not rewrite relative imports, so emitted JS is extensionless
  (`import "./FormLayout"`): consumers must be bundlers. Full support means
  `moduleResolution: node16` plus `.js` extensions written in every source import.
- **Host asset maps are still hand-written.** `examples/*/src/registry.assets.ts` needs one
  entry per manifest `path`, and `ComponentRegistry.loadModule` only warns when it is
  missing — a typo silently falls back to the built-in presets. Candidates, cheapest first:
  a Vite plugin generating a virtual module, an `npm run gen:assets` checked by `verify`, or
  letting the registry derive loaders from `import.meta.glob`. `scope` must never be derived
  — it is a component decision.
- **Fase 7-22 (optional).** `cascade`/`multistep`/`validation`/`calculation` could become
  installable packages instead of subpaths of `@aio-ui/form`.

## 5. Verification gate

`npm run verify` = `build:pkgs` (33 packages, dependency-ordered, `dist` + `.d.ts` + copied
CSS) → typecheck → `check:bounds` → `test` → examples build. Current: **304 tests / 35 files**,
boundaries clean, both builds green. Browser claims are measured (`getBoundingClientRect`,
`getComputedStyle`, DOM counts), not eyeballed.
