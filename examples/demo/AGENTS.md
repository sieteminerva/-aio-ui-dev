> **STEP 0 — memory recovery + claim (mandatory, first action of any session):** `git log --oneline -12`,
> then `git status --short`, then open the active checkpoint — `/memories/session/<task>.md`,
> falling back to `.guidance/project/STATUS.md`. **Then read the claim board
> `.guidance/project/AGENTS.md` and take your row before the first edit** — overlapping a live row
> is a stop-and-ask, not an override. Only then plan. Every finished action category leaves
> **3 pointer lines** (`CHANGED →`, `PROVED →`, `NEXT →`); see `.guidance/AGENT_RULES.md` §10
> (checkpoint) and §11 (claims).

# AGENTS.md — Demo showcase (part of the Framework band)

Source rules live in `packages/AGENTS.md`; **read that first.** This file only adds demo specifics.

- Routes by component kind: `#kitchen` (element rows from `src/manifest.ts`), `#product`
  (page-level composition), `#article` (builder-level slots), `#form` (schema).
- Docs routes: `#getting-started` (setup + the AioApp contract, single column) and `#modules`
  (one row per module package, sidebar + docs; selects in the fragment like `#kitchen/<name>`).
  Neither page writes documentation: `src/modules.ts` imports each package README with `?raw`,
  `getting-started.ts` imports `docs/framework/APP.md`, and the `markdown` builder renders both.
  Edit the `.md` file, not the page.
- Any Markdown file read this way must live under the repo root; `?raw` outside `examples/demo`
  works because Vite allows the workspace root, and it is resolved at build time (no fetch).
- Pages are registered in `src/main.ts` via `pageComponent(path, css)` = `{ path, stylesheet,
config, schema }`. Element rows use `schema: data`.
- A component is demonstrated in **exactly one** place — never duplicate a route in the kitchen.
- Run: `npm run dev:demo` (from repo root). Build: `npm run build:demo`.
