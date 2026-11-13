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

### L2 — Instance retained with no timer · **open, retainer unidentified**

Symptom: memory grows with masonry visits although the component owns no interval.

Numbers: heap +1.99 MB per 8 visits (~250 KB each, reproduced ×3); `setTimeout` 40 created /
**0 cleared**; `IntersectionObserver` / `MutationObserver` / `ResizeObserver` deltas 0;
`<style>` and node count flat; 8/8 sampled `.masonry` roots alive after GC.

Ruled out: timers kept alive, observers, stylesheet injection, item lists on the instance.
Not yet ruled out: the init-time slider retry (`Masonry.ts:590-591`, an unbounded
`requestAnimationFrame` retry while `offsetWidth === 0`, plus `setTimeout(settle, 350)` at
`Masonry.ts:605`) and demo-side helpers.
**Do not document this as fixed.** Reproduce with the probe in §5 before changing code.

### L3 — Global listener · **rule, no current violation**

`examples/demo/src/main.ts` adds `beforeunload` once and a 30 s demo clock once — bounded,
by design. A builder doing the same would leak one listener per mount.

### L4 — Singleton accumulation · **rule, no current violation**

`AnimationsService` keeps `records: Map<HTMLElement, AnimationRecord>` and `scopes`.
`mount(node)` adds, `unmount(node)` removes. Nothing in the demo calls `unmount`, so a page
that animates nodes and is swapped away leaves entries behind. The masonry payload carries
no `animation` attribute today (measured: 0 nodes), which is why L2 is not this.

### Not leaks

- `<style>` growth on first visit of a component — one sheet per component, cached.
- Handlers on nodes that are replaced — they die with the node.
- `window.__app`, `__emitter`, `__demoModal`, `message`'s `config.element` — deliberate demo
  handles pinning exactly one tree.
- Listener counts per navigation (`a.tier-*`: 178 adds / 0 removes) — those anchors are
  discarded, not retained.

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

Census runs in the browser console (Chrome CDP), no dependency needed. Start the demo with
`npm --workspace @aio-ui/example-demo run dev -- --host 127.0.0.1 --port 5210 --strictPort`,
paste this **before** the app boots (DevTools → Sources → snippet reload, or an init script),
then navigate:

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
const si = window.setInterval;
window.__iv = [];
window.setInterval = function (fn, ms) {
  const id = si.apply(window, arguments);
  window.__iv.push(id);
  return id;
};
// after N navigations, in the console:
({
  listeners: [...reg]
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15),
  intervals: window.__iv.length,
  nodes: document.querySelectorAll("*").length,
  styles: document.querySelectorAll("style").length,
});
```

Read it as: a counter that grows per navigation names the owner. Then, for retention, take a
`WeakRef` to the component root before navigating away, force GC (`HeapProfiler.collectGarbage`
via CDP) and count how many still `deref()` — 8/8 alive means the tree is not collectable.

Compare against a control pair (`#kitchen/badge ↔ #kitchen/getting-started`); anything near
+0.1 MB / 10 visits is noise, anything near +0.2 MB / visit is a leak.
