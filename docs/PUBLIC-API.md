# Public API — import path policy

> Scope: every `@aio-ui/*` package. Purpose: one predictable rule for what a consumer
> imports, so a component can move internally without breaking a host, a generated site,
> or a preset.
>
> Status: **curated barrels, aggregators, surface gate and alias retirement — all done**
> (0.1.0). What remains is listed at the end of §9.
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
| `base`                                    | `Builder`, `GLOBAL_INSTANCE_COUNTER`, `HydrationGate`, base types                 | `./Base` (alias)                                                                                                                                                                               | `./BaseAdapters/*` (internal) @aio-ui/frameworks                                                                                                                                        |
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

`scripts/api.mjs --check` reads a single source of truth (`docs/api-map.json`:
package → entries → kind) and fails when:

- a package has no root barrel while its kind requires one,
- an entry exists in `exports` but not in the map (accidental exposure),
- a map entry is missing from `exports` (forgotten publish),
- a CSS entry is not `./*.css`.

It runs inside `verify` next to `bounds` and `version:check` — the same pattern that
already works for dependency edges: mechanical, not a review checklist.

### Alias retirement — done (0.1.0)

Every subpath that was only another name for the package root is gone: 50 entries across
25 packages (`/Accordion`, `/Badge`, … `/ProductGrid`, `/Form`, `/Message`, `/Table`,
`/Input`, `/HashRouter`, `/HttpService`, `/EventEmitter`, `/Animations`, `/ModuleLoader`,
`/ModuleRegistry`, `/ThemeRegistry`, `/ThemeRenderer`, `/Base`, `/AioApp`,
`/ComponentRegistry`, `/DOMRenderer`, `/Stylesheets`, `/BuilderPort`, `/TemplateRegistry`,
`/Registry`, `/DefaultTheme`, `/CyberpunkTheme`, `/HorizontalTheme`,
`/HorizontalScrolling`, `/builder` (id-address), plus four zero-use legacy input
spellings). 143 import statements were rewritten to the root.

That closes the gap the previous iteration left open: the file a barrel re-exports is no
longer reachable, so `ELEMENT_KEYS`, `DEFAULT_SELECTORS`, `normalizePayload` and friends
are unreachable by construction, not by discipline.

**Still subpaths, on purpose:**

| Kind | Example | Why it stays |
| --- | --- | --- |
| Types-only contracts | `@aio-ui/core/interface`, `/node`, `/page`, `/api`, `/events`, `/content`, `/builder`, `/registry`, `/renderer` | one module of types without dragging the runtime |
| Capability modules | `@aio-ui/form/validation-adapter`, `@aio-ui/input/dropdown/module`, `@aio-ui/id-address/form` | loaded on demand, one per capability |
| Adapters | `@aio-ui/message/adapters/FormAdapter`, `@aio-ui/table/adapters/FormAdapter` | integrations, not the component |
| Shared type contracts | `@aio-ui/form/FormMessages`, `@aio-ui/form/FormModuleTypes` | the form ↔ message type cycle, deliberately public |
| CSS | `@aio-ui/form/Form.css` | shipped as files |

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

| Package              | Contents                                                  |
| -------------------- | --------------------------------------------------------- |
| `@aio-ui/frameworks` | `core` + `base` + `app` (public interfaces included)      |
| `@aio-ui/modules`    | `module-loader` + router, http, events, theme, animations |
| `@aio-ui/themes`     | the three shipped themes                                  |

A kit is a **re-export only** package: no logic, no CSS, one `index.ts`. Consequences,
all enforced rather than agreed:

- `scripts/bounds.mjs` gives `kits` its own category (may point anywhere) and rejects
  any non-kit package that imports a kit — so aggregators can never become a hidden
  dependency of the framework itself.
- A kit is _not_ a replacement for subpaths: `@aio-ui/modules` pulls every module, so
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

### Internal files are named after their duty

With the aliases gone, an implementation file is unreachable from outside — but a builder
file that also carried selectors, normalisers and guards was still a bad file. The
convention is written down in [`COMPONENT-CONVENTIONS.md`](./COMPONENT-CONVENTIONS.md)
(§1b) and applied where the mixture was real:

| Suffix | Duty | Applied so far |
| --- | --- | --- |
| `<Pascal>.kit.ts` | constants, key lists, selector maps, element-type unions, attribute tables | badge, menu, section, carousel, product-detail, product-grid, id-address |
| `<Pascal>.engine.ts` | normalisation, transforms, fallbacks worth a DOM-free test | badge, menu, section, product-detail, product-grid |
| `<Pascal>.behaviour.ts` | observers, timers, scheduling, event wiring | none yet — `animations/behaviours` is the module-level example |

The builder file now holds the builder and its public types only, and no `.kit`/`.engine`
name appears in a barrel or an `exports` map — the gate would reject it if one did. Public
types deliberately stay with the builder: moving `iCarouselAttrsConfig` into a kit made it
vanish from the surface; the gate caught it and the removal was accepted as internal.

### Still open

- `animations/canvas/*` is still exported (decision 4 above); it is a demo surface, not
  framework API.
- The remaining `*ElementType` unions still sit beside their builders in the twelve
  components that never needed a kit file. They are unpublished, so this is hygiene rather
  than a leak — move them when a component is touched for another reason.
- `core/interface` (71 imports) is one module of types for the whole framework. It stays a
  contract on purpose, but it is the next thing worth splitting if those type modules ever
  start importing runtime code.
