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

- **Batch 18 (2026-11-13):** anti-FOUC gate reconnected. `applyHold()` had **no caller anywhere in
  the repo history**, so only the release half ran: `[data-hydrating]` never matched, the shimmer
  CSS was dead, and the freeze rested entirely on the registry's preload. `create()` now asks the
  stylesheet seam (`isStylesheetPending`) and holds its own root only while *that component's*
  sheet is missing, releasing from the same `ensureStylesheet()` promise — a builder no registry
  ever sees heals itself. 12 new tests; gate: 604 pass / 1 skip.
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
- **Batch 15 (2026-11-13):** the suspected demo leak was real. Census over 21 navigations: DOM
  (`144–213` nodes) and CSS (`22` `<style>`, `341` rules) are bounded; the carousel leaked —
  `setInterval 4000ms` **+1 per mount, `clearInterval` never called**, the detached track advanced
  `translateX(0%)` → `translateX(-25%)` in 5 s, 8/8 roots alive after two forced GCs. Fixed by a
  `destroy()` override (+1 test, 588 pass); masonry and the form route followed in batches 16/17.
  Records and probe live in `docs/framework/APP-LIFECYCLE.md`.

_(Batches 11–14 are in `git log`; only open work stays in this file.)_

## Blocked

- **Official release** waits for all four manual model references (`gallery` exists; `store`,
  `profile`, `blog` do not). Test tags are allowed before then.

## Open questions

- Generated-site hosting (GitHub Pages vs Cloudflare Pages) — affects deployment only, not the
  preset contract.
- `plan-generator.md` §3.11 still calls `isRoot` proposed; it is implemented (`dd34f2d`). Sync the
  doc on the next generator pass.
