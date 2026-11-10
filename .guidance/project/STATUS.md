# Project Status — what now

> **Rule:** maximum **3** active items, ≤ 80 lines, **overwritten** every session — never appended.
> Lifecycle: `plan.md` (why) → `NEXT_TASKS.md` (queue) → **this file** (what now). See `AGENT_RULES.md` §9.

Last updated: 2026-11-11

## Active (max 3)

| #   | Task                      | Project   | State                        | Gate                                                                               |
| --- | ------------------------- | --------- | ---------------------------- | ---------------------------------------------------------------------------------- |
| 1   | Publish test tag `v0.1.0` | Generator | artefacts ready, tag pending | `sieteminerva/-aio-ui-dev@v0.1.0` resolves via jsDelivr; site opens from the CDN    |
| 2   | —                         | —         | —                            | —                                                                                  |
| 3   | —                         | —         | —                            | —                                                                                  |

## Blocked

- **Official release** waits for the four manual model references (`gallery` exists;
  `profile`, `store`, `blog` do not). Test tags are allowed before then.

## Open questions

- None. The `wire()` placement question is settled: generator-side, no new `@aio-ui/*` API.
