# Agent Rules

Working agreement for every agent in this repository. Optimise for **maximal result at
minimal token cost** — the two are not in tension if the work is done in the right order.

## 1. Ask before building

A design question costs ~200 tokens; a wrong implementation costs a whole rebuild
(both `Table.css` and the lazy-stylesheet rounds were rebuilds).

- When a request has more than one reasonable shape, answer with the recommended shape
  first (a short table or a 5-line sketch) and get a go-ahead.
- Never start a refactor while a design decision is still open.

## 2. Read once, edit once

- Read the file **once** with a wide line range instead of many small reads or greps.
- Plan every edit for a file, then apply them in a single `multi_replace_string_in_file`.
- Never re-read a file you just wrote to "confirm"; the edit tool already reported where
  it landed.
- Search with `grep -n … | head`, not by dumping files.

## 3. Verify once per batch

- One `npm run verify` at the end of a batch, not after every edit.
- Run a single test file only while iterating on that file.
- Never re-verify what a previous gate already proved.

## 4. Keep tool output small

- Browser tools return a full DOM snapshot (~10 KB) on **every** call, so: one
  `run_playwright_code` with a single `evaluate` that returns a few scalars, instead of
  `read_page`/`click_element`/screenshot chains. Screenshot only for a visual question.
- Print line numbers, not file contents. `git --no-pager`, `| head`, `| tail`.
- No `cat` of generated artifacts or lockfiles.

## 5. Write only what was asked

- No new documentation unless requested. When a doc already exists, extend it in 3–5 lines.
- Changelog rows in `plan.md`: **finding → fix → evidence**, 2–3 sentences. Not a
  paragraph per file.
- Commit messages: a summary line plus 3–6 bullets. No essays.
- No code blocks in chat; make the edit and describe it in one sentence.

## 6. Respect the architecture already there

- A capability lives in a **module**; a component only renders. If the wiring feels wrong,
  the seam is missing, not the abstraction.
- Never `import "./X.css"` in a builder — sheets load through `@aio-ui/core/Stylesheets`
  (see `docs/COMPONENT-CONVENTIONS.md`).
- Components stay framework-agnostic: publish through `config.emit?.(…)`, never import the
  app.

## 7. Prove it where it runs

- A change is done when it is proven at the highest level it affects: unit test for a rule,
  browser for a visual or lifecycle claim, gate for the whole tree.
- Measure geometry for CSS claims (`getBoundingClientRect`, `getComputedStyle`) — "looks
  right" is not evidence.
- State the numbers in the report (counts, positions, payload keys), not adjectives.

## 8. Start a new session per phase

Long transcripts are the single largest recurring cost. `plan.md` plus repository memory is
enough context to restart; do not re-explore the tree to rebuild history.

## 9. Session start and finish

Merged from `.guidance/mandatory/AGENT_RULES.md`, which no longer exists — one rules file
for the repo, this one.

**Before starting:** read `.guidance/mandatory/` (they hold the standing principles), then
`.guidance/project/STATUS.md` and `NEXT_TASKS.md`, then state the plan in 2–3 lines. Inspect
existing code and conventions instead of re-deriving them.

**During work:** focused changes; preserve unrelated user edits; avoid destructive
operations; when architecture changes, write the decision down (`plan.md` §Decisions, or
`.guidance/project/DECISIONS.md`).

**Before finishing:** run the narrowest relevant validation (one test file while iterating,
`npm run verify` per batch), record what changed and what is still open, and report the
result honestly — including what was **not** proven.

## 10. Language

- User prompts may be Indonesian or English; conversation follows the user's language.
- Every artifact stays **English**: source, identifiers, comments, JSDoc, documentation,
  generated content, user-facing project copy.
- Indonesian only when the user explicitly asks for it in that artifact.
