# Component conventions

How a component is written in this repo. Every rule here exists because breaking it
produced a real bug — the "why" is included so you can tell when an exception is safe.

Scaffold one with:

```bash
node scripts/new-component.mjs my-widget --title "My Widget"
```

Files and placeholders are described in [`COMPONENT-TEMPLATE.md`](./COMPONENT-TEMPLATE.md).

---

## 1. Package layout

```
packages/components/my-widget/
├─ MyWidget.ts          builder: keys, selectors, payload, prepare, template, initialize
├─ MyWidget.css         scoped styles, only --app-* tokens
├─ package.json         { "name": "@aio-ui/my-widget", "type": "module" }
├─ README.md            payload + nodes + wiring checklist
└─ __tests__/
   └─ MyWidget.test.ts  DOM-free tests (payload contract + selector coverage)
```

| Rule                        | Reason                                                                |
| --------------------------- | --------------------------------------------------------------------- |
| Folder name is `kebab-case` | It is the package name suffix and the registry key.                   |
| File name is `PascalCase`   | It is the class name; the registry derives the CSS path from it.      |
| One component per folder    | Multi-component folders break stylesheet derivation and chunk naming. |
| `package.json` is private   | Nothing is published; workspaces link them locally.                   |

---

## 1b. Internal files — `.kit` / `.engine` / `.behaviour`

`MyWidget.ts` is the only file the package ever publishes, and it should hold the builder
and nothing else. Everything the builder needs in order to work lives next door, in a file
named after **what it does**, never after where it happens to be used:

| Suffix                  | Holds                                                                                                                                   | Test for it                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `<Pascal>.engine.ts`    | Logic with weight: payload normalisation, transforms, derived values, calculations.                                                     | Would you want a unit test that never touches the DOM? Then it is engine. |
| `<Pascal>.kit.ts`       | Constants and complements: `ELEMENT_KEYS`, `DEFAULT_SELECTORS`, element-type unions, attribute/config maps. No branching worth testing. | Is it a literal, a type, or a one-liner? Then it is kit.                  |
| `<Pascal>.behaviour.ts` | Anything that changes how the component _behaves_ at runtime: observers, timers, schedulers, event wiring, cleanup.                     | Does it keep state between calls or schedule work? Then it is behaviour.  |

```
packages/components/my-widget/
├─ index.ts              curated public barrel — the only entry a consumer reads
├─ MyWidget.ts           MyWidgetBuilder + iMyWidgetConfig, nothing else
├─ MyWidget.kit.ts       ELEMENT_KEYS, DEFAULT_SELECTORS, MyWidgetElementType
├─ MyWidget.engine.ts    normalizePayload
├─ MyWidget.behaviour.ts (only if it schedules or observes something)
├─ MyWidget.css
└─ __tests__/
```

Rules that keep this honest:

- **These files are not exported.** They are not entries in `index.ts` and not subpaths in
  `package.json`. Tests reach them with a relative import; consumers cannot reach them at
  all. If a consumer needs something from a `.kit`/`.engine` file, that is the signal that
  it belonged in the public barrel instead — decide deliberately.
- **One duty per file.** A `.kit.ts` that starts normalising, or an `.engine.ts` that
  starts listening to events, has outgrown its name; split it, do not rename it.
- **The suffix describes the duty, not the size.** `formatPrice` is `.engine` (it decides
  what the user reads); `DEFAULT_SELECTORS` is `.kit` even though it is long.
- **No `*.parts.ts`, `*.helpers.ts`, `*.utils.ts`.** Those names describe "leftovers" and
  become the place everything is dumped.

---

## 1c. The README skeleton

Every package README is documentation a consumer can rely on **and** a document the demo parses:
`examples/demo/src/readme.ts` splits it on `##` headings and renders the named sections. That only
works while the headings are predictable, so the H2 set is closed and its order is fixed.

### Component skeleton (required, in this order)

| H2                               | Must contain                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------- |
| `# Title (\`@aio-ui/<folder>\`)` | H1 carries the title **and** the package id — no front matter, no metadata block.                 |
| `## Payload`                     | Accepted shapes (bullet list or table), one fenced `ts` example, then the field rules.            |
| `## Config`                      | `Option / Default / Meaning`, one row per key of `i<Pascal>Config`. "No options" is a valid body. |
| `## Nodes`                       | `Key / Default tag / Class / note`, one row per `ELEMENT_KEYS` entry.                             |
| `## Tokens`                      | One sentence about the `:root, [data-theme]` layer, then `Token / Derives from / Used for`.       |
| `## Wiring checklist`            | The same four numbered steps (registry key → module loader → stylesheet loader → route plan).     |

### Optional H2s (allowlist, fixed slot)

| H2                    | Slot                                            | Used by                    |
| --------------------- | ----------------------------------------------- | -------------------------- |
| `## Supported syntax` | after `## Config`                               | `markdown`                 |
| `## Methods`          | after `## Tokens`, before `## Wiring checklist` | every `packages/modules/*` |
| `## Appendix`         | last                                            | `masonry`, `id-address`    |

Any other H2 breaks the contract: `examples/demo/src/__tests__/readme.skeleton.test.ts` fails on it.
H3s are free inside a section (`### Actions`, `### detail`, `### Built-in adapters`).

### Plugin skeleton (kind: plugin)

A **plugin** is a package whose markup was written by hand instead of by a builder: the DOM looks
like a framework component's, but no `Builder` produces it. `id-address` is the reference. Plugins
keep the component section names — so the same parser reads both kinds — and add `## Methods`:

| H2                    | Must contain                                                              |
| --------------------- | ------------------------------------------------------------------------- |
| `## Payload`          | The schema the plugin accepts.                                            |
| `## Config`           | Adapter mode, level, headless switch, event callbacks.                    |
| `## Nodes`            | The markup contract (tags and classes), since there is no `ELEMENT_KEYS`. |
| `## Tokens`           | The tokens the plugin reads or declares.                                  |
| `## Methods`          | Public functions on the instance.                                         |
| `## Wiring checklist` | How a host mounts it (endpoint, adapter, page slot).                      |
| `## Appendix`         | Integrations and reference material (framework examples, REST).           |

The plugin list lives in `examples/demo/src/readme.ts` as `PLUGIN_PACKAGES`, so the skeleton test
applies the right contract instead of guessing from a folder name.

---

## 2. Naming

| Thing                      | Convention              | Example (`my-widget`)   |
| -------------------------- | ----------------------- | ----------------------- |
| Registry key / `builderId` | The folder's kebab name | `"my-widget"`           |
| Class                      | `<Pascal>Builder`       | `MyWidgetBuilder`       |
| Element-type union         | `<Pascal>ElementType`   | `MyWidgetElementType`   |
| Config interface           | `i<Pascal>Config`       | `iMyWidgetConfig`       |
| Item/record interface      | `i<Pascal>Item`         | `iMyWidgetItem`         |
| Key list                   | `ELEMENT_KEYS`          | in `<Pascal>.kit.ts`    |
| Selector map               | `DEFAULT_SELECTORS`     | in `<Pascal>.kit.ts`    |
| Payload normalizer         | `normalizePayload`      | in `<Pascal>.engine.ts` |

`builderId` and `name` are both the registry key and nothing else. Older components
(`product-card`, `fab-menu`) predate this rule; do not copy their aliasing.

---

## 3. Element keys and `selectors`

A **key** is a selector token: the string you pass to `render()` and the string a theme
template is registered under.

```ts
export const ELEMENT_KEYS = [
  "@container",
  "@myWidget",
  "@myWidget>item",
  "@myWidget>item>label",
  "@myWidget>item>desc",
] as const;

export type MyWidgetElementType = (typeof ELEMENT_KEYS)[number];
```

Rules:

1. **`@container` is the root.** Always present, always the element returned by
   `prepare()`. Two different components cannot both own it in one tree because each
   builder has its own node store.
2. **The key hierarchy mirrors the DOM hierarchy.** `>` means "child of". A theme can
   restyle a key without knowing the class names, so a node without a key is
   effectively unstyleable.
3. **One key per node type.** Repeating nodes reuse their key (call `render()` in a loop);
   the type union stays small.
4. **A key without a selector throws at render time.** That is why the suite asserts
   `Object.keys(DEFAULT_SELECTORS)` equals `ELEMENT_KEYS`.

```ts
export const DEFAULT_SELECTORS: iBuilderSelectorsConfig<MyWidgetElementType> = {
  "@container": { tagName: "div", className: "my-widget-widget" },
  "@myWidget": { tagName: "div", className: "my-widget" },
  "@myWidget>item": { tagName: "div", className: "my-widget-item" },
  "@myWidget>item>label": { tagName: "span", className: "my-widget-label" },
  "@myWidget>item>desc": { tagName: "p", className: "my-widget-desc" },
};
```

Selector fields: `tagName`, `className`, `id`, `attrs`, `wrapper` (a `">"`-separated
wrapper chain, e.g. `"div.shell>div.inner"`), `textContent`, `icon`.

Callers override per key through `config.selectors`; the registry merges them deep, so
`{ selectors: { "@myWidget>item": { className: "compact" } } }` keeps the rest.

---

## 4. Payload contract

Only one function decides which input shapes are accepted — never scatter `if`s through
`prepare()`:

```ts
export function normalizePayload(data: any): iMyWidgetItem[] {
  if (!data) return [];
  if (Array.isArray(data)) return data.filter(Boolean);
  if (typeof data === "object") {
    if (Array.isArray(data.items)) return data.items.filter(Boolean);
    if (Array.isArray(data.content)) return data.content.filter(Boolean);
    if (data.label || data.description) return [data];
  }
  return [];
}
```

The registry already unwraps `node.content` before calling a builder, so a builder rarely
needs to look at `content` at all. Accept the bare array first; treat wrappers as a
courtesy. Export the normalizer so tests can lock the contract without a DOM.

---

## 5. `prepare(content)` — build the tree

```ts
public prepare(data: any): HTMLElement {
  const items = normalizePayload(data);

  const container = this.render("@container", { count: items.length });
  const root = this.render("@myWidget", { count: items.length });

  for (const item of items) {
    const node = this.render("@myWidget>item", item);
    if (!node) continue;

    if (item.label) {
      const label = this.render("@myWidget>item>label", item);
      if (label) node.appendChild(label);
    }

    if (item.description) {
      const desc = this.render("@myWidget>item>desc", item);
      if (desc) node.appendChild(desc);
    }

    root?.appendChild(node);
  }

  if (container && root) container.appendChild(root);

  return this.load("@container") as HTMLElement;
}
```

| Rule                                                        | Reason                                                                                                                                                 |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Build with `render()`, never `document.createElement()`     | `render()` registers the node, runs `template()`, applies the theme handler and emits `elementAdded`. A hand-made element is invisible to all of that. |
| Never use `innerHTML` for content                           | Payload is untrusted; `textContent` is the only safe sink.                                                                                             |
| Do not append anything to `document.body`                   | The caller decides where the root goes. A builder that body-appends escapes teardown.                                                                  |
| Skip absent parts instead of appending empty nodes          | Empty `<p>`/`<ul>` keep layout gaps open and showed up in the footer as a real defect.                                                                 |
| Return `this.load("@container")`, not a local variable      | The element in the node store is the canonical one (wrappers and hydration markers live there).                                                        |
| `prepare()` must be pure with respect to the DOM outside it | It runs before `initialize()`, on every render.                                                                                                        |

### Anti-FOUC markers belong to the framework, not the component

One call at the end of `create()` does the whole job:
`holdUntilStyled(root, this.stylesheet)` (`@aio-ui/core/Stylesheets`). It asks the seam
whether this component's sheet is missing. If it is, the root is returned with
`--is-loading: 1` + `data-hydrating`, and the same call releases it from its own
`ensureStylesheet()` promise. If it is not, the root is released immediately. There is
no gate object, no per-instance flag and no registry step.

- Never write `data-hydrating`, `data-loaded` or `--is-loading` in a component.
- Never call `holdUntilStyled()` from a subclass; `create()` already does.
- A component the host serves no sheet for is never held — there is nothing to wait for.
- The decision is per sheet, not per instance: two components built in one pass own two
  sheets, so "this instance already loaded once" would freeze the wrong subtree.

Multi-mode components (e.g. `Rating`'s four visual types, `Footer`'s two rows) branch on
`this.config` inside `prepare()` and render only the keys that mode needs.

---

## 6. `template(typeKey, el, payload)` — hydrate one node

```ts
protected template(typeKey: MyWidgetElementType, el: HTMLElement, payload?: any): void {
  switch (typeKey) {
    case "@container":
      if (this.config.emphasis) el.classList.add("is-emphasis");
      break;

    case "@myWidget>item>label":
      el.textContent = payload?.label ?? "";
      break;

    case "@myWidget>item>desc":
      el.textContent = payload?.description ?? "";
      break;

    default:
      break;
  }
}
```

- Called by `render()` for the key being rendered — never call it yourself.
- Text and attributes only. Class/state toggles are fine; building children is not
  (children are their own keys).
- `payload` is whatever you passed to `render()`. Use `?.` and `??` — a key can be
  rendered with no payload.
- Theme handlers registered in `TemplateRegistry` run **after** `template()` for the same
  key, so a theme can decorate but the component still owns its content.

---

## 7. `initialize(root, content)` — wire interaction

`create()` calls `prepare()` → `initialize(root, content)` → hierarchy snapshot.
A component with no behaviour (`template` + CSS only) leaves it empty.

```ts
public initialize(root: HTMLElement): void {
  root.removeEventListener("click", this.handleClick);
  root.addEventListener("click", this.handleClick);
}

private handleClick = (event: Event): void => { /* … */ };
```

| Rule                                              | Reason                                                                                  |
| ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Keep listener refs as stable class fields         | An inline arrow cannot be removed, so re-initialising stacks handlers.                  |
| Remove before add                                 | `run()`-style bootstrapping and re-mounts call `initialize()` again.                    |
| Own your timers, observers and `AbortController`s | Clear them in `destroy()`; a running interval keeps the instance (and its nodes) alive. |
| Do not read state the constructor could have set  | Config is already resolved; payload is the argument.                                    |

Special case — **`prepare()` may return something other than the root element** when a
component has no DOM identity of its own (e.g. `Modal` returns controls through
`config.onReady` and hands back its overlay). Keep that as the exception and document it
in the component's README.

---

## 8. Lifecycle order

```
new MyWidgetBuilder(config)      // resolveConfig: themeId, selectors, namespace, emit, your options
  └─ create(content, config)     // config merged again (theme < manifest < node)
       ├─ ensureIdentity()       // namespace + selector tree from keys
       ├─ prepare(content)       // render() × N  →  template() per node
       ├─ initialize(root)       // interaction wiring, once
       └─ hierarchy.update()     // element inventory per key
  └─ destroy()                   // remove root, clear node store, emit elementRemoved, null config
```

`destroy()` from the base class removes `@container` from the DOM, clears the node store
and nulls `config`. If you override it: do your cleanup **first**, then call
`super.destroy()`, and make it idempotent (a second call must not throw).

`Base.destroy()` releases no timers, observers or global listeners — whatever you started in
`initialize()` is yours to stop. Which resources need releasing, and the measured leaks that
happen when they are not, are in [`APP-LIFECYCLE.md`](./APP-LIFECYCLE.md).

---

## 9. Config surface

```ts
export interface iMyWidgetConfig extends iBuilderConfig<MyWidgetElementType> {
  emphasis?: boolean;
}
```

- Everything optional in the interface; `Required<iMyWidgetConfig>` is the internal type
  after `resolveConfig()` fills defaults.
- Extend `iBuilderConfig` so `themeId`, `namespace`, `selectors` and `emit` keep working.
- Never put data in config. Data is the payload; config is behaviour.
- Merge order is fixed: **theme config < manifest `config` < node/instance `config`**.

---

## 10. The three registrations

A component is not usable until three places know its name:

| Place                                                        | Entry                                             |
| ------------------------------------------------------------ | ------------------------------------------------- |
| `packages/core/src/types/registry.ts`                        | `my-widget: any;` inside `iBuilderRegistry`       |
| Host asset map (e.g. `examples/demo/src/registry.assets.ts`) | `modules` + `styles` lazy loaders                 |
| Route plan (`registerModule(components, […])`)               | `{ route: "<route>", components: ["my-widget"] }` |

The asset map is written with **static specifiers** on purpose: Vite needs literal
`import()` strings to create chunks, so a computed `import(entry.path)` produces nothing.

---

## 11. Tests

Suite runs with `environment: "node"` — there is no DOM. Test the two things that fail
silently:

1. the payload contract (`normalizePayload` across every accepted shape), and
2. that every declared key has a selector.

Anything that needs a real DOM belongs in the demo page, not the suite.

---

## 12. CSS

```css
.my-widget-item {
  padding: var(--app-padding-component);
  border: 1px solid var(--app-border-color);
  border-radius: var(--app-component-border-radius);
  background: var(--app-surface-background-color);
  color: var(--app-text-color);
}
```

- Scope every rule under the component's own classes; never style bare tags.
- Use `--app-*` tokens only (`--app-gap`, `--app-margin-component`,
  `--app-padding-component`, `--app-text-color`, `--app-text-heading-color`,
  `--app-text-accent-color`, `--app-border-color`, `--app-surface-background-color`,
  `--app-primary-color`, `--app-component-border-radius`, `--app-shadow-soft`).
  A raw hex value is a theme that cannot be retuned.
- Declare `readonly stylesheet = "./MyWidget.css"` **and** pass
  `stylesheet: "@aio-ui/my-widget/MyWidget.css"` in the host manifest. The registry
  derives it from the script path when the manifest omits it.
- **Never `import "./MyWidget.css"` inside the builder.** The bundler resolves that
  statically, so the sheet rides inside the JS chunk and the loader injects the same
  rules a second time — the opposite of loading the component on demand. Instead
  `Builder.create()` asks the shared seam (`ensureStylesheet`, `@aio-ui/core/Stylesheets`)
  for the declared sheet on every build; the seam resolves the specifier against the
  host's `styles` asset map (exact path, then normalized, then by file name — the sheet
  sits next to the component under a name no sibling reuses), injects one
  `<style id="rajutan-lazy-css__…">`, and is idempotent with the registry's own
  injection. A adapter that is not a `Builder` (say `FileUploader`) asks for its
  sheet in its constructor; `ProductGrid.css` may still `@import "./ProductCard.css";`
  when the child is created directly.
- Respect `prefers-reduced-motion` for any transition.

---

## 13. Anti-patterns

| Don't                                                   | Do instead                                               |
| ------------------------------------------------------- | -------------------------------------------------------- |
| `document.createElement` inside `prepare()`             | `this.render(key, payload)`                              |
| `el.innerHTML = "<b>" + value + "</b>"`                 | `el.textContent = value` (and a key for the wrapper)     |
| Caching DOM in module-level variables                   | Keep it on the instance; the instance dies with the tree |
| Two components sharing one key name                     | Each builder owns its keys; namespace handles collisions |
| Registering a wrapper object around the builder class   | Register the class; the registry constructs it           |
| Joining `label` and `value` with `" "` without checking | Decide the display rule in `template()` and document it  |

---

## 14. Checklist

- [ ] `packages/components/<kebab>/` created from the template (or by hand, same shape)
- [ ] `ELEMENT_KEYS`, `DEFAULT_SELECTORS`, `<Pascal>ElementType` present and aligned
- [ ] `i<Pascal>Config`, `i<Pascal>Item`, `normalizePayload` exported
- [ ] `prepare()` uses `render()` only, returns `load("@container")`
- [ ] `template()` uses `textContent`, handles a missing payload
- [ ] `initialize()` is idempotent; timers/listeners cleared in `destroy()`
- [ ] `readonly stylesheet = "./<Pascal>.css"` and the file exists
- [ ] `builderId` / `name` = the registry key
- [ ] `iBuilderRegistry` gained the key
- [ ] Host asset map has `modules` + `styles` entries (static specifiers)
- [ ] The route plan lists `"<kebab>"`, or a demo table row exists
- [ ] Test covers `normalizePayload` and key/selector coverage
- [ ] `README.md` follows §1c — five H2s in order (plus `## Methods` for a module)
- [ ] `npm run verify` is green
