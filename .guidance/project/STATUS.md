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

- **Batch 24 (2026-11-14):** CSS house style enforced. `Skeleton.css` was the only flat sheet in
  the tree — rewritten as one root selector (`.skeleton`) with every shape nested (`&.skeleton-bone`).
  The trap that came out of it is now written down in the root `AGENTS.md` and `.guidance/rules.md`:
  **Sass-style `&-suffix` is dropped silently by the build** (the rules vanished from the bundle and
  nothing warned), so nesting is `& .child` / `&.modifier` / `&:state` only. Gate: 656 pass / 1 skip.
- **Batch 23 (2026-11-14):** the `isRoot` debt closed. The swap shipped in `dd34f2d`
  (`DOMRenderer.buildStructure` replaces the host with the builder root, `onCreated` keeps it,
  metadata adopted); what was missing was the fallback's voice and the paper trail.
  `warnMissingRoot()` warns once per builder name in dev; `APP.md` gained the rule table,
  `packages/AGENTS.md` is now "decided and implemented", `plan-generator.md` §3.11 answers its own
  four questions, `TASK-builder-array.md` unblocked — the generator may emit `isRoot: true`.
- **Batch 22 (2026-11-14):** skeleton config. `duration: number | "auto"` (`"auto"` releases with
  the sheet; a number is a **floor**, published as `data-skeleton-duration` and joined with the
  sheet promise by the hold) and `className` (mockup root only). Pulse speed renamed
  `--skeleton-pulse`. Same knobs on `SkeletonBuilder`.
- **Batch 21 (2026-11-14):** `loading()` coverage finished — 20 in-flow builders draw their own
  silhouette with `Skeleton.create`. The three overlays (`fab-menu`, `message`, `modal`) keep the
  shimmer on purpose: the missing sheet owns their placement. Census test
  `packages/components/skeleton/__tests__/Mockups.test.ts`. Both hosts load `Skeleton.css` eagerly.
- **Batch 20 (2026-11-14):** placeholder became the mandatory `@aio-ui/skeleton` package, the
  optional `Builder.loading?()` hook landed, the hold moved to `base/BaseAdapters/Hydration`
  (core's `Stylesheets` is loader-only), and the teardown pin became registry-only.
- **Batches 15–19 (2026-11-13):** anti-FOUC gate collapsed (family → `0.2.0`), three leak classes
  and L6 closed with measurements (`APP-LIFECYCLE.md` L1/L2/L5/L6), `#form` docs synced.

_(Everything before batch 15 is in `git log`; only open work stays in this file.)_

## Blocked

- **Official release** waits for all four manual model references (`gallery` exists; `store`,
  `profile`, `blog` do not). Test tags are allowed before then. The tree is at `0.2.0`; the
  last published tag is `v0.1.1`.

## Open questions

- Generated-site hosting (GitHub Pages vs Cloudflare Pages) — affects deployment only, not the
  preset contract.
