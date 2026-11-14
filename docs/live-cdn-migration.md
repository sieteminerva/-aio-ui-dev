# Migrating a copied app to `@aio-ui/*`

A handout for projects that were born as a **copy** of this framework: the builder sources,
the registry, the components and the stylesheets live inside the app, imports are relative
(`../lib/Base`), and `@aio-ui/*` appears nowhere in `package.json`. The goal is the same app,
consumed as **packages** instead of copied files.

Published surface, tag and URL shapes: [`live-cdn-repo.md`](./live-cdn-repo.md) §2 (live URLs)
and §3 (clone, `file:` deps, workspace link, import map, and the 40-row package table in §3.4).
This document does not repeat them — it maps **your copied files onto those packages**.

- Target: `@aio-ui` **0.2.0** / tag **`v0.2.0`** (40 packages, 23 components).
- Repo: `https://github.com/sieteminerva/-aio-ui-dev`.
- Assumes a bundler (Vite/webpack) unless you take §2C, the browser import map.

## 1. Inventory — what to delete, what replaces it

Delete only after the replacement import compiles. Names on the left are the **typical**
file names in a copy; match by content, not by spelling.

### 1.1 Runtime (the kernel)

| Copied file / folder (typical)                                         | Replace with                                                          |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `src/lib/Base.ts` (`BaseBuilder` / `Builder`)                          | `@aio-ui/base` → `Builder`                                            |
| `src/lib/BaseAdapters/*` (`BuilderProxy`, `Hydration`, …)              | `@aio-ui/base` — internal; nothing imports these directly             |
| `src/lib/DOMRenderer.ts`                                               | `@aio-ui/core` → `DOMRenderer`                                        |
| `src/lib/ComponentRegistry.ts`                                         | `@aio-ui/core` → `ComponentRegistry`, `mergeBuildConfig`              |
| `src/lib/Stylesheets.ts` (`injectStyle`, lazy CSS, style tags)         | `@aio-ui/core` → `ensureStylesheet`, `injectLazyCss`, `styleTagId`, … |
| `src/lib/Registry/*`, `TemplateRegistry.ts`                            | `@aio-ui/core` → `Registry`, `TemplateRegistry`, `assertValidId`, …   |
| `src/lib/AttributeUtils.ts`, `DomUtils.ts`, `Metadata.ts`, `helper.ts` | `@aio-ui/utilities`                                                   |
| `src/lib/SelectorToTree.ts`, `parseTableFile.ts`, `color.utils.ts`     | `@aio-ui/utilities`                                                   |
| `src/lib/Markdown.ts` (parser + renderer)                              | `@aio-ui/markdown` — builder only; the parser is no longer public API |
| `src/lib/bootstrap/*` (manual boot, global `app`)                      | `@aio-ui/app` → `AioApp`, `AppStorage`, `blockToNode`                 |

> The Markdown **parser** used to ship from `@aio-ui/utilities`. It now lives inside
> `@aio-ui/markdown` as a non-exported module, so `import { parseMarkdown } from
"@aio-ui/utilities"` is a dead import — use the `markdown` **builder**.

### 1.2 Services and themes

| Copied file / folder (typical)                                                 | Replace with                                               |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `src/lib/HashRouter.ts`                                                        | `@aio-ui/router` → `HashRouter`                            |
| `src/lib/ThemeRegistry.ts`, theme swap / persistence                           | `@aio-ui/theme` → `ThemeRegistry`, `ThemeRenderer`         |
| `src/lib/AppStorage.ts`                                                        | `@aio-ui/app` → `AppStorage`                               |
| `src/lib/Animations.ts` + `behaviours/*` + `canvas/*`                          | `@aio-ui/animations` → `AnimationsService`                 |
| `src/lib/EventEmitter.ts`                                                      | `@aio-ui/event-emitter` → `EventEmitter`                   |
| `src/lib/HttpService.ts`                                                       | `@aio-ui/http-service` → `HttpService`                     |
| `src/lib/ModuleLoader.ts`, module registry                                     | `@aio-ui/module-loader` → `ModuleLoader`, `ModuleRegistry` |
| `src/themes/default/*`                                                         | `@aio-ui/theme-default`                                    |
| `src/themes/horizontal/*`                                                      | `@aio-ui/theme-horizontal`                                 |
| `src/themes/cyberpunk/*`                                                       | `@aio-ui/theme-cyberpunk`                                  |
| `src/styles/*.css` (`variables`, `typography`, `components`, `layout`, `icon`) | `@aio-ui/styles`                                           |

### 1.3 Components

One copied folder maps to one package, by folder name:

```text
src/components/masonry/**   →  @aio-ui/masonry
src/components/form/**      →  @aio-ui/form      (+ its subpath exports, see below)
src/components/id-address/** →  @aio-ui/id-address
```

All 23 component packages, their directories and their stylesheet subpaths are listed in
[`live-cdn-repo.md`](./live-cdn-repo.md) §3.4 — use that table as the checklist.

`@aio-ui/form` also publishes its engines as **subpaths** instead of a folder you copy:
`./Input.FormAdapter`, `./FormRegistry`, `./FormLayout`, `./FormMessages`, `./FormModuleTypes`,
`./validation-adapter`, `./cascade-adapter`, `./calculation-adapter`, `./multistep-adapter`.
A copied `src/components/form/adapters/*` folder is replaced by those imports.

## 2. Three ways to consume it

Detail (exact commands, `npm install` behaviour, rebuild rules) is in
[`live-cdn-repo.md`](./live-cdn-repo.md) §3.2. Pick one per project:

| Path                      | Use when                                                | Watch out                                                                                                                         |
| ------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **A. `file:` deps**       | App is bundled and lives outside the framework repo     | Declare every package you import, peers included. `file:` copies at install time → re-run `npm install` after each framework pull |
| **B. Workspace link**     | App and framework share one repo (like `examples/demo`) | One `npm run build:pkgs`; a new `exports` entry needs a dev-server restart                                                        |
| **C. Browser import map** | No bundler; the page loads the CDN directly             | A prefix **cannot** add `.js`, so every package root **and** every exact `exports` subpath must be mapped                         |

### 2.1 The two traps shared by all three paths

1. **Never consume the kits (`@aio-ui/frameworks`, `@aio-ui/modules`, `@aio-ui/themes`) as
   `file:` deps.** They declare real dependencies on packages that are not on npm, so npm goes
   to the registry and 404s. Import the individual packages, or use the workspace/CDN path.
2. **A bare specifier without a map entry fails at runtime, not at build time.** Under path C,
   copy the specifier set from the generated site's `importMap` — it is already closed over
   every bare import reachable from the mapped files, which is what `release.test.ts` proves.

Path C shape (all entries from §2 of the CDN guide; `@v0.2.0` is the current tag):

```html
<script type="importmap">
  {
    "imports": {
      "@aio-ui/core": "https://cdn.jsdelivr.net/gh/sieteminerva/-aio-ui-dev@v0.2.0/packages/core/dist/index.js",
      "@aio-ui/core/interface": "https://cdn.jsdelivr.net/gh/sieteminerva/-aio-ui-dev@v0.2.0/packages/core/dist/interface.js",
      "@aio-ui/form": "https://cdn.jsdelivr.net/gh/sieteminerva/-aio-ui-dev@v0.2.0/packages/components/form/dist/index.js",
      "@aio-ui/form/Form.css": "https://cdn.jsdelivr.net/gh/sieteminerva/-aio-ui-dev@v0.2.0/packages/components/form/dist/Form.css"
    }
  }
</script>
```

## 3. Staged migration

Do it in this order; each stage leaves a buildable tree.

1. **Replace imports first, delete copies second.** Point the app's imports at package
   specifiers and keep the copied files where they are. A copy that nothing imports costs
   nothing; a copy that is deleted before its replacement compiles costs a debugging session.
2. **Declare the packages you actually import.** Start from your import list, not from a wish
   list. Every component depends on `@aio-ui/base` and/or `@aio-ui/core` through
   `peerDependencies`; declare those locally too, or npm tries the registry.
3. **Delete the copies.** Remove the folders from §1. Keep exactly one source of truth. If a
   copied file has local edits the packages do not have, upstream the edit or wrap the package
   — do not keep a fork of a kernel file.
4. **Stop importing component CSS.** The registry injects the stylesheet declared in a
   builder's manifest (`stylesheet`), or derives `<name>.css` beside a file-path `script`.
   Imported-by-hand CSS double-paints and skips the lazy path. App-level design tokens come
   from `@aio-ui/styles` / the active theme, not from a component sheet.
5. **Register builders and declare the preload plan.** `registry.register(name, factory)` says
   _which manifest_ fills a component name. The second argument of
   `app.registerModule(registry, plan)` says _which names each route mounts_
   (`{ route, components }`). A page definition carries the same information in `requires`.
6. **Move page code to `registerPage`.** A controller is created per render and owns exactly
   one route: `onPrepare` loads through `ctx.http` and returns the page, `onReady` attaches
   listeners, `onDestroy` releases what it acquired. `source.pages` stays for static content;
   both may coexist (controller wins, `source.pages` is the fallback).

```ts
const components = new ComponentRegistry(assets).register("form", (data: any) => ({
  path: "@aio-ui/form",
  stylesheet: "@aio-ui/form/Form.css",
  config: data?.config,
  schema: data?.schema,
}));

const app = new AioApp({ container, defaultRoute: "home", source: { pages } })
  .registerModule(components, [{ route: "checkout", components: ["form", "table"] }])
  .registerModule(HashRouter)
  .registerModule(DOMRenderer)
  .registerModule(ThemeRenderer, { themes: [new DefaultTheme()] })
  .registerModule(HttpService, { url: "/api" })
  .registerPage("checkout", CheckoutPage); // or registerPage({ route, builder, requires })
```

## 4. Symbol map — old habit → new door

| Old (copied era)                                  | New                                                                        |
| ------------------------------------------------- | -------------------------------------------------------------------------- |
| `class X extends BaseBuilder`                     | `import { Builder } from "@aio-ui/base"`                                   |
| Custom element (`<aio-form>`, `<x-card>`)         | A host node with `builder: "<name>"` under a **real tag** key (`div#form`) |
| `innerHTML = template`                            | Page tree (`iNodeContent`) or a page document (`blocks`)                   |
| `new DOMRenderer().render(node)`                  | `AioApp` renderer slot; `DOMRenderer.buildStructure` for a single node     |
| `registry.load(["form", "table"])` by hand        | `registry.collect(source)` to inspect, `registry.loadFor(source)` to load  |
| `switch (route)` in a boot file                   | `source.pages` or `registerPage(...)` — one owner per route                |
| `window.app = ...` global                         | `new AioApp(...).render()`; keep a debug handle only if you need one       |
| `fetch(url)` inside page code                     | `ctx.http.get({ sheetName })` (`iPageContext`)                             |
| Manual theme toggle + `localStorage`              | `app.theme.use(id)` — writes the URL, persists, re-renders                 |
| `document.querySelector("#app")` appends the page | `AioApp` replaces the container's children; a page is rooted at `.page`    |

### 4.1 Trap — `isRoot` decides who owns the element

A node that carries `builder` and **no** `isRoot` keeps the host element; the builder renders
_inside_ it. `isRoot: true` lets the builder root **replace** the host, moving the key's `id`,
classes and `attrs` onto it. Page documents (`blocks`) always emit `isRoot: true`. A migrated
page that suddenly loses its wrapper `id` (or gains a duplicate) is usually an `isRoot`
mismatch, not a CSS problem. Renderer contract: `docs/framework/APP.md` → "`isRoot` — who owns
the element".

### 4.2 Trap — a builder mounted inside `onCreated` is invisible to `collect(nodes)`

`collect()` reads what a node **is** (`builder` / block `type`). Anything a hook creates at
mount time — a table inside a form, a modal opened by a button — is not in the node tree, so
the derived preload list never names it. Declare it explicitly in the route plan
(`{ route, components }`) or in the page definition's `requires`. A route that "works in dev
and 404s in prod" is this trap: the module was never loaded, and `build()` is synchronous.

### 4.3 Trap — `loadModule` with more than one export

When a manifest points at a module file that exports several candidate symbols and the
manifest declares no `export`, the loader falls back to the first one and warns in dev only
(`[ComponentRegistry] module "…" exports N candidates …`). Always name it:

```ts
{ path: "@aio-ui/form", export: "FormBuilder" }   // sub-module ref
```

Sub-module refs inside a form (`actions`, `modules`) need the same `export` for the same
reason. A production build shows no warning, only the wrong class.

## 5. Verification checklist

```text
[ ] npm run build (or the CDN page) compiles with zero unresolved imports
[ ] grep finds no relative import to a deleted folder (../lib, ./components/<name>)
[ ] package.json lists every @aio-ui/* the app imports, peers included
[ ] kits are NOT consumed as file: deps (frameworks / modules / themes)
[ ] browser import map (path C) carries every root AND every exact exports subpath
[ ] one stylesheet source: registry-injected, no hand-imported component CSS
[ ] theme renders (app.theme.ids non-empty, app.theme.current is the intended id)
[ ] console: no "[ComponentRegistry] … no CSS loader", no candidate warning, no 404
[ ] every route mounts its components after a cold load (route plan / requires complete)
[ ] smoke in the target repo: hash navigation, form submit, one lazy component, one overlay
```

Tag a commit before stage 3 and after stage 6. A migration that reaches the checklist on two
different machines is done; anything less is a rollback in waiting.

## 6. When to stay on a copy

Copying is still right for a **fork of one component** you intend to upstream, or for a
throwaway prototype. It is wrong for the kernel: the copies you would be maintaining are
`Builder`, `ComponentRegistry`, `DOMRenderer`, `Stylesheet`, the router and the theme port —
exactly the files that change between releases.
