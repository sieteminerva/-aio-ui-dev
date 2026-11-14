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

- **Batch 27 (2026-11-14):** the shared-`Config` problem closed at the source, not on the page.
  `packages/components/form/README.md` gained `## Supported syntax` with one `###` per engine
  (registering the form, validation, cascade, calculation, multistep), each carrying a runnable
  example of registration and use. `readme.ts` gained `subsectionOf()` (fence-aware H3 slice), the
  topic `sections` now accept `"<H2> > <H3>"`, and the five behaviour/wiring topics render their
  own block instead of the whole `Config` table. Skeleton default changed to a **2000 ms floor**
  (`duration: "auto"` never painted: a warm sheet settles in one microtask) in `Skeleton.ts` and
  the package README, which also explains when `"auto"` is still the right value. Gate: 668 tests
  (1 skip), demo typecheck clean, browser: each topic renders exactly one `###` + one code block.
- **Batch 26 (2026-11-14):** `#form` became a docs tree instead of one long column. The route
  now reads a fragment (`#form/<topic>`), renders the `#kitchen` shell (sidebar grouped Schema ·
  Behaviour · Inputs · Wiring, main column Display · Usage · API) and declares ten topics in
  `src/form/topics.ts`. **A topic declares navigation only**: the package README (`source`), the
  H2s it claims (`sections`) and an optional live `demo` — Usage renders lead + claimed sections,
  API renders the contract sections it did not claim, and the tab description is the README's own
  lead. No prose is written beside the READMEs. Schemas split into `src/form/schema.ts`, panels
  into `src/form/panels.ts`, the route into a `FormPage` controller that releases its builders,
  and `__tests__/form-docs.test.ts` fails on a missing README, a missing heading, an over-claimed
  topic (empty API tab) or an unrendered group. Live demos: overview, field types, validation,
  input controls, multistep; the other five show their README sections and say the demo is pending.
  Gate: 665 tests (1 skip), demo typecheck clean, browser check on every live topic and the
  README/API split.
- **Batch 25 (2026-11-14):** skeleton shape classes de-dashed. `SHAPE_CLASS` now emits bare
  `stack / row / line / bone / circle` on the same element as `.skeleton`, so the sheet writes
  `&.bone` instead of `&.skeleton-bone` and no class name needs a dash join. Rule of record
  tightened in root `AGENTS.md` + `.guidance/rules.md`: prefer the bare compound modifier. Gate:
  656 pass / 1 skip, built CSS carries `.skeleton.bone/.line/.circle/.stack/.row`.
- **Batch 24 (2026-11-14):** CSS house style enforced. `Skeleton.css` was the only flat sheet in
  the tree — rewritten as one root selector (`.skeleton`) with every shape nested (`&.bone`).
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
