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
- `#form` is a **docs tree, not a single page**: `#form/<topic>` with a sidebar grouped
  Schema · Behaviour · Inputs · Wiring, and Display · Usage · API per topic. It borrows the
  `#kitchen` layout but not its data source — the form family is a subsystem (a schema contract
  plus five adapters plus three sibling packages), so no manifest row can list it.
- **A topic declares navigation only, never documentation.** `FORM_TOPICS` entries in
  `src/form/topics.ts` carry an `id`, a `label`, a `group`, the package README to read
  (`source`), the README H2s the topic claims (`sections`), and an optional live `demo`.
  Usage renders the lead + claimed sections; API renders the contract sections not claimed, so
  one README is split across the two tabs instead of copied. The tab description is the
  README's own first sentence (`leadOf`). **Prose belongs in `README.md`** — if a topic needs a
  sentence that does not exist yet, add it to the package README, not to the topic table.
- Schemas live in `src/form/schema.ts`, panels in `src/form/panels.ts`, the route controller in
  `src/pages/form.ts`. **Adding a topic = one `FORM_TOPICS` entry**; a topic with `demo: null`
  still renders its README. `__tests__/form-docs.test.ts` fails if a topic names a README or a
  heading that does not exist, if it claims every contract section (empty API tab), or if it
  sits in a group the sidebar does not render.
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
