# AGENTS.md — Demo showcase (part of the Framework band)

Source rules live in `packages/AGENTS.md`; **read that first.** This file only adds demo specifics.

- Routes by component kind: `#kitchen` (element rows from `src/manifest.ts`), `#product`
  (page-level composition), `#article` (builder-level slots), `#form` (schema).
- Pages are registered in `src/main.ts` via `pageComponent(path, css)` = `{ path, stylesheet,
config, schema }`. Element rows use `schema: data`.
- A component is demonstrated in **exactly one** place — never duplicate a route in the kitchen.
- Run: `npm run dev:demo` (from repo root). Build: `npm run build:demo`.
