# Component template

The skeleton behind every new component, plus the generator that stamps it out.
Conventions the output follows: [`COMPONENT-CONVENTIONS.md`](./COMPONENT-CONVENTIONS.md).

## Files

```
templates/component/
├─ Component.ts.tpl        builder skeleton (keys, selectors, payload, prepare, template, initialize)
├─ Component.css.tpl       scoped CSS using --app-* tokens
├─ Component.test.ts.tpl   DOM-free tests (payload contract + selector coverage)
├─ package.json.tpl        workspace package manifest
└─ README.md.tpl           per-component doc: payload, nodes, wiring checklist
scripts/new-component.mjs  the generator (~150 lines, no dependencies)
```

Templates are inert text: `.tpl` files are not compiled, not typechecked, and not
included by Vitest (`packages/**/*.test.ts`). Nothing in `templates/` can break the build.

## Placeholders

| Token        | `my-widget` becomes | Used for                                 |
| ------------ | ------------------- | ---------------------------------------- |
| `__PASCAL__` | `MyWidget`          | file name, class name, `iMyWidgetConfig` |
| `__CAMEL__`  | `myWidget`          | selector-token prefix (`@myWidget>item`) |
| `__KEBAB__`  | `my-widget`         | package name, registry key, CSS classes  |
| `__TITLE__`  | `My Widget`         | comment headers and the README title     |

Substitution is a plain `split/join` over the four tokens — no templating engine, so the
files stay readable in the editor.

## Usage

```bash
node scripts/new-component.mjs badge
node scripts/new-component.mjs promo-banner --title "Promo Banner"
node scripts/new-component.mjs badge --dry          # print the file plan, write nothing
node scripts/new-component.mjs badge --no-test      # skip __tests__/
node scripts/new-component.mjs badge --force        # overwrite an existing folder
node scripts/new-component.mjs badge --dir /tmp/x   # somewhere other than packages/components
```

The name is normalised: `Promo Banner`, `promoBanner` and `promo_banner` all become
`promo-banner` → `PromoBanner`.

Output:

```
Created packages/components/badge:
  packages/components/badge/Badge.ts
  packages/components/badge/Badge.css
  packages/components/badge/__tests__/Badge.test.ts
  packages/components/badge/package.json
  packages/components/badge/README.md

Next steps — three places must know the component by name: …
```

## What the generator does not do

It creates files; it does not edit yours. Three registrations stay manual on purpose —
each one is a decision, not a copy-paste:

| Where                                                       | What to add                                                          |
| ----------------------------------------------------------- | -------------------------------------------------------------------- |
| `packages/core/src/types/registry.ts`                       | `badge: any;` in `iBuilderRegistry` (the `builderId` must typecheck) |
| Host asset map, e.g. `examples/demo/src/registry.assets.ts` | `modules` + `styles` entries with **static** specifiers              |
| Content or demo table                                       | `builder: "badge"` on the node it _is_, or a demo manifest row       |

Then `npm install` once so the workspace link for `@aio-ui/<kebab>` exists (new package
folders are picked up by the `packages/components/*` workspace glob).

## Lifting this into `aio-kit`

The generator is deliberately self-contained: argv parsing + token substitution + `fs`
calls. A CLI wrapper only has to decide _where_ the templates live and _where_ the output
goes.

```js
// aio-kit: commands/new-component.js
import { cpSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const TOKENS = (kebab, pascal, camel, title) => ({
  __PASCAL__: pascal,
  __CAMEL__: camel,
  __KEBAB__: kebab,
  __TITLE__: title,
});

export function newComponent({ name, cwd, templatesDir, targetDir }) {
  const kebab = name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
  const pascal = kebab
    .split("-")
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join("");
  const camel = kebab.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
  const out = join(cwd, targetDir ?? "packages/components", kebab);

  if (existsSync(out) && !force) throw new Error(`${out} already exists`);

  for (const [from, to] of [
    ["Component.ts.tpl", `${pascal}.ts`],
    ["Component.css.tpl", `${pascal}.css`],
    ["Component.test.ts.tpl", join("__tests__", `${pascal}.test.ts`)],
    ["package.json.tpl", "package.json"],
    ["README.md.tpl", "README.md"],
  ]) {
    const text = readFileSync(join(templatesDir, from), "utf8");
    const filled = Object.entries(TOKENS(kebab, pascal, camel, name)).reduce(
      (acc, [token, value]) => acc.split(token).join(value),
      text,
    );

    const target = join(out, to);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, filled, "utf8");
  }
}
```

Two integration notes:

- Ship `templates/component/` inside the CLI package (e.g.
  `packages/cli/templates/component/`) and resolve it relative to `import.meta.url`, not
  to `process.cwd()` — otherwise a global install looks for templates in the user's repo.
- If the CLI should also patch the three registration points, do it with an AST (or a
  marker comment) rather than a regex over the whole file. The registry map is a single
  interface and can be caught with one anchored replace; `manifest.ts` should not be.

## Proven output

`packages/components/badge/` is exactly what the generator produces (running
`node scripts/new-component.mjs badge --title "Badge"`), wired into the demo table. It
typechecks, its 6 tests pass, and it renders as row 1 of the demo — so the template is
verified against the real registry, not just reviewed.
