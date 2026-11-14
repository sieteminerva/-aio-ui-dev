# Agent claim board

> **Not a band router.** Band rules live in the six `AGENTS.md` files named by the root router.
> This file is the shared write-lock table for concurrent agents: read it in `STEP 0`, add your
> row **before the first edit**, drop it at handoff. Rules: `.guidance/AGENT_RULES.md` §11.

## Live claims

_No live writer. Add a row here before your first edit — see the rules below._

## Row shape

| Column      | Fill with                                                                                                 |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| Agent       | Short identity + batch tag (`copilot b13`, `claude a7`). Two rows with the same agent must differ.        |
| Band        | One of `Framework`, `Gallery`, `Generator`, `Tooling` — the band whose `AGENTS.md` you are working under. |
| Task        | One line, the same wording as the `STATUS.md` `Active` row where there is one.                            |
| Write scope | Paths or globs you will write. Be exact: a broad glob blocks everyone. Read-only paths stay out.          |
| Started     | `YYYY-MM-DD` of the first edit, not of the conversation.                                                  |
| Checkpoint  | `/memories/session/<task>.md`, or `.guidance/project/STATUS.md` when no memory file exists yet.           |
| State       | `active`, `blocked` (say on what in the task cell), `handoff` (edit done, gate/commit pending).           |

## Rules

1. **Claim before editing.** A session with no row is a session with no write permission.
2. **Overlap = stop.** If your scope intersects a live `active` or `blocked` row, do not edit.
   Quote both rows to the user and ask. Overriding needs the other row at `handoff` **and** two
   `git status --short` checks that prove the tree idle.
3. **Refresh every checkpoint.** State and task line, same row — never a second row.
4. **Dead claim.** Untouched for more than one day with no matching `git status` movement: prove
   idleness twice, then rewrite the row into your own. One row per scope, always.
5. **Drop at handoff.** When the batch is committed and the report is delivered, delete the row —
   `STATUS.md` keeps the durable line, the board keeps only live writers.
6. **Board edits are not a commit.** Refresh rows freely; the board is committed with the batch
   that created or dropped the claim.
