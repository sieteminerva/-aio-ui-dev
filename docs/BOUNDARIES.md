# Package Boundaries

Import rules proven during the monorepo migration. Any new package or component
must satisfy these; a violation is a bug even if the bundler happens to resolve it.

These rules are **enforced**, not advisory: `npm run check:bounds`
(`scripts/bounds.mjs`) walks every package and fails on an illegal edge, a non-type
`app → core` import, an undeclared deep import, an `import.meta.glob` outside the host,
or a reintroduced `paths`/`alias` entry. `npm run verify` runs it together with
`typecheck`, `test` and `build`.

## Dependency graph

```txt
styles        (CSS only, imports nothing)
utilities  →  core (types only)
core       →  utilities
base       →  core, utilities
modules/*  →  core, utilities
themes/*   →  core, utilities
components/* → base, core, utilities, module-loader, themes
examples/* →  anything
```

`module-loader` is split out of `modules/` on purpose: it is the plug-in kernel used by
components that have sub-modules, not an app-level utility.

`themes/` is a group of its own (not a sub-folder of `modules/`) because a theme is an
**add-on**, not a service: a project installs the themes it ships and nothing else. The
engine (`@aio-ui/theme`, `ThemeRegistry` + `ThemeRenderer`) stays in `modules/` — it is a
slot like any other. The engine consumes themes; **themes never import the engine**, which
keeps the graph a tree and lets anyone publish `@aio-ui/theme-<their-own>`.

## Rules

1. `core` must never import a concrete component or `base`.
   `ComponentRegistry` reaches builders only through `BuilderPort` (`iBuilderAdapter`),
   which `base` plugs in when its module is evaluated.

2. `base` may depend on `core`; the reverse is forbidden. The port exists for this one
   cycle and must not grow new members without a stated need.

3. A package exposes only what its `package.json` `exports` map declares. Deep imports
   into another package's internal files are not allowed.

4. Components depend on each other only through declared package dependencies
   (for example `@aio-ui/form` → `@aio-ui/message`), never through relative paths.

5. Module packages are single-purpose and installable on demand:
   `@aio-ui/router`, `@aio-ui/event-emitter`, `@aio-ui/http-service`,
   `@aio-ui/animations`, `@aio-ui/module-loader`, `@aio-ui/theme`.

5b. Theme packages are add-ons under `packages/themes/<id>/` with the package name
    `@aio-ui/theme-<id>`. They depend on `core` types only (`iThemeModule`). A theme that
    needs a stylesheet ships it in its own package (`CyberpunkTheme.css`) and the host
    imports it once.

6. Component packages are flat (`packages/components/<name>/<File>.ts`), so an
   application imports `@aio-ui/form/Form`. Install name and import name are identical.

7. `@aio-ui/styles` ships CSS only. Component CSS stays inside its component package
   and is loaded lazily through the registry.

8. Resolution is workspace-based. There are no `paths` aliases and no Vite `alias`
   entries; anything that needs one is a sign of a missing package dependency.

9. The registry receives an asset map from the host (`iComponentAssetMaps`), whose keys
   are module specifiers. A package must never own an `import.meta.glob` pattern,
   because that pattern is resolved against the host application root.

10. Components are optional. A missing module is a normal state, so registration and
    lookup must not assume presence.

## Known issue

`utilities` imports types from `@aio-ui/core/interface` while `core` imports runtime
helpers from `@aio-ui/utilities`. It is a type-only cycle, tolerated for now; if it ever
becomes a problem, `interface.ts` should move to its own `@aio-ui/types` package.
