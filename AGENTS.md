# AGENTS.md — Rajutan / AIO UI (root router)

One monorepo, four working bands. **Start here, then open the band's `AGENTS.md`.**

| Band             | Folders                           | Read                                                 |
| ---------------- | --------------------------------- | ---------------------------------------------------- |
| Framework + Demo | `packages/**`, `examples/demo/**` | `packages/AGENTS.md`, then `examples/demo/AGENTS.md` |
| Gallery          | `examples/gallery/**`             | `examples/gallery/AGENTS.md`                         |
| Generator        | `orchestrator/**`                 | `orchestrator/AGENTS.md`                             |
| Tooling          | `scripts/**`                      | `scripts/AGENTS.md`                                  |

## Start-of-task protocol (cheap context)

1. Name the band you are in (one line) and read **only** that band's `AGENTS.md`.
2. Then read **only** the docs the band file links. Do **not** crawl `.guidance/` or other
   bands' folders "just to orient".
3. State a 2–3 line plan, then act. Ask before any multi-step refactor.

## Universal hard rules (every band)

- Import map must be `{ "imports": {…} }`; every package root **and** every exact `exports`
  subpath must be mapped (a prefix cannot add `.js`).
- A builder node key must be a **real tag** (`div#masonry`), never the builder word.
- Form sub-module refs need `export: "<symbol>"`, or the registry resolves the class.
- Gate before finishing: `npm run verify`
  (build 37 pkgs → typecheck → bounds → api → version → tests → examples).
- Answer in **Bahasa Indonesia**; repo artifacts (code, comments, docs, copy) stay **English**.

## Where the "why" lives

- Decisions / history / rationale: `.guidance/` (`plan*.md`, `DECISIONS.md`, `RAJUTAN.md`).
  Open only when a band file links to it.
- Working rules & token discipline: `.guidance/AGENT_RULES.md`.
- Current status: `.guidance/project/STATUS.md` (read at session start, ≤ 80 lines).
