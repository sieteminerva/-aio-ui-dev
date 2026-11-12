# Project Status — what now

> **Rule:** maximum **3** active items, ≤ 80 lines, **overwritten** every session — never appended.
> Lifecycle: `plan.md` (why) → `NEXT_TASKS.md` (queue) → **this file** (what now). See `AGENT_RULES.md` §9.

Last updated: 2026-11-13

## Active (max 3)

| #   | Task                        | Project   | State       | Gate                                                                        |
| --- | --------------------------- | --------- | ----------- | --------------------------------------------------------------------------- |
| 1   | Page-level components (P9b) | Framework | in progress | generator emits `iPageDefinition`s; docs still call `isRoot` proposed       |
| 2   | Build `profile` reference   | Examples  | not started | home, services, contact, portfolio render; boundaries documented            |
| 3   | Build `blog` reference      | Examples  | not started | home, post list, post, about render; boundaries documented                  |

## Landed recently

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
