# Public API — import path policy

> Scope: every `@aio-ui/*` package. Purpose: one predictable rule for what a consumer
> imports, so a component can move internally without breaking a host, a generated site,
> or a preset.
>
> Status: **barrels and aggregators implemented** (0.1.0). Aliases stay until 0.2.0.
> Last updated 2026-11-11 — see §9 for what actually changed.

## 1. Taxonomy (the rule we adopt)

| Kind                    | Entry                         | Example                                |
| ----------------------- | ----------------------------- | -------------------------------------- |
| Main consumer API       | **root barrel** `@aio-ui/x`   | `import { AioApp } from "@aio-ui/app"` |
| Optional capability     | subpath                       | `@aio-ui/form/calculation-adapter`     |
| Adapter / integration   | subpath                       | `@aio-ui/table/adapters/FormAdapter`   |
| CSS                     | subpath                       | `@aio-ui/form/Form.css`                |
| Types-only contract     | subpath, or root when general | `@aio-ui/core/interface`               |
| Internal implementation | **not exported**              | `BaseAdapters/*`, `canvas/*`           |

Two corollaries:

1. **A package with one obvious entry must have a root barrel**, even if a named
   subpath also exists. A named subpath is an _alias_, not the contract.
2. **The root barrel is small and stable**; anything that needs a feature flag, a
   builder subclass, or a stylesheet lives below it.

## 2. Current audit

Counts are real import occurrences in `packages/**` + `examples/**` today.

| Package                                   | Root `.`          | Entries                                                                                                                                                                                                                               | Verdict                                                               |
| ----------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `app`                                     | `src/index.ts` ✅ | `./AioApp ./ports ./types`                                                                                                                                                                                                            | root good; `./AioApp` is a redundant alias                            |
| `base`                                    | `src/index.ts` ✅ | `./Base ./BaseAdapters/*`                                                                                                                                                                                                             | `./Base` used 46×; `BaseAdapters/*` leaks internals                   |
| `core`                                    | `src/index.ts` ✅ | 15 more: `interface`(71×), `events`(9), `ComponentRegistry`(9), `Registry`(8), `node`(8), `page`(7), `registry`(5), `Stylesheets`(4), `builder`(2), `renderer`(2), `content`, `api`, `DOMRenderer`, `BuilderPort`, `TemplateRegistry` | root exists but is bypassed; 8 of the subpaths are historical aliases |
| `module-loader`                           | ❌ none           | `./ModuleRegistry`(28), `./ModuleLoader`(6)                                                                                                                                                                                           | **main API has no root** — every consumer deep-imports                |
| `utilities`                               | ❌ none           | 7 helper subpaths                                                                                                                                                                                                                     | acceptable by category, but no single import for "the utilities"      |
| `router`, `http-service`, `event-emitter` | ✅                | `./HashRouter`, `./HttpService`, `./EventEmitter`(5), `./PageEvents`                                                                                                                                                                  | aliases duplicated in root                                            |
| `theme`                                   | ✅                | `./ThemeRegistry ./ThemeRenderer`                                                                                                                                                                                                     | capability pieces — correct as subpaths                               |
| `theme-*`                                 | ✅                | `./DefaultTheme`, `./CyberpunkTheme(.css)`, `./HorizontalScrolling`(5)                                                                                                                                                                | `HorizontalScrolling` is implementation, not API                      |
| `styles`                                  | `.` → `index.css` | 6 CSS subpaths                                                                                                                                                                                                                        | root pointing at CSS is an exception to document                      |
| `form`                                    | `./Form.ts` ✅    | `Form.css`, `FormMessages`, `FormModuleTypes`, 5 adapters, `Input.FormAdapter`                                                                                                                                                        | fits the taxonomy already; `./Form` is an alias                       |
| `input`                                   | `./Input.ts` ✅   | **26 entries** incl. three spellings of the same module (`./dropdown`, `./Dropdown/Dropdown`, `./dropdown/module`)                                                                                                                    | worst offender; legacy paths unused                                   |
| `id-address`                              | ✅                | `adapter`, `adapter.native/.base/.aio`, `form`, css                                                                                                                                                                                   | fits                                                                  |
| `message`, `table`                        | ✅                | `./Message`/`./Table`, css, `adapters/FormAdapter`                                                                                                                                                                                    | fits; named alias redundant                                           |
| single-component packages (16)            | ❌ none           | `./Accordion`, `./Accordion.css`, …                                                                                                                                                                                                   | **no root barrel** anywhere                                           |
| `product`                                 | ❌ none           | 3 builders + 3 sheets                                                                                                                                                                                                                 | no root, and 3 components in one package                              |
| `animations`                              | ✅                | `Animations.css`, `behaviours`, `behaviours/*`, `canvas/*`                                                                                                                                                                            | `canvas/*` (toys) should not be public                                |

### The five real problems

1. **No root barrel for 20 packages** (`module-loader`, `utilities`, 16 components,
   `product`). Consumers cannot write the obvious import.
2. **`core` is both barrel and junk drawer**: 15 subpaths, 8 of them aliases
   (`node`, `builder`, `registry`, `content`, `page`, `renderer`, `api`, `events`).
3. **`input` exposes the same module three ways**; legacy spellings
   (`Dropdown/Dropdown`, `FileUploader/FileUploader`, `InputControls/InputControls`,
   `Popover.InputModule`) have **zero** consumers.
4. **Internals leak**: `base/BaseAdapters/*`, `animations/canvas/*`,
   `theme-horizontal/HorizontalScrolling`.
5. **Aliases are indistinguishable from contracts**: `./Base`, `./Form`, `./AioApp`,
   `./Message`, `./Table` look like the API but are duplicates of the root.

## 3. Target export map

Legend: **root** = barrel we promise; _keep_ = subpath stays public; _alias_ = keep for one
minor, then remove; _internal_ = drop from `exports`.

| Package                                   | Root barrel exports                                                               | Subpaths kept                                                                                                                                                                                  | Removed                                                                                                                                                                                 |
| ----------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core`                                    | `ComponentRegistry`, `DOMRenderer`, `mergeBuildConfig`, builder port, event types | `./interface` (types), `./Stylesheets` (capability)                                                                                                                                            | `./node ./builder ./registry ./content ./page ./renderer ./api ./events` (alias→remove in 0.2.0), `./TemplateRegistry`, `./BuilderPort`, `./ComponentRegistry`, `./DOMRenderer` (alias) |
| `base`                                    | `Builder`, `GLOBAL_INSTANCE_COUNTER`, `HydrationGate`, base types                 | `./Base` (alias)                                                                                                                                                                               | `./BaseAdapters/*` (internal)                                                                                                                                                           |
| `app`                                     | as today                                                                          | `./types`, `./ports` (types contracts)                                                                                                                                                         | `./AioApp` (alias)                                                                                                                                                                      |
| `module-loader`                           | **new** `ModuleLoader`, `ModuleRegistry`, definition types                        | `./ModuleRegistry`, `./ModuleLoader` (alias)                                                                                                                                                   | —                                                                                                                                                                                       |
| `utilities`                               | **new** all helpers re-exported                                                   | all 7 helper subpaths                                                                                                                                                                          | —                                                                                                                                                                                       |
| `router`, `http-service`, `event-emitter` | as today (+ `PageEvents` types root)                                              | `./PageEvents`                                                                                                                                                                                 | `./HashRouter`, `./HttpService`, `./EventEmitter` (alias)                                                                                                                               |
| `theme`, `theme-*`                        | theme class / registry / renderer                                                 | `CyberpunkTheme.css`                                                                                                                                                                           | `./DefaultTheme`, `./CyberpunkTheme`, `./HorizontalTheme` (alias), `./HorizontalScrolling` (internal)                                                                                   |
| `styles`                                  | `.` = `index.css` (documented exception)                                          | 6 CSS files                                                                                                                                                                                    | —                                                                                                                                                                                       |
| `form`                                    | `FormBuilder` + `iFormConfig` + `iFormMessages` types                             | `Form.css`, `FormModuleTypes` (types), `FormMessages` (helpers), 5 adapter modules, `Input.FormAdapter`                                                                                        | `./Form` (alias)                                                                                                                                                                        |
| `input`                                   | `InputBuilder` + `InputType` + config types                                       | `input.css`, `dropdown.css`, `file-uploader.css`, `controls.css`, `*/module` (integration), `FieldTypes` (types), `FormValues`, `CalculationTypes`, `InputRegistry`/`InputModuleTypes` (types) | `./dropdown`, `./file-uploader`, `./controls`, `./Popover.InputModule`, `Dropdown/*`, `FileUploader/*`, `InputControls/*`                                                               |
| `id-address`                              | `IdAddressBuilder`                                                                | `adapter.native/.base/.aio`, `form`, `id-address.css`                                                                                                                                          | `./builder`, `./adapter` (alias)                                                                                                                                                        |
| `message`, `table`                        | builder + types                                                                   | css, `adapters/FormAdapter`                                                                                                                                                                    | `./Message`, `./Table` (alias)                                                                                                                                                          |
| 16 component packages                     | **new** `export { XxxBuilder }` (+ its property types)                            | `./Xxx.css`                                                                                                                                                                                    | `./Xxx` (alias)                                                                                                                                                                         |
| `product`                                 | **new** `ProductCard`, `ProductDetail`, `ProductGrid` + types                     | 3 CSS files                                                                                                                                                                                    | `./Product*` (alias)                                                                                                                                                                    |
| `animations`                              | `AnimationsService`, `ANIMATION_BEHAVIOURS`, `AnimationBehaviour` types           | `Animations.css`, `behaviours`, `behaviours/*`                                                                                                                                                 | `canvas/*` (internal)                                                                                                                                                                   |

### Why keep the named aliases for one minor

Generated sites and presets reference specifiers (`@aio-ui/form/Form`,
`@aio-ui/article/Article`). Removing them in the same commit that adds barrels would
force a preset regeneration for every site. So: **0.1.x = add barrels + keep aliases;
0.2.0 = remove aliases** (allowed, since 0.x minor is breaking by our own policy).

## 4. Ripple of the change (measured, not guessed)

| Consumer                                          | What it reads                            | Action when target map lands                              |
| ------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------- |
| `plan()` catalogue (`.draft/preset/catalogue.ts`) | specifiers like `@aio-ui/form/Form`      | switch to root specifiers; keeps generated output shorter |
| `registry.assets.ts` (demo + gallery)             | specifier → loader                       | regenerate entries; Vite needs static strings either way  |
| `.draft/results/**`                               | generated `app.js` / `dev/src/main.ts`   | regenerate (tests do it)                                  |
| `prompt.content.md`                               | never names packages                     | no change                                                 |
| `docs/*`                                          | examples with subpaths                   | update examples in the same PR                            |
| `scripts/bounds.mjs`                              | validates deep imports through `exports` | no change; it follows the map                             |
| `release.mjs` `subpaths` output                   | mirrors `exports`                        | automatically reflects the new map                        |

## 5. Enforcement

Add `scripts/api.mjs --check` reading a single source of truth (`docs/api-map.json`:
package → allowed entries → kind) and failing when:

- a package has no root barrel while its kind requires one,
- an entry exists in `exports` but not in the map (accidental exposure),
- a map entry is missing from `exports` (forgotten publish),
- a CSS entry is not `./*.css`.

Wire it into `verify` next to `bounds` and `version:check`. This is the same pattern that
already works for dependency edges — mechanical, not a review checklist.

## 6. Open decisions (need an answer before coding)

1. **Root barrel for components**: `@aio-ui/article` exports `ArticleBuilder`, or keep
   `@aio-ui/article/Article` as the only entry (current behaviour, zero churn)?
   Recommendation: add the barrel; keep the alias.
2. **`core` legacy aliases**: remove in 0.2.0, or keep `./interface` + `./events` forever
   because they are genuinely type-only contracts? Recommendation: keep `interface`,
   retire the other seven.
3. **`styles` root**: keep `.` → `index.css` (convenient `<link>`-able specifier) and
   document the exception? Recommendation: yes.
4. **`animations/canvas/*`**: delete from the package (move to `examples/`), or keep as a
   documented toy surface? Recommendation: move out; the framework should not ship demos.
5. **Do this now, or after the store-form fix?** The map touches `catalogue.ts`, so doing
   it before finishing the generator avoids two passes over the same table.

## 9. Executed (0.1.0)

Every decision from §6 was answered by "add the barrel, keep the alias", and the kit
question ("can `base` + `core` be one door?") was answered yes.

### Aggregators — `packages/kits/*`

| Package             | Contents                                                   |
| ------------------- | ---------------------------------------------------------- |
| `@aio-ui/frameworks`| `core` + `base` + `app` (public interfaces included)       |
| `@aio-ui/modules`   | `module-loader` + router, http, events, theme, animations   |
| `@aio-ui/themes`    | the three shipped themes                                   |

A kit is a **re-export only** package: no logic, no CSS, one `index.ts`. Consequences,
all enforced rather than agreed:

- `scripts/bounds.mjs` gives `kits` its own category (may point anywhere) and rejects
  any non-kit package that imports a kit — so aggregators can never become a hidden
  dependency of the framework itself.
- A kit is *not* a replacement for subpaths: `@aio-ui/modules` pulls every module, so
  generated sites keep importing `@aio-ui/router` etc. one by one.
- `packages/kits` is registered in `npm workspaces`, `build-pack` (`GROUPS`), `bounds`
  (`describe`/`categoryOf`/`allowed`), `version`, `release` and `.draft/preset/layout.mjs`.

### Root barrels

Added `.` to the 15 single-builder component packages (`accordion`, `article`, `badge`,
`carousel`, `fabmenu`, `footer`, `masonry`, `menu`, `modal`, `modeswitcher`,
`pricingcard`, `product`, `rating`, `section`, `tab`), plus `module-loader` and
`utilities`. Each barrel is `export * from "./<Entry>";` — the exports are the same
names that were already public, so nothing new leaks. `product` exports its three
builders from one place.

Already-rooted packages (`form`, `input`, `table`, `message`, `id-address`) were left as
they were.

### Consumers switched

`.draft/preset/catalogue.ts` now emits barrels for components
(`@aio-ui/masonry`, not `@aio-ui/masonry/Masonry`) and `@aio-ui/frameworks` for the
base layer, with the three dependency roots (`core`, `base`, `app`) listed as well
because the kit's own `export * from "@aio-ui/core"` is a bare specifier the browser
must find in the import map. CSS and adapter subpaths are untouched: those are
capabilities, not entries.

Regenerate `.draft/preset/layout.json` after adding a barrel — a package without `.`
is marked `bare: false` and the CDN resolver refuses its root.

### Still open

- Alias retirement (`core/api`, `core/registry`, `input/Dropdown/…`, `…/HorizontalScrolling`):
  scheduled for 0.2.0, tracked in §5.
- `scripts/api.mjs --check` + `docs/api-map.json` as a `verify` gate (§5).
- `animations/canvas/*` is still exported (decision 4 above).
