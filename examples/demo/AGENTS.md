> **STEP 0 — memory recovery (mandatory, first action of any session):** `git log --oneline -12`,
> then `git status --short`, then open the active checkpoint — `/memories/session/<task>.md`,
> falling back to `.guidance/project/STATUS.md`. Only then plan. Every finished action category
> leaves **3 pointer lines** (`CHANGED →`, `PROVED →`, `NEXT →`); see `.guidance/AGENT_RULES.md` §10.

# AGENTS.md — Demo showcase (part of the Framework band)

Source rules live in `packages/AGENTS.md`; **read that first.** This file only adds demo specifics.

- Routes by component kind: `#kitchen` (element rows from `src/manifest.ts`), `#product`
  (page-level composition), `#article` (builder-level slots), `#form` (schema).
- Docs routes: `#getting-started` (setup + the AioApp contract, single column) and `#modules`
  (one row per module package, sidebar + docs; selects in the fragment like `#kitchen/<name>`).
  Their copy comes from `src/modules.ts`; nothing is hand-written in the page.
- Pages are registered in `src/main.ts` via `pageComponent(path, css)` = `{ path, stylesheet,
config, schema }`. Element rows use `schema: data`.
- A component is demonstrated in **exactly one** place — never duplicate a route in the kitchen.
- Run: `npm run dev:demo` (from repo root). Build: `npm run build:demo`.
