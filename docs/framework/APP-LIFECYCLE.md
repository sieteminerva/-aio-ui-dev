# App lifecycle — who releases what

A route swap replaces the DOM. It does **not** stop anything the replaced page started:
intervals, observers, viewport listeners and registry entries outlive the nodes. Every rule
below exists because a census over `#kitchen/<name>` navigation found the leak it prevents.

See [`APP.md`](./APP.md) for the entry contract and [`COMPONENT-CONVENTIONS.md`](./COMPONENT-CONVENTIONS.md)
for how a builder is written.

---

## 1. Ownership table

| Resource                         | Owner                           | Released by                                        | App calls it?                 |
| -------------------------------- | ------------------------------- | -------------------------------------------------- | ----------------------------- |
| Root element                     | `AioApp`                        | `container.replaceChildren(tree)` on the next pass | yes, every render             |
| Controller state                 | page controller                 | `iPageController.onDestroy()`                      | **only on route-name change** |
| Interval / timeout               | the builder that created it     | its `destroy()` — `Base.destroy()` does **not**    | no                            |
| `IntersectionObserver` etc.      | the builder that created it     | its `destroy()` / `unmount()`                      | no                            |
| Listeners on own nodes           | the builder                     | the nodes going away (bounded)                     | implicit                      |
| Listeners on `window`/`document` | the code that added them        | explicit `removeEventListener`, never a node       | no                            |
| `AnimationsService.records`      | animation module (app-lifetime) | `unmount(node)` per node                           | only if someone calls it      |
| `<style>` injected lazily        | `ComponentRegistry`             | never — one sheet per component, by design         | n/a                           |

**Rule 1.** A builder releases every timer and observer it creates in `destroy()`, and
`destroy()` starts with whatever `unmount()` already does. `Base.destroy()` unhooks DOM and
clears `storage.nodes`; nothing else is assumed.

**Rule 2.** Never add a listener to `window`, `document` or `document.body` from a builder.
Those targets survive the page. Listen on the element you rendered, or expose an
`onDestroyable` and let the caller wire it.

**Rule 3.** A singleton module (registered once, lives for the app) must key its state by
node and offer a per-node release (`AnimationsService.mount(node)` / `unmount(node)`), so the
page can hand nodes back. A singleton that only grows is a leak with no owner.

**Rule 4.** Nothing may rely on `iPageController.onDestroy()` for a _fragment_ change. It
runs on route change only — see §2.

---

## 2. What the app guarantees today (measured, head `9c44e9a`)

| Fact                                                                                 | Evidence                                                                            |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `#release()` runs only when the route **name** changes                               | `packages/app/src/AioApp.ts:680` — compares `route`, not `fragment`                 |
| No instance registry exists, so `Base.destroy()` runs only when a caller asks for it | `packages/app/src/AioApp.ts` has no builder bookkeeping                             |
| `KitchenPage` (and every demo page) declares no `onDestroy`                          | `examples/demo/src/pages/kitchen.ts`                                                |
| DOM is replaced, never accumulated                                                   | 20 navigations: `document.querySelectorAll("*")` 144–213, no trend                  |
| Lazy CSS is injected once per component                                              | `<style>` 22 → 24 → 29 → 30 across first visits, then flat; `cssRules` 341 constant |
| Per-node handlers die with their nodes                                               | 707 `addEventListener` vs 47 `removeEventListener`, `nodes` flat                    |

`#kitchen/a → #kitchen/b` is one route with two fragments: the old tree is dropped by
`replaceChildren` and nothing in it is told to stop. That is the amplifier behind every case
in §3 — the leak mechanism is in `packages/**`, the frequency is the demo's.

---

## 3. Leak classes

### L1 — Interval on a detached tree · **fixed**

Symptom: an autoplay carousel keeps calling `next()` after the page that hosted it is gone.

```ts
const builder = new CarouselBuilder({ autoPlay: 4000 });
builder.create({ content: slides }); // mounts, starts the interval
// ... route changes: the tree is detached, the interval is not
```

Fix (`packages/components/carousel/Carousel.ts`, `destroy()` override):

```ts
public destroy(typeKey?: CarouselElementType): void {
  this.unmount();                                   // stopAutoPlay() + drop handlers
  this.container?.removeEventListener("mouseenter", this.handleEnter);
  this.container?.removeEventListener("mouseleave", this.handleLeave);
  super.destroy(typeKey);
}
```

Numbers before the fix: `setInterval 4000ms` 7 → 17 over 10 visits (**+1 per mount, 0
`clearInterval` in the whole session**); 8/8 sampled `.carousel` roots still dereferenced
after two forced GCs; the detached track advanced `translateX(0%)` → `translateX(-25%)` in
5 s; V8 heap +1.3 MB per 8 visits (~160 KB each) against +0.11 MB / 10 visits for a
`badge ↔ getting-started` control.

### L2 — Instance pinned by a global listener · **fixed**

Symptom: memory grew with masonry visits although the component owns no interval: heap
+1.99 MB per 8 visits (~250 KB each, reproduced ×3), `<style>` and node count flat, all
observers untouched.

The retainer path from the heap snapshot (`WeakRef` + forced GC never released it, so the tree
was still strongly reachable):

```
Window → HTMLDocument → … → EventListener → V8EventListener
       → handleKeyDown [closure] → Context → this = MasonryBuilder
```

21 `MasonryBuilder` instances were alive after ~12 mounts, each holding its own subtree: the
modal added `document.addEventListener("keydown", handleKeyDown)`, and `handleKeyDown` closes
over `show()`, which reads `this.currentVisibleImages`. `destroy()` was never called, so the
listener — and through it the builder and its detached page — outlived every navigation.

Fix (`packages/components/masonry/Masonry.ts`, `_initModal`): the listener belongs to the
modal overlay, which is focusable and focused when it opens, so it dies with the node.

```ts
modalEl?.setAttribute('tabindex', '-1');
modalEl?.addEventListener('keydown', handleKeyDown);
const destroy = () => {
  modalEl?.removeEventListener('keydown', handleKeyDown);
  modalEl?.remove();
};
```

After: 10 visits move the heap by **−0.19 MB** (was +2.65) and exactly **1** instance is live
(the one on screen). Behaviour kept: open a card, `ArrowRight` changes `modal img src`,
`Escape` closes it.

### L3 — Global listener owned by nobody · **the class of L2**

`examples/demo/src/main.ts` adds `beforeunload` and a 30 s demo clock once — bounded, by
design. A builder doing the same leaks one listener per mount, and that listener is the anchor
that makes the whole tree immortal. `Dropdown` gets it right (every listener carries
`{ signal: this.abortController.signal }`, `destroy()` calls `abort()`) — the pattern still
needs someone to call `destroy()`, which §2 says nobody does.

### L4 — Singleton accumulation · **rule, no current violation**

`AnimationsService` keeps `records: Map<HTMLElement, AnimationRecord>` and `scopes`.
`mount(node)` adds, `unmount(node)` removes. Nothing in the demo calls `unmount`, so a page
that animates nodes and is swapped away leaves entries behind. The masonry payload carries
no `animation` attribute today (measured: 0 nodes), so this was not the L2 anchor.

### Not leaks

- `<style>` growth on first visit — one sheet per component, cached. Handlers on replaced
  nodes die with the node (`a.tier-*`: 178 adds / 0 removes, all discarded).
- `window.__app`, `__emitter`, `__demoModal`, `message`'s `config.element` — deliberate demo
  handles pinning exactly one tree.

---

## 4. Reviewer checklist

Before a component lands:

- [ ] Every `setInterval` / `requestAnimationFrame` loop has a `clear...` reachable from `destroy()`.
- [ ] Every observer is disconnected in `destroy()`; a retried `rAF` loop has a cap.
- [ ] `destroy()` releases instance state **before** `super.destroy()`.
- [ ] No listener on `window` / `document` / `document.body` from a builder.
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
  rem = T.removeEventListener;
const reg = new Map(),
  key = (t, ty) =>
    t === window
      ? "window"
      : t === document
        ? "document"
        : t?.tagName?.toLowerCase() + (t.id ? "#" + t.id : "") + " :: " + ty;
T.addEventListener = function (ty) {
  const k = key(this, ty);
  reg.set(k, (reg.get(k) || 0) + 1);
  return add.apply(this, arguments);
};
T.removeEventListener = function (ty) {
  const k = key(this, ty);
  reg.set(k, (reg.get(k) || 0) - 1);
  return rem.apply(this, arguments);
};
// after N navigations, in the console:
({
  listeners: [...reg].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 15),
  nodes: document.querySelectorAll("*").length,
  styles: document.querySelectorAll("style").length,
});
```

Wrap `setInterval`/`clearInterval` the same way when the suspect owns a timer. A counter that
grows per navigation names the owner. For retention, take a `WeakRef` to the component root
before navigating away, force GC (`HeapProfiler.collectGarbage` via CDP) and count how many
still `deref()` — 8/8 alive means the tree is not collectable.

Compare against a control pair (`#kitchen/badge ↔ #kitchen/getting-started`); anything near
+0.1 MB / 10 visits is noise, anything near +0.2 MB / visit is a leak.

Finding the owner when the numbers say "retained": counts do not name the anchor. Take a heap
snapshot over CDP (`HeapProfiler.takeHeapSnapshot`), build the reverse edge map from
`nodes`/`edges` (`meta.node_fields` / `meta.edge_fields`), then BFS **retainers** from the
retained node until a `synthetic`/native root appears. Walking first-retainers blindly loops
inside DOM↔closure cycles (element → `getMetadata` closure → `capturedRecords` → element), so
the BFS needs a visited set; the first non-cyclic path ends at the anchor in one step.

Compare against a control pair (`#kitchen/badge ↔ #kitchen/getting-started`); anything near
+0.1 MB / 10 visits is noise, anything near +0.2 MB / visit is a leak.

Finding the owner when the numbers say "retained": counts do not name the anchor. Take a heap
snapshot over CDP (`HeapProfiler.takeHeapSnapshot`), build the reverse edge map from
`nodes`/`edges` (`meta.node_fields` / `meta.edge_fields`), then BFS **retainers** from the
retained node until a `synthetic`/native root appears. Walking first-retainers blindly loops
inside DOM↔closure cycles (element → `getMetadata` closure → `capturedRecords` → element), so
the BFS needs a visited set; the first non-cyclic path ends at the anchor in one step.
