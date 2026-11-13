# Batch 15 brief — memory-leak trace, then the app-writing convention

Paste this file as the opening prompt of the session that executes batch 15.

## Mission

Two deliverables, in this order. **B must not start before A has an evidence-backed answer.**

**A. Trace the suspected memory leak in `examples/demo` — the root cause may live in `packages/**`.**
Not "look around for leaks": prove or disprove with numbers where retained memory comes from, and
say which package owns it.

**B. Write the official convention** for writing apps and components that do not leak: the rules, the
leak cases (each with a minimal repro) and the prevention checklist.

## Session protocol (mandatory)

1. **STEP 0** — `git log --oneline -12`, `git status --short`, read
   `/memories/session/page-level-plan.md` (CP 43), then only the band `AGENTS.md` files for the bands
   you touch.
2. **Claim** a row on `.guidance/project/AGENTS.md` before the first edit
   (`.guidance/AGENT_RULES.md` §11). An overlap with a live row is a stop-and-ask.
3. **Plan before code** — state the hypothesis list and the measurement method, and ask before any
   `packages/**` edit that changes behaviour. Prefer a probe over a fix.
4. **Gate** — `npm run verify > verify.log 2>&1; echo "exit=$?"` must be exit 0. A docs-only batch may
   skip it; a behaviour change may not.
5. **Commits** — one per area (`fix(router):`, `fix(input):`, `docs(framework):`, `chore(probe):` …).
   Artefacts in English, report to the user in Indonesian. Every checkpoint leaves
   `CHANGED →` / `PROVED →` / `NEXT →`.

## A — measure first, then read code

Environment traps that will cost an hour if forgotten:

- `node` is aliased to `winpty node.exe` and dies with "stdout is not a tty" when stdout is
  redirected → use `node.exe`.
- Vite 8 dev binds `[::1]` only; start the demo with
  `npm --workspace @aio-ui/example-demo run dev -- --host 127.0.0.1 --port 5210 --strictPort`.
- Never gate probe logic on `requestAnimationFrame`; a hidden tab freezes it and the numbers lie.

Cheapest-first method:

1. **Listener census.** Inject an init script that wraps `EventTarget.prototype.addEventListener` /
   `removeEventListener` and counts per `(target, type)`. Navigate `#kitchen/a → #kitchen/b → …` 20×,
   print the counters. A counter that grows with each navigation is the leak, and its key names the
   culprit.
2. **Timer census.** Wrap `setInterval` / `clearInterval` (and `setTimeout`) the same way. A live
   timer keeps its closure — and through it the whole DOM subtree — alive.
3. **DOM + style census.** After each cycle record `document.querySelectorAll("*").length` and
   `document.querySelectorAll("style").length`. A mount path that adds a second `<style>` per render
   (`replaceLazyCss` / `injectCssString`) shows up here immediately.
4. **Heap, only if the CDP session is reachable.** `context.newCDPSession(page)` →
   `HeapProfiler.collectGarbage` + `Runtime.getHeapUsage` before/after a fixed number of cycles; if
   snapshotting works, `HeapProfiler.takeHeapSnapshot` and count `Detached HTMLElement`. **If CDP is
   unavailable, say so in the report** and prove the case with (1)–(3). Never invent a heap number.
5. Only now read the suspects below.

Known leads (measured 2026-11-13, head `987c324`):

- **50 `addEventListener` vs 17 `removeEventListener`** across `packages/**` → enumerate the 33
  unbalanced sites and check each for a teardown path before declaring anything a leak.
- Observers: `packages/components/masonry/Masonry.ts:393` (`IntersectionObserver`, disconnects at
  524/548/659), `packages/modules/animations/Animations.ts:479` (`viewObserver`) and `:616`
  (`mutationObserver`) — verify `destroy()` really runs on a route change.
- Timers: `packages/components/carousel/Carousel.ts:556` (autoplay),
  `packages/components/product/ProductCard.ts:328` (autoplay),
  `packages/components/rating/Rating.ts:185` (counter) — check each teardown.
- **Most likely demo-side amplifier:** `examples/demo/src/pages/kitchen.ts` rebuilds the shell menus,
  the `tab` and every panel on **each fragment change**. Anything bound to `document`/`window` inside
  that render accumulates per navigation.
- Global handles that intentionally pin the last tree: `globalThis.__app`, `globalThis.__emitter`,
  `globalThis.__demoModal` (modal `onReady`), and `message`'s `config.element` container. Deliberate,
  but they belong in the doc as "keep — and know why".
- Caches to classify as bounded or unbounded: the `ComponentRegistry` builder map, the module
  loader's import cache, `HttpService` (whole envelope per query), `AppStorage`.

Report shape for A — one table, no prose:

| Symptom | Evidence (counter / heap numbers) | Owner (`packages/x` file:line or `examples/demo`) | Verdict (leak / bounded / by design) | Action |

Nothing is called a leak without a number beside it.

## B — the document

- New file `docs/framework/APP-LIFECYCLE.md`, cross-linked from
  `docs/framework/COMPONENT-CONVENTIONS.md` and `docs/framework/APP.md`.
- Rules, not prose: a teardown contract (who owns a listener / observer / timer, where it is
  released), the leak cases found in A (each with a ~10-line minimal repro and its fix), a reviewer
  checklist, and a "probe" section that documents the census scripts and how to run them.
- Every example must come from this repo — no invented code, no invented file names.
- English, ≤ ~200 lines. **Docs tell the truth about the code**: if the code is wrong, fix the code
  and document the fixed contract, or document the defect as open — never document the intent.

## Out of scope

- Moving `examples/demo` (decided 2026-11-13: it stays; `packages/` is the publishable contract).
- Rewriting the router, the registry or the renderer.
- Refactors that are not caused by a measured leak.
- The open items that belong to other writers: `RAJUTAN.md`'s `.draft/preset/*` rename and the
  `plan-generator.md` §3.11 `isRoot` drift.
