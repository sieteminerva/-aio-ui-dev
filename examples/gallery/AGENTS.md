# AGENTS.md — Gallery band (`examples/gallery/**`)

The **profile model** example: a portfolio/work-archive webapp and the first generated-profile
target for the Rajutan generator.

## What it is

Personal portfolio archive, a living AIO UI example, and an integration test for the future
`aio new --type profile`. Preserve personal history, visual character, and the link between
design/software/making/music — do **not** reduce it to a generic template.

## Layout & content

- Page content is `iNodeContent` objects rendered through `DOMRenderer`.
- Content/copy lives in `src/content/` (`copy.md`); pages in `src/pages/`.
- Read `docs/framework/DOMRenderer.md` only when changing the content schema or renderer behaviour.
- Uses `article`, `masonry`, `form`, `table`, `rating` components.

## Commands

```bash
npm run dev      # gallery is the default dev target (from repo root)
npm run build    # gallery build (from repo root)
```

## Requirements

- Must be mobile-first (`clamp()` typography) for a middle-to-low-education audience.
- Provide both dark and light themes; keep animations consistent with the rest of the site.
- The multistep, paragraph-driven form is the main course — style it to match the site.
- Future i18n: English and Indonesian content objects kept consistent.

## Active roadmap

`store` (in progress) → `profile` → `blog` manual model references. See
`.guidance/project/NEXT_TASKS.md` (Gallery lane) and `.guidance/project/STATUS.md`. Official
release waits for all four models (`gallery`, `store`, `profile`, `blog`).

## Do NOT read by default

`docs/generator/apps-script-integration.md`, `orchestrator/**`, `packages/**` internals — unless a task genuinely
crosses into the framework or generator.
