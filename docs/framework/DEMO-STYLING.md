# Demo styling — handover notes

Owner: the demo's visual pass is done by hand at the end, so this file records **what is
already wired, what is deliberately rough, and what is safe for you to rewrite**.

Scope: `examples/demo/src/style.css` (plus the `pageHead`/`shellPage` node tags in
`examples/demo/src/shell.ts`). Nothing here is package code — `packages/**` is untouched.

## What is already decided (structure, not taste)

| Route      | Shell                                 | Body                                                                                                                                            |
| ---------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `#kitchen` | `header.docs-top` (menu `type:"top"`) | `.docs` split → `aside` sidebar (menu `type:"sidebar"`, 13 rows in 3 tiers) + `main.docs-main` with one `tab` (Display / Cara Penggunaan / API) |
| `#product` | same top menu                         | `header.docs-head` + catalog (filters + `product` builder)                                                                                      |
| `#article` | same top menu                         | `header.docs-head` + `article` builder                                                                                                          |
| `#form`    | same top menu                         | `header.docs-head` + two `form` hosts (single + multistep) + submit log                                                                         |

Selection is the route fragment (`#kitchen/<name>`); the top menu marks the current route
with `.is-active` (the menu builder ships no active state of its own).

## Convention this file follows

- **CSS nesting** (`.guidance/mandatory/CODING_PRINCIPLES.md`): one owner block per region,
  children via `&`. Media queries stay flat at the top level so a breakpoint is easy to edit.
- **Class names**: one word, modifiers may use one dash (`.docs-aside`, `.preview-frame`,
  `.state-error`).
- **Outer elements are semantic** (`.guidance/rules.md`): `header.docs-top`,
  `header.docs-head`, `main.docs-main`, plus the `aside`/`nav` the builders create.
  `.docs` itself is a plain `div` — a layout box between header and main, nothing else.
- **Tokens first**: `--app-*` everywhere; raw hex only where no token exists (see below).

## Deliberately rough — yours to replace

1. **Spacing/typography rhythm.** `.page` uses `--app-padding-layout` + `--app-gap` only.
   The docs head is `1.6rem`; the tab/panel gaps (`.75rem`) are guesses.
2. **Preview frame height.** `.preview-frame` is sized by its content; `.is-stage`
   allocates `min-height: 220px` for rows that have no height of their own (`stage: true`
   in `manifest.ts` → `fab-menu`, `modal`). No measurement is done — space is reserved.
   The 220px is arbitrary; per-type heights would be nicer.
3. **Panel surfaces.** The three tab panels sit on whatever `Tab.css` gives them; no card
   is added on purpose (a nested `.card` would also bring its hover lift, which implies
   clickability a docs panel does not have).
4. **`.state` (loading / empty / error).** One box for all three so the page does not jump.
   Marked `EXTRACT → packages/styles/src/components.css`. Error colour is `#d33` because no
   error token exists yet (`--app-status-error` would be the honest place for it).
5. **Code blocks** (`.snippet`, `.form-log`) stay dark in both themes. Intentional, not
   forgotten.
6. **`.docs` between 769px and 900px** shows the aside full-width and stacked above the
   content (the split collapses at 900px, the sidebar stops being a fixed column under
   769px). Acceptable for a demo, wrong for a docs site.

## Layout facts (measured on the dev server, 1280×900)

- `.docs` = `minmax(180px,220px)` + `minmax(0,1fr)` → aside 220, main 936. No overlap
  (aside right 258 < main left 290), no horizontal overflow.
- Sidebar list is **954px** tall in an **851px** client box → `.docs-aside .nav` is
  `position: sticky` with `max-height: calc(100dvh - 2 * var(--app-gap))` and its own
  scrollbar, so the last tier stays reachable.
- Top nav is `position: static` (the package pins it `fixed`); the fab inside a preview
  frame is `absolute; z-index: 1` (the package pins it `fixed; z-index: 999999`), so only
  the theme switcher floats over the page.

## Extraction candidates (already commented `EXTRACT` in `style.css`)

| Block                                 | Destination                          | Why                                                        |
| ------------------------------------- | ------------------------------------ | ---------------------------------------------------------- |
| `.docs` grid                          | `packages/styles/src/layout.css`     | No shared class does "narrow fixed column + content" today |
| `.docs-top, .docs-aside` token bridge | `packages/styles/src/variables.css`  | `Menu.css` reads a namespace no package defines            |
| `.state`                              | `packages/styles/src/components.css` | Every app needs loading/empty/error                        |

## Package gaps that limit the styling (fix in the packages lane, not here)

- `Menu.css` reads `--surface-bg · --surface-strong · --surface-muted · --border-soft ·
--text-heading · --text-main · --text-muted · --shadow-soft · --radius-component`; **no
  package defines them**, so the demo bridges them onto `--app-*`.
- `Menu.prepare` hardcodes `navigations.id = "primary-navigations"` → two menus on one
  page produce a duplicate id.
- `TabBuilder` prints `label` and `title`; the accessible name reads "Display Display".

## Quick check

`http://localhost:5173/demo/` (the dev server you own) — four routes: `#kitchen`,
`#kitchen/<name>`, `#product`, `#article`, `#form`, each with `?theme=default|cyberpunk`.
What should hold after any styling edit: no horizontal scrollbar, the top menu marks the
current route, the sidebar scrolls to its last item, and a fab stays inside its preview
frame.
