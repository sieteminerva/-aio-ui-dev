# Project Status — what now

> **Rule:** maximum **3** active items, ≤ 80 lines, **overwritten** every session — never appended.
> Lifecycle: `plan.md` (why) → `NEXT_TASKS.md` (queue) → **this file** (what now). See `AGENT_RULES.md` §9.

Last updated: 2026-11-13

## Active (max 3)

| #   | Task                             | Project   | State       | Gate                                                                                      |
| --- | -------------------------------- | --------- | ----------- | ----------------------------------------------------------------------------------------- |
| 1   | Release `v0.1.1` to the live CDN | Framework | in progress | fresh tag serves 39 packages; `cdn` branch carries a README; jsDelivr probe + smoke green |
| 2   | Page-level components (P9b)      | Framework | in progress | generator emits `iPageDefinition`s; claim board in `AGENTS.md` (§11)                      |
| 3   | Build `profile` reference        | Examples  | not started | home, services, contact, portfolio render; boundaries documented                          |

## Landed recently

- **Batch 11 (2026-11-12):** release pipeline + orphan `cdn` branch + tag `v0.1.0`. The tag was
  force-moved after jsDelivr had served it, so `@v0.1.0` is frozen at the old commit — closed by
  the `v0.1.1` bump, never by moving a served tag again.
- **Batch 12 (2026-11-13):** one README skeleton for every package (COMPONENT-CONVENTIONS §1c),
  `id-address` documented as a plugin, skeleton contract test, and the demo kitchen reads the
  package READMEs instead of hand-written copy.

## Blocked

- **Official release** waits for all four manual model references (`gallery` exists; `store`,
  `profile`, `blog` do not). Test tags are allowed before then.

## Open questions

- Generated-site hosting (GitHub Pages vs Cloudflare Pages) — affects deployment only, not the
  preset contract.
- `plan-generator.md` §3.11 still calls `isRoot` proposed; it is implemented (`dd34f2d`). Sync the
  doc on the next generator pass.
