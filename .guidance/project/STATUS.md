# Project Status — what now

> **Rule:** maximum **3** active items, ≤ 80 lines, **overwritten** every session — never appended.
> Lifecycle: `plan.md` (why) → `NEXT_TASKS.md` (queue) → **this file** (what now). See `AGENT_RULES.md` §9.

Last updated: 2026-11-11

## Active (max 3)

| #   | Task                           | Project  | State       | Gate                                                                        |
| --- | ------------------------------ | -------- | ----------- | --------------------------------------------------------------------------- |
| 1   | Build `store` manual reference | Examples | in progress | catalog, product, cart, checkout render in a browser with a real data shape |
| 2   | Build `profile` reference      | Examples | not started | home, services, contact, portfolio render; boundaries documented            |
| 3   | Build `blog` reference         | Examples | not started | home, post list, post, about render; boundaries documented                  |

## Blocked

- **Official release** waits for all four manual model references (`gallery` exists; `store`,
  `profile`, `blog` do not). Test tags are allowed before then.

## Open questions

- Generated-site hosting (GitHub Pages vs Cloudflare Pages) — affects deployment only, not the
  preset contract.
