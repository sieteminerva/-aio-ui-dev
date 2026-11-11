# Agent Rules

Working agreement for every agent in this repository. Optimise for **maximal result at minimal token cost** — execute in parallel batches and keep context small.

## 1. Ask before building

A design question costs ~200 tokens; a wrong implementation costs a rebuild.

- When a request has more than one reasonable shape, reply with a short table or 5-line sketch first and wait for go-ahead.
- Never start a refactor while a design decision is still open.

## 2. Batch reads & edits (Zero sequential loops)

Every single tool turn re-sends the entire prompt history. Minimize round-trips:

- **Use semantic_search or symbol search first** to locate definitions; never crawl directories with `list_dir`
- **Parallel reads only:** Batch all initial `read_file` and `grep_search` calls into **one single parallel turn**. Never fetch files one by one.
- **Read wide once:** Read a file once with a wide line range instead of multiple narrow reads.
- **Single edit pass:** Plan all changes for a file and apply them in one `multi_replace_string_in_file` call. Never re-read a file after editing to confirm.
- **Bounded search:** Always pipe searches (`grep -n … | head -n 30`). Never dump entire files.

## 3. Keep tool & terminal output tiny

- **CLI over browser tools:** Run Playwright via terminal (`npx playwright test <file> --reporter=line`) instead of interactive browser tools, which inject ~10 KB DOM snapshots per turn. Use browser tools only for explicit visual/geometry claims.
- **Minimal stdout:** Use `git --no-pager`, `| head`, or `| tail`. Never read lockfiles (`*-lock.*`), `dist/`, or generated artifacts.

## 4. Verify once per batch

- Run the narrowest single test file while iterating; run `npm run verify` **once** at the end of a batch.
- Never re-run a gate that already passed without code changes.

## 5. Write only what was asked

- No new docs unless requested; extend existing docs in 3–5 lines max.
- Changelog lives in the commit message, not in a file: **finding → fix → evidence**.
- Commit messages: 1 summary line + 3–6 bullets.
- **Chat replies:** No code blocks in chat after making edits; summarize what changed in 1–2 sentences.

## 6. Architecture & proof standards

- **Modules own capabilities; components only render.** If wiring feels wrong, fix the seam, not the abstraction.
- **Stylesheets:** Never `import "./X.css"` in a builder — load via `@aio-ui/core/Stylesheets` (see `docs/framework/COMPONENT-CONVENTIONS.md`).
- **Framework-agnostic components:** Publish via `config.emit?.(…)`; never import the app.
- **Objective proof:** Prove changes at the highest affected level (unit test, CLI test, or build gate). For CSS geometry claims, measure `getBoundingClientRect` / `getComputedStyle` and report exact numbers.

## 7. Session lifecycle & hard context cap (60k limit)

Long transcripts and VS Code auto-compaction trigger massive cache-miss penalties.

- **Single-file startup:** Read **only** `.guidance/project/STATUS.md` (≤ 80 lines) to start. Do **not** crawl `.guidance/mandatory/` or `plan.md` unless specifically relevant to the active task.
- **State plan briefly:** After the single parallel read turn, state your plan in 2–3 lines and execute.
- **Hard stop at ~15 turns or ~60k tokens:** Before auto-compaction triggers, stop work, update `STATUS.md` with current state + next steps, and tell the user to open a **New Chat**.
- **During & finish:** Preserve unrelated user edits; record architectural decisions in `.guidance/project/DECISIONS.md`; report honestly what was proven and what remains unproven.

## 8. Language

- Conversation matches the user's language (Indonesian or English).
- All repo artifacts stay **English** (source, identifiers, comments, JSDoc, docs, copy) unless explicitly requested otherwise.

## 9. Work tracking: plan → queue → status

One item lives in **exactly one** file. Never duplicate, never append history.

| File                              | Holds                                                   | Shape                                                                  |
| --------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------- |
| `.guidance/plan*.md`              | **why** — objective, decisions, stages, long-term order | `plan.md` index (§0/§4) + `plan-{framework,gallery,generator}.md`      |
| `.guidance/project/NEXT_TASKS.md` | **what next** — one queue shared by all projects        | `## Framework` / `## Gallery` / `## Generator` lanes, top line = first |
| `.guidance/project/STATUS.md`     | **what now** — at most **3** active items               | overwritten every session, ≤ 80 lines                                  |

- **Promote:** plan item → queue line when it is the next thing; queue line → `STATUS.md` when work starts.
- **Done = delete the line.** Evidence goes to the commit message (`finding → fix → evidence`) or `DECISIONS.md`; there is no "Completed" section.
- **Blocked:** stays in `STATUS.md` only while the blocker fits in one line, then returns to the queue.
- **Edit one file per state change.** Touch all three only when all three states really changed.

## 10. Checkpoint protocol (CP-3)

Context loss (compaction, new chat, second agent) is the default failure mode. Every action
category ends with **exactly three lines**, each line a **pointer** — never prose:

```
CP <n> <YYYY-MM-DD HH:mm> <band>
CHANGED → <path>:<line|symbol> (<test or command>)
PROVED  → <command> → <measured result>
NEXT    → <one action> | blocks: <none|item>
```

| Trigger (category done) | Sink                                                     |
| ----------------------- | -------------------------------------------------------- |
| probe / read batch      | `/memories/session/<task>.md` — overwrite the CP block   |
| edit batch              | same file + the task doc's `Status:` line                |
| `verify` / test gate    | git commit of the batch + the `Gate` cell in `STATUS.md` |
| handoff / pre-compact   | same file `Done / Remaining / NEXT` + `STATUS.md`        |

- **Never add a fourth line.** If it matters and does not fit, it belongs in a file — write
  the pointer instead.
- **Keep only the last 3 CPs** in the memory file (overwrite, do not append); older history
  lives in commits.
- **Commits are the only lossless trail.** A batch that passed a gate must be committed with
  `finding → fix → evidence` bullets; nothing else survives compaction intact.
- **Recovery (new chat, ≤ 3 turns):** `git log --oneline -15` + `git status --short` → view
  `/memories/session/<task>.md` → read `.guidance/project/STATUS.md`. Then state the plan.
- **Prefix:** the same 4-line `STEP 0` block sits at the top of **all 6** `AGENTS.md` files
  (root router + 5 bands). Edit all six or none — a band opened standalone must still carry it.
