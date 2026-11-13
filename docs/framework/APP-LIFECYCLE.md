# App lifecycle — who releases what

A route swap replaces the DOM. It does **not** stop anything the replaced page started:
intervals, observers, viewport listeners and registry entries outlive the nodes. Every rule
below exists because a census over `#kitchen/<name>` navigation found the leak it prevents.

See [`APP.md`](./APP.md) for the entry contract and [`COMPONENT-CONVENTIONS.md`](./COMPONENT-CONVENTIONS.md)
for how a builder is written.

---

## 1. Ownership table

| Resource                         | Owner                           | Released by                                        | App calls it?                           |
| -------------------------------- | ------------------------------- | -------------------------------------------------- | --------------------------------------- |
| Root element                     | `AioApp`                        | `container.replaceChildren(tree)` on the next pass | yes, every render                       |
| Builder instances                | the builder that created them   | its `destroy()`, driven by `releaseBuilders()`     | **yes — every paint, on the old shell** |
| Controller state                 | page controller                 | `iPageController.onDestroy()`                      | **yes — every replacing pass**          |
| Interval / timeout               | the builder that created it     | its `destroy()` — `Base.destroy()` does **not**    | yes, through that `destroy()`           |
| `IntersectionObserver` etc.      | the builder that created it     | its `destroy()` / `unmount()`                      | yes, through that `destroy()`           |
| Listeners on own nodes           | the builder                     | the nodes going away (bounded)                     | implicit                                |
| Listeners on `window`/`document` | the code that added them        | explicit `removeEventListener`, never a node       | no — bind only while needed             |
| `AnimationsService.records`      | animation module (app-lifetime) | `unmount(node)` per node                           | only if someone calls it                |
| `<style>` injected lazily        | `ComponentRegistry`             | never — one sheet per component, by design         | n/a                                     |
| Loading mockup (`[data-mockup]`) | the builder's `loading()`       | the sheet landing — `holdUntilStyled()`            | no — self-healing                       |

**Rule 1.** A builder releases every timer and observer it creates in `destroy()`, and
`destroy()` starts with whatever `unmount()` already does. `Base.destroy()` unhooks DOM and
clears `storage.nodes`; nothing else is assumed. Every builder is now destroyed when its page
is discarded — `create()` pins the instance on the root it returns, and `releaseBuilders()`
walks a subtree for pins — so the only thing a component still has to remember is
`super.destroy()` plus its own resources.

**Rule 2.** Never add a listener to `window`, `document` or `document.body` from a builder,
and never keep one while it is not needed. Those targets survive the page. Listen on the
element you rendered, bind a global only between "open" and "close", or expose an
`onDestroyable` and let the caller wire it. See L5.

**Rule 3.** A singleton module (registered once, lives for the app) must key its state by
node and offer a per-node release (`AnimationsService.mount(node)` / `unmount(node)`), so the
page can hand nodes back. A singleton that only grows is a leak with no owner.

**Rule 4.** A fragment change is still a controller change: `onDestroy` runs on every pass that
replaces the page, not only when the route name changes — see §2 and L6.

---

## 2. What the app guarantees today (measured 2026-11-13)

| Fact                                                                     | Evidence                                                                                |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `#release()` runs on **every** replacing pass (route, fragment or theme) | `packages/app/src/AioApp.ts` — `#renderRoute()` calls it before `#createPage()`         |
| Every builder is destroyed when its page is discarded                    | `Builder.create()` pins the instance; `#paint()` calls `registry.releaseBuilders(root)` |
| `KitchenPage` keeps its shell and destroys its builders in `onDestroy`   | `examples/demo/src/pages/kitchen.ts`                                                    |
| DOM is replaced, never accumulated                                       | 20 navigations: `document.querySelectorAll("*")` 144–213, no trend                      |
| Lazy CSS is injected once per component                                  | `<style>` 22 → 24 → 29 → 30 across first visits, then flat; `cssRules` 341 constant     |

`#kitchen/a → #kitchen/b` is one route with two fragments. Before L6 that meant the old
tree was dropped by `replaceChildren` and nothing in it was told to stop — the amplifier
behind every case in §3.

---

## 3. Leak classes

### L1 — Interval on a detached tree · **fixed**

Symptom: an autoplay carousel keeps calling `next()` after the page that hosted it is gone —
the tree is detached by the next render, the interval is not. Fix
(`packages/components/carousel/Carousel.ts`, `destroy()` override):

```ts
public destroy(typeKey?: CarouselElementType): void {
  this.unmount();                                   // stopAutoPlay() + drop handlers
  this.container?.removeEventListener("mouseenter", this.handleEnter);
  this.container?.removeEventListener("mouseleave", this.handleLeave);
  super.destroy(typeKey);
}
```

Numbers before the fix: `setInterval 4000ms` 7 → 17 over 10 visits (**+1 per mount, 0
`clearInterval` in the whole session**); 8/8 `.carousel` roots still `deref()` after two
forced GCs; the detached track advanced `translateX(0%)` → `translateX(-25%)` in 5 s; heap
+1.3 MB per 8 visits against +0.11 MB / 10 for a `badge ↔ getting-started` control.

### L2 — Instance pinned by a global listener · **fixed**

Symptom: memory grew with masonry visits although the component owns no interval: heap
+1.99 MB per 8 visits (~250 KB each, reproduced ×3), `<style>` and node count flat, all
observers untouched.

The retainer path from the heap snapshot (`WeakRef` + forced GC never released it):

```
Window → HTMLDocument → … → EventListener → V8EventListener
       → handleKeyDown [closure] → Context → this = MasonryBuilder
```

21 `MasonryBuilder` instances were alive after ~12 mounts: the modal added
`document.addEventListener("keydown", handleKeyDown)`, and that closure reads
`this.currentVisibleImages`. `destroy()` was never called, so the listener — and through it
the builder and its detached page — outlived every navigation. Fix
(`packages/components/masonry/Masonry.ts`, `_initModal`): the listener belongs to the modal
overlay, which is focusable and focused when it opens, so it dies with the node.

```ts
modalEl?.setAttribute("tabindex", "-1");
modalEl?.addEventListener("keydown", handleKeyDown);
const destroy = () => {
  modalEl?.removeEventListener("keydown", handleKeyDown);
  modalEl?.remove();
};
```

After: 10 visits move the heap by **−0.19 MB** (was +2.65) and exactly **1** instance is live
(the one on screen). Behaviour kept: open a card, `ArrowRight` changes `modal img src`,
`Escape` closes it.

### L3 — Global listener owned by nobody · **the class of L2**

`examples/demo/src/main.ts` adds `beforeunload` and a 30 s demo clock once — bounded, by
design. A builder doing the same leaks one listener per mount, and that listener is the anchor
that makes the whole tree immortal. `{ signal }` makes removal _possible_, not _happen_ (§2).

### L4 — Singleton accumulation · **rule, no current violation**

`AnimationsService` keeps `records: Map<HTMLElement, AnimationRecord>` and `scopes`;
`mount(node)` adds, `unmount(node)` removes. Nothing in the demo calls `unmount`, so an
animated page swapped away leaves entries behind. The masonry payload carries no `animation`
attribute (measured: 0 nodes), so this was not the L2 anchor.

### Not leaks

- `<style>` growth on first visit — one sheet per component, cached. Handlers on replaced
  nodes die with the node (`a.tier-*`: 178 adds / 0 removes, all discarded).
- `window.__app`, `__emitter`, `__demoModal`, `message`'s `config.element` — demo handles
  pinning exactly one tree.

### L5 — Global listener behind a teardown nobody calls · **fixed**

Symptom: `#form` grew **7.51 → 9.03 MB over 5 visits** (~0.30 MB each) with DOM nodes back to
152 and `<style>` flat at 27. The listener census showed **60 live `document` listeners** after
5 visits — 30 `click` + 30 `mousedown`, **6 dropdowns × 2 × 5**, every one from
`DropdownBuilder.initSelectMode`. Same session: `fetchAborted` 0, pending timers 0, in-flight
fetches ≤ 2 — the `id-address` Apps Script timeouts that print on every visit are **not** the
cause; they settle.

```ts
// packages/components/input/Dropdown/Dropdown.ts — before, inside initSelectMode
document.addEventListener("click", onBox, { signal: this.abortController.signal });
document.addEventListener("mousedown", onOutside, { signal: this.abortController.signal });
```

Nothing destroys a page-built form (§2), so both globals, and through their closures the
builder and the whole form subtree, survived. Retainer BFS from a `DropdownBuilder`:

```
Window → HTMLDocument → … → EventListener → V8EventListener
       → closure → Context → this = DropdownBuilder
```

Fix — a global listener may exist **only while it is needed**; everything else belongs to a
node that dies with the page (`bindBoxClick()` runs at init and on every `open()`):

```ts
const open = () => {
  bindBoxClick();
  bindOutside(); /* showPopover, .visible … */
};
const close = () => {
  unbindOutside(); /* hidePopover after 160 ms … */
};
const toggle = () => (menu.matches(":popover-open") ? close() : open());
```

After: **0** `document` listeners after 5 form visits; a `WeakRef` to `.form-host form` is
collected after one forced GC; two consecutive 10-visit blocks add **+0.17 MB** then
**+0.10 MB** (was +0.24 MB/visit, steady). Behaviour kept: box click opens (34 items),
outside click closes, padding click opens, picking `ACEH` fires the cascade. Pinned by
`packages/components/input/__tests__/Dropdown.test.ts` (3 tests).

### L6 — A fragment switch never tore down the page it replaced · **fixed**

Symptom: `#kitchen/<name>` is one route with a fragment, and `#release()` compared the route
**name**, so every switch built a new controller and dropped the old one without `onDestroy`.
Behind that, the framework had no teardown path at all: `Carousel.destroy()` and
`Masonry.destroy()` existed with **no caller**, so L1/L2/L5 only stopped because each
component removed its own global — the next builder to add a timer would have leaked exactly
like the first one.

Fix, four lines of ownership rather than a new subsystem:

1. `AioApp` releases the outgoing controller on **every** replacing pass — a fragment switch
   and a theme switch both create a new instance.
2. `Builder.create()` pins the instance on the root it returns
   (`Symbol.for("aio-ui.builder-instance")`), and `releaseBuilders(root)` destroys every
   pinned builder in a subtree, nested ones included. It unpins _before_ destroying, so the
   page's `onDestroy` and the app's paint sweep cannot double-tear-down.
3. `AioApp.#paint` releases the outgoing shell immediately before `replaceChildren`, so a
   pass that fails earlier never kills the page still on screen.
4. `KitchenPage` keeps the shell it got in `onReady` and calls `releaseBuilders` from
   `onDestroy` (the page-owned path); the paint sweep is the framework's guarantee for routes
   whose controller declares no `onDestroy`.

Measured (9 switches over `#kitchen/{badge,carousel,masonry}`, `setInterval` and
`EventTarget.prototype.addEventListener` wrapped):

| Reading                                   | Result                                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------- |
| live `setInterval`                        | 1 while the carousel is mounted, **0** after leaving it (was +1/mount, never cleared) |
| `document` / `window` listeners           | **0** throughout                                                                      |
| page roots after 6 switches + 2 forced GC | **0 of 6 alive** (previously the page tree stayed reachable)                          |
| heap, 10 carousel ↔ masonry switches      | **+0.38 MB** total (~+0.04/switch; control noise ~+0.1 MB/10)                         |
| `data-hydrating` / `data-loaded`          | 0 / 6 after every switch                                                              |

Pinned by `packages/app/src/__tests__/AioApp.teardown.test.ts` (3),
`packages/core/src/__tests__/BuilderInstances.test.ts` (4) and the pin case in
`packages/base/src/__tests__/Base.anti-fouc.test.ts`.

Probe note: wrapping `EventTarget.prototype.addEventListener` to census listeners also
retains every target it records. Run the `WeakRef` check in a **fresh page** — the first run
of this probe read 5/6 roots alive purely because the census itself was holding them.

---

## 4. Reviewer checklist

Before a component lands:

- [ ] Every `setInterval` / `requestAnimationFrame` loop has a `clear...` reachable from `destroy()`.
- [ ] Every observer is disconnected in `destroy()`; a retried `rAF` loop has a cap.
- [ ] `destroy()` releases instance state **before** `super.destroy()`.
- [ ] No teardown plumbing needed: `create()` pins the instance, `releaseBuilders()` finds it.
      A builder still overrides `destroy()` for its own timers — nothing else is required.
- [ ] No listener on `window` / `document` / `document.body` from a builder — a global that
      is only needed between open and close is bound there, not at init.
- [ ] A test proves the closed state owns no global (`document.addEventListener` spy is empty
      after `create()`) — `packages/components/input/__tests__/Dropdown.test.ts`.
- [ ] Singleton state is keyed per node and has a symmetric release method.
- [ ] A test proves teardown (`clearInterval` called with the created id, or a behavioural
      "one more interval window changes nothing") — `packages/components/carousel/__tests__/Carousel.test.ts`.
- [ ] If the resource cannot be released yet, record it in §3 with numbers instead of a comment.

---

## 5. Running the probe

Paste this **before** the app boots (DevTools → Sources → snippet reload, or an init script)
on the demo dev server, then navigate `#kitchen/...` repeatedly:

```js
const T = EventTarget.prototype,
  add = T.addEventListener,
  rem = T.removeEventListener,
  reg = [];
T.addEventListener = function (ty, fn, opts) {
  const rec = { t: this, ty, fn, live: true, at: new Error().stack.split("\n")[2] };
  reg.push(rec);
  opts?.signal?.addEventListener?.("abort", () => (rec.live = false), { once: true });
  return add.apply(this, arguments);
};
T.removeEventListener = function (ty, fn) {
  reg.findLast((r) => r.live && r.t === this && r.ty === ty && r.fn === fn)?.live = false;
  return rem.apply(this, arguments);
};
// after N navigations: alive document/window listeners, with the registering stack frame
reg.filter((r) => r.live && (r.t === document || r.t === window)).map((r) => r.ty + " ← " + r.at);
```

Wrap `setInterval`/`clearInterval` the same way. For retention, take a `WeakRef` to the
component root before navigating away, force GC (`HeapProfiler.collectGarbage`) and count how
many still `deref()` — 8/8 alive means the tree is not collectable. Control pair
(`#kitchen/badge ↔ #kitchen/getting-started`): ~+0.1 MB / 10 visits is noise, ~+0.2 MB / visit
is a leak.

Counts do not name the anchor, so when they say "retained": heap snapshot over CDP
(`HeapProfiler.takeHeapSnapshot`), reverse edge map from `nodes`/`edges`
(`meta.node_fields` / `meta.edge_fields`), then BFS **retainers** to a `synthetic`/native root.
Walking first-retainers blindly loops inside DOM↔closure cycles (element → `getMetadata`
closure → `capturedRecords` → element), so the BFS needs a visited set; the first non-cyclic
path ends at the anchor.

Two traps, both hit while tracing L5:

- `takeHeapSnapshot` does **not** collect garbage. Call `HeapProfiler.collectGarbage` first,
  or the snapshot counts unreachable objects as "live instances" (a census read 24
  `DropdownBuilder` instances where the honest number was 0).
- A listener census only names owners if it records `Error().stack` at registration, and
  `{ signal }` removals never call `removeEventListener` — hook `signal.addEventListener(
"abort")` to mark the record removed.
