# Rajutan · AIO UI

Monorepo for **AIO UI** (the `@aio-ui/*` frontend framework) and **Rajutan** (the
orchestrator that turns a business profile into a generated website). One repository,
two roles, one source of truth.

- **Version:** `0.1.0` — fixed versioning across all packages.
- **Gate:** `npm run verify` (build 33 packages → typecheck → boundaries → version check →
  tests → example builds).
- **Distribution:** GitHub releases only. No npm registry.

---

## Quick start

```bash
npm install
npm run dev            # examples/gallery  (http://localhost:5175)
npm run dev:demo       # examples/demo
npm run verify         # the full gate — run before claiming anything works
```

| Task                                         | Command                                            |
| -------------------------------------------- | -------------------------------------------------- |
| Build every package (`dist` + `.d.ts` + CSS) | `npm run build:pkgs`                               |
| Typecheck the workspace                      | `npm run typecheck`                                |
| Dependency-edge check                        | `npm run check:bounds`                             |
| Public-surface check                         | `npm run check:api` (snapshot: `scripts/api.mjs --write`) |
| Tests                                        | `npm test` (`vitest run`)                          |
| Version report / check                       | `npm run version:report` · `npm run version:check` |
| Bump all packages                            | `node scripts/version.mjs --apply --version 0.1.1` |
| Release artefacts (local, dry-run first)     | `node scripts/release.mjs --version 0.1.1`         |

## Repository structure

```
.
├── package.json            workspaces + the scripts above (private root)
├── tsconfig.base.json      compiler rules every package extends
├── tsconfig.json           workspace typecheck entry
├── vitest.config.ts        tests in packages/** and .draft/**
│
├── packages/               the framework — one publishable package per folder
│   ├── base/               Builder core: create/prepare/initialize, adapters
│   ├── core/               DOMRenderer, ComponentRegistry, Stylesheets, contracts
│   ├── app/                AioApp: routing, preload, render, module slots
│   ├── styles/             global CSS (reset, variables, layout, typography)
│   ├── utilities/          Metadata, selectors, attributes, color helpers
│   ├── modules/            router, http-service, event-emitter, module-loader,
│   │                       theme, animations
│   ├── themes/             default, cyberpunk, horizontal
│   ├── kits/               aggregators — re-exports only, no logic
│   │   ├── frameworks/     @aio-ui/frameworks = core + base + app
│   │   ├── modules/        @aio-ui/modules = module-loader + the runtime modules
│   │   └── themes/         @aio-ui/themes = the three themes
│   └── components/         accordion article badge carousel fabmenu footer form
│                           id-address input masonry menu message modal
│                           modeswitcher pricingcard product rating section tab table
│
├── examples/               host applications that prove the framework
│   ├── gallery/            gallery/profile model (routes, content, assets)
│   └── demo/               component kitchen, form, product, article
│
├── scripts/                build & release tooling (node, dry-run by default)
│   ├── build-pack.mjs      per-package dist build in dependency order
│   ├── bounds.mjs          dependency-edge enforcement
│   ├── version.mjs         fixed versioning across all packages
│   ├── release.mjs         tarballs + registry.json + layout.json + checksums
│   └── new-component.mjs   scaffold a component package
│
├── templates/              scaffolds used by new-component
│
├── docs/                   documentation (see the index below)
│
└── .guidance/              how to work here — rules, plan, architecture guide
    ├── AGENT_RULES.md      hard rules: session start/finish, language, changelog
    ├── plan.md             open work only (decisions + stages + gates)
    ├── RAJUTAN.md          system guide: concept, infrastructure, contracts,
    │                       mechanism, outputs, status, roadmap, agent playbook
    ├── rules.md            house conventions (markup, CSS, tokens)
    ├── mandatory/          architecture, coding principles, design, docs, style
    └── project/            project-level decisions, status, next tasks
```

Ignored, local-only working areas:

| Folder       | Purpose                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------ |
| `.draft/`    | not-yet-a-package work: `preset/` (generator engine), `results/` (generated sites), `release/` (release artefacts) |
| `.archives/` | old implementations kept for reference (e.g. `wizard.ts`, the legacy address API)                                  |

## Where to look

| I need…                                     | Read                                                                          |
| ------------------------------------------- | ----------------------------------------------------------------------------- |
| Product vision, market framing              | `docs/presentation0.md`                                                       |
| How generated sites are produced (Rajutan)  | `.guidance/RAJUTAN.md`                                                        |
| Open work / what is next                    | `.guidance/plan.md`                                                           |
| Rules an agent must follow                  | `.guidance/AGENT_RULES.md`, `.guidance/mandatory/`                            |
| Renderer internals                          | `docs/DOMRenderer.md`                                                         |
| Component conventions / template / data     | `docs/COMPONENT-CONVENTIONS.md`, `COMPONENT-TEMPLATE.md`, `COMPONENT-DATA.md` |
| Input field types & actions                 | `docs/FIELD-TYPES.md`, `docs/INPUT-ACTIONS.md`                                |
| App shell (`AioApp`)                        | `docs/APP.md`, `docs/API.md`                                                  |
| Dependency rules                            | `docs/BOUNDARIES.md` (+ enforced by `scripts/bounds.mjs`)                     |
| Import path policy (root barrel vs subpath) | `docs/PUBLIC-API.md`                                                          |
| Events bus                                  | `docs/eventbus.MD`                                                            |
| Address picker                              | `docs/idAddress.MD`, `packages/components/id-address/README.MD`               |
| Sheets CMS / REST API / deployment          | `docs/GoogleSheets CMS/`                                                      |
| Apps Script orchestrator flow               | `docs/apps-script-integration.md`                                             |
| Generator engine internals                  | `.draft/preset/README.md`                                                     |
| The AI prompt that writes content           | `.draft/preset/prompt.content.md`                                             |

## Conventions in one screen

- **A capability lives in a module; a component only renders.** No builder imports its
  own CSS — one stylesheet per owner, injected through `@aio-ui/core/Stylesheets`.
- **Definitions + manifest.** `*_DEFINITIONS` are live objects; `*_MANIFEST` lists paths
  and ids. `scope` states intent, **ids decide**.
- **Tokens at `:root`**, themes put `--app-*` on `body[data-theme]`.
- **Boundaries are mechanical** — `npm run check:bounds` fails an undeclared import edge.
- **Barrels are curated** — a package `index.ts` lists its exports; `export *` is only
  allowed in an aggregator, and `npm run check:api` fails when the surface drifts.
- **Fixed versioning** — one number for every package; peers are rewritten together.
- **Reversible tooling** — scripts are dry-run by default; `--apply` writes only
  git-tracked files. Undo with `git restore packages package.json`.

## Status snapshot

Working: 34 packages build and are tested (413 tests), the form family (module registry,
messages, animations, address adapters) runs, the generator produces real files
(`.draft/results/`), versioning is fixed at `0.1.0`, and release artefacts can be produced
locally.

Open: the dynamic store page's form does not render yet; the GitHub release workflow and
the first browser smoke test against a real tag are still missing. Details and the honest
list live in `.guidance/RAJUTAN.md` §9 and `.guidance/plan.md`.
