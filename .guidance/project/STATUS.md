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

- **Batch 30 (2026-11-14):** a regression sweep on the docs shell, found in a browser. `Tab.css`
  reached into mounted panels with `& .menu` / `& .body`, so a dropdown popover inside a tab was
  laid out as a row, lost its entry transition and inherited the tab's border; both are now `>`
  (own nodes only), and `COMPONENT-CONVENTIONS.md` §12/§13 make that a rule and an anti-pattern.
  `input.css`: the select-mode search box no longer draws a second border, chips keep a horizontal
  inset in the frame, the datalist frame draws nothing (the input is the box) and the frame now
  measures exactly like a plain input (36.6 px, was 38.6). `Form.css`: step-button glyphs are
  square and token-sized (`calc(--input-icon-size * 0.7)`), not `width: 17%` × `20px`.
- **Batch 29 (2026-11-14):** `markdown` can render _parts_ of a document. The engine
  (`Markdown.engine.ts`, per §1b) reads invisible **part markers** (`part: id=x role=y` inside an
  HTML comment, or the reference-definition form) and exposes `outline()` + `selectOutline()`; the
  builder gained `config.outline` (`@title` / `@lead` / `#anchor` / `role:name` / `H2` / `H2 > H3`),
  `config.marker`, payload overrides, a `@markdown>section` key. No outline = the old behaviour;
  unmatched comments are dropped, markers inside fences stay source.
- **Batch 28 (2026-11-14):** the Markdown parser moved out of `@aio-ui/utilities` and into its only
  consumer (naming settled in batch 29). `@aio-ui/utilities` lost the
  `./Markdown` subpath and 13 barrel names (`api-map.json` updated, 27 → 13 utilities values).
  Nothing is published for it: the builder imports it relatively, `build-pack` rewrites the
  emitted specifier to `.js`, and the package surface stays `MarkdownBuilder` only.
- **Batch 27 (2026-11-14):** the shared-`Config` problem closed at the source. `form/README.md`
  gained `## Supported syntax` with one `###` per engine (register, validation, cascade,
  calculation, multistep), each runnable; `readme.ts` gained `subsectionOf()` (fence-aware H3
  slice), topic `sections` accept `"<H2> > <H3>"`. Skeleton default became a **2000 ms floor**
  (`"auto"` never painted: a warm sheet settles in one microtask).
- **Batch 26 (2026-11-14):** `#form` became a docs tree (`#form/<topic>`, ten topics) reusing the
  `#kitchen` shell. **A topic declares navigation only** — README `source`, claimed `sections`,
  optional live `demo`; Usage renders lead + claims, API renders the unclaimed contract, and no
  prose is written beside the READMEs. `__tests__/form-docs.test.ts` fails on a missing README,
  missing heading, over-claimed topic or unrendered group.
- **Batches 21–25 (2026-11-14):** skeleton, start to finish. 20 in-flow builders draw their own
  silhouette (`loading()`); the three overlays keep the shimmer because the missing sheet owns
  their placement. `duration: number | "auto"` became a floor published as
  `data-skeleton-duration`; shapes became bare compounds (`&.bone`, no dash join). `Skeleton.css`
  was the last flat sheet in the tree — the rewrite exposed that **Sass-style `&-suffix` is dropped
  silently by the build**, now a rule in the root `AGENTS.md` + `.guidance/rules.md`.
- **Batch 23 (2026-11-14):** the `isRoot` debt closed. The swap shipped in `dd34f2d`
  (`DOMRenderer.buildStructure` replaces the host with the builder root, `onCreated` keeps it,
  metadata adopted); what was missing was the fallback's voice and the paper trail.
  `warnMissingRoot()` warns once per builder name in dev; `APP.md` gained the rule table,
  `packages/AGENTS.md` is now "decided and implemented", `plan-generator.md` §3.11 answers its own
  four questions, `TASK-builder-array.md` unblocked — the generator may emit `isRoot: true`.
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
