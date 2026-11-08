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

## 2. Naming

| Thing                      | Convention              | Example (`my-widget`) |
| -------------------------- | ----------------------- | --------------------- |
| Registry key / `builderId` | The folder's kebab name | `"my-widget"`         |
| Class                      | `<Pascal>Builder`       | `MyWidgetBuilder`     |
| Element-type union         | `<Pascal>ElementType`   | `MyWidgetElementType` |
| Config interface           | `i<Pascal>Config`       | `iMyWidgetConfig`     |
| Item/record interface      | `i<Pascal>Item`         | `iMyWidgetItem`       |
| Key list                   | `ELEMENT_KEYS`          | —                     |
| Selector map               | `DEFAULT_SELECTORS`     | —                     |
| Payload normalizer         | `normalizePayload`      | —                     |

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

| Place                                                        | Entry                                                   |
| ------------------------------------------------------------ | ------------------------------------------------------- |
| `packages/core/src/types/registry.ts`                        | `my-widget: any;` inside `iBuilderRegistry`             |
| Host asset map (e.g. `examples/demo/src/registry.assets.ts`) | `modules` + `styles` lazy loaders                       |
| Content                                                      | `builder: ["my-widget"]` on a node, or a host table row |

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
- **Never `import "./MyWidget.css"` inside the builder.** The registry already injects the
  sheet from the manifest; a second import is an untracked duplicate.
  The exception is a builder that instantiates a child builder **directly** (not through
  the registry): that child's sheet would never be injected, so the parent's CSS
  `@import`s it — see `ProductGrid.css` → `@import "./ProductCard.css";`.
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
- [ ] A node declares `builder: ["<kebab>"]`, or a demo table row exists
- [ ] Test covers `normalizePayload` and key/selector coverage
- [ ] `npm run verify` is green
