# Project Status — what now

> **Rule:** maximum **3** active items, ≤ 80 lines, **overwritten** every session — never appended.
> Lifecycle: `plan.md` (why) → `NEXT_TASKS.md` (queue) → **this file** (what now). See `AGENT_RULES.md` §9.

Last updated: 2026-11-14

## Active (max 3)

| #   | Task                        | Project   | State       | Gate                                                                                            |
| --- | --------------------------- | --------- | ----------- | ----------------------------------------------------------------------------------------------- |
| 1   | Page-level components (P9b) | Framework | in progress | `isRoot` and `loading()` settled; generator must emit `isRoot: true` in `mount()` and be probed |
| 2   | Build `profile` reference   | Examples  | not started | home, services, contact, portfolio render; boundaries documented                                |
| 3   | Build `blog` reference      | Examples  | not started | home, post list, post, about render; boundaries documented                                      |

## Landed recently

- **Batch 23 (2026-11-14):** the `isRoot` debt closed. The swap itself already shipped in
  `dd34f2d` (`DOMRenderer.buildStructure` replaces the host with the builder root, `onCreated`
  keeps it, metadata adopted); what was missing was the fallback's voice and the paper trail.
  `warnMissingRoot()` now warns once per builder name in dev when a promised root never arrives
  (8th case in `DOMRenderer.isRoot.test.ts`). Docs retracted their "proposed": `APP.md` has the
  rule table, `packages/AGENTS.md` is declared and implemented, `plan-generator.md` §3.11 answers
  its own four questions, `TASK-builder-array.md` unblocked. The generator may emit
  `isRoot: true` now. Gate: 656 pass / 1 skip.
- **Batch 22 (2026-11-14):** the skeleton got its two knobs. `duration: number | "auto"` —
  `"auto"` (default) releases with the component's sheet, a number is a **floor** so a fast
  sheet cannot flash the mockup (the hold joins it with the stylesheet promise via
  `Promise.all`; `Skeleton.create` publishes it as `data-skeleton-duration`). `className` puts
  the host's own class on the mockup root only. Pulse speed renamed to `--skeleton-pulse` so
  "duration" means one thing. Same config on `SkeletonBuilder` (`duration`, `className`),
  spec/payload winning over it. Gate: 655 pass / 1 skip.
- **Batch 21 (2026-11-14):** `loading()` coverage finished. Every in-flow builder now draws
  its own silhouette (20 builders; `ProductCard` and `Table` already had one) — accordion,
  article, badge, carousel, code-block, footer, form, input, markdown, masonry, menu,
  mode-switcher, pricing-card, product-card/-grid/-detail, rating, section, tab, table. The
  three overlays (`fab-menu`, `message`, `modal`) stay on the shimmer **on purpose**: the sheet
  that is missing is also the sheet that owns their placement. Census test
  `packages/components/skeleton/__tests__/Mockups.test.ts` (23 cases) locks both lists, and the
  gallery host loads `Skeleton.css` eagerly like the demo. Gate: 648 pass / 1 skip.
- **Batch 20 (2026-11-14):** the placeholder became a component, and the teardown pin moved
  into the registry. New mandatory package `@aio-ui/skeleton` (`Skeleton.create` +
  `SkeletonBuilder`, sheet loaded with the app shell) and a new optional hook
  `Builder.loading?()`: a component draws its own silhouette while its own sheet is missing,
  `holdUntilStyled(root, spec, mockup)` hides the real direct children and restores them when
  the loader settles; the shimmer skin stays as the fallback. The hold moved out of core into
  `base/BaseAdapters/Hydration` — core keeps only `ensureStylesheet`/`isStylesheetPending`.
  Token `--app-skeleton-bg` in all three `variables.css` blocks. Examples: `ProductCard`,
  `Table`. `BUILDER_INSTANCE`/`attachBuilder` now live in `core/Registry/BuilderInstances` and
  are written by **`ComponentRegistry.build()` only** — a standalone builder never pays for a
  pin nobody sweeps. Gate: 625 pass / 1 skip, 40 packages, 40 surfaces.
- **Batch 19 (2026-11-13):** anti-FOUC gate collapsed; `#form` docs synced; the
  `#kitchen/<name>` teardown path closed. `HydrationGate`, `Builder.hydration`/`isLoaded`,
  `BuilderPort.releaseHydration` and the registry's `_stylesReady`/`_stylesLoading` ledger are
  gone — a public API break, so the family moved **0.2.0**. `Builder.create()` pins the instance
  on its root, `releaseBuilders()` destroys every pinned builder in a subtree, `AioApp` releases
  the controller on **every** replacing pass and sweeps the outgoing shell at paint. Probe:
  interval 1 → 0, 0 document listeners, 0 of 6 page roots alive after 6 switches + 2 GCs.
- **Batch 18 (2026-11-13):** anti-FOUC gate reconnected. `applyHold()` had **no caller
  anywhere in the repo history**, so only the release half ran: `[data-hydrating]` never
  matched, the shimmer CSS was dead, and the freeze rested entirely on the registry's
  preload. `create()` asked the stylesheet seam and held its own root only while _that
  component's_ sheet was missing. 12 tests; gate: 604 pass / 1 skip.
- **Batches 15–17 (2026-11-13):** three demo leak classes closed with numbers — carousel's
  `setInterval` never cleared (`destroy()` override), masonry's 21 live instances pinned by a
  `document` keydown listener (listener moved to the modal), form's 60 live `document`
  listeners from `Dropdown` (bound only while open). Records: `APP-LIFECYCLE.md` L1, L2, L5.

_(Batches 11–14 are in `git log`; only open work stays in this file.)_

## Blocked

- **Official release** waits for all four manual model references (`gallery` exists; `store`,
  `profile`, `blog` do not). Test tags are allowed before then. The tree is at `0.2.0`; the
  last published tag is `v0.1.1`.

## Open questions

- Generated-site hosting (GitHub Pages vs Cloudflare Pages) — affects deployment only, not the
  preset contract.
