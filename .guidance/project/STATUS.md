# Project Status — what now

> **Rule:** maximum **3** active items, ≤ 80 lines, **overwritten** every session — never appended.
> Lifecycle: `plan.md` (why) → `NEXT_TASKS.md` (queue) → **this file** (what now). See `AGENT_RULES.md` §9.

Last updated: 2026-11-13

## Active (max 3)

| #   | Task                        | Project   | State       | Gate                                                                  |
| --- | --------------------------- | --------- | ----------- | --------------------------------------------------------------------- |
| 1   | Page-level components (P9b) | Framework | in progress | generator emits `iPageDefinition`s; docs still call `isRoot` proposed |
| 2   | Build `profile` reference   | Examples  | not started | home, services, contact, portfolio render; boundaries documented      |
| 3   | Build `blog` reference      | Examples  | not started | home, post list, post, about render; boundaries documented            |

## Landed recently

- **Batch 17 (2026-11-13):** form-route leak closed. The census split the two suspects: the
  `id-address` Apps Script fetches settle (0 aborted, ≤2 in flight, 0 pending timers) while
  **60 live `document` listeners** (6 dropdowns × 2 × 5 visits) pinned every form. `Dropdown`
  now binds the outside-close listener only while the menu is open and listens for box clicks
  on the live node, so a closed widget owns no global; after the fix 0 document listeners
  remain, the form subtree is collectable, and two 10-visit blocks add +0.17 / +0.10 MB
  (was +0.24/visit). Gate: 592 pass.
- **Batch 16 (2026-11-13):** masonry leak closed. Heap snapshot retainer path named the anchor:
  `document.addEventListener("keydown", handleKeyDown)` in `_initModal` — the closure captures
  `this`, so **21 instances** stayed alive (~260 KB per visit). Listener moved onto the modal
  overlay (`tabindex="-1"`), pinned by a test; after the fix 10 visits move the heap **−0.19 MB**
  and one instance is live. Keyboard still works (`ArrowRight`/`Escape`). Gate: 589 pass.
- **Batch 15 (2026-11-13):** the suspected demo leak is **real and partly fixed**. Census over 21
  +66 route navigations: DOM (`144–213` nodes) and CSS (`22` `<style>`, `341` rules) are bounded;
  the carousel was the leak — `setInterval 4000ms` **+1 per mount, `clearInterval` never called**,
  the detached track advanced `translateX(0%)` → `translateX(-25%)` in 5 s, 8/8 roots alive after
  two forced GCs. Fixed by a `destroy()` override (+1 test, 588 pass). Masonry is still open:
  **~250 KB per visit, 8/8 roots alive, no timer/observer/style growth — retainer unidentified**.
  Records and probe live in `docs/framework/APP-LIFECYCLE.md`.
- **Batch 14 (2026-11-13):** `#kitchen` covers 18 of the 22 components (the other four own a route
  or are a plugin); `scripts/AGENTS.md` now states the real 39-package count and the
  never-move-a-served-tag rule; the table README documents `{ text, options }` — the old
  `{ value, className }` example printed `[object Object]`.
- **Batch 13 (2026-11-13):** tag `v0.1.1` at `5a7fc27` is live (39 packages, 42 release assets,
  7/7 probes `200`, CDN smoke green); the `cdn` branch now carries a generated README; six
  other-writer files committed; claim board added to `.guidance/project/AGENTS.md` (§11).
- **Batch 12 (2026-11-13):** one README skeleton for every package (COMPONENT-CONVENTIONS §1c),
  `id-address` documented as a plugin, skeleton contract test, and the demo kitchen reads the
  package READMEs instead of hand-written copy.
- **Batch 11 (2026-11-12):** release pipeline + orphan `cdn` branch + tag `v0.1.0`. That tag was
  force-moved after jsDelivr had served it and is frozen at the old commit — the reason `v0.1.1`
  exists. Never move a served tag again.

## Blocked

- **Official release** waits for all four manual model references (`gallery` exists; `store`,
  `profile`, `blog` do not). Test tags are allowed before then.

## Open questions

- Generated-site hosting (GitHub Pages vs Cloudflare Pages) — affects deployment only, not the
  preset contract.
- `plan-generator.md` §3.11 still calls `isRoot` proposed; it is implemented (`dd34f2d`). Sync the
  doc on the next generator pass.
