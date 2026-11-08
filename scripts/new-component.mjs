#!/usr/bin/env node
/**
 * Component scaffolder.
 *
 * Copies `templates/component/*.tpl` into a new package and substitutes the name
 * tokens. Deliberately dependency-free and deterministic, so the same script can be
 * lifted into the `aio-kit` CLI: `aio-kit new component <name>` is this file plus an
 * argv parser.
 *
 * Usage:
 *   node scripts/new-component.mjs badge
 *   node scripts/new-component.mjs promo-banner --title "Promo Banner" --no-test
 *   node scripts/new-component.mjs badge --force
 *   node scripts/new-component.mjs badge --dry
 *
 * Tokens written into the output:
 *   __PASCAL__  Badge        class + file name
 *   __CAMEL__   badge        selector-token prefix (lower case)
 *   __KEBAB__   promo-banner package name, registry key, css classes
 *   __TITLE__   Promo Banner human-readable name
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE_DIR = join(ROOT, "templates", "component");
const DEFAULT_OUT = join(ROOT, "packages", "components");

const argv = process.argv.slice(2);

/** Flags that consume the next argument as their value. */
const VALUE_FLAGS = new Set(["title", "dir"]);

/** Parsed args: `{ positional: string[], flags: Map<string, string | true> }`. */
function parseArgs(list) {
  const positional = [];
  const flags = new Map();

  for (let index = 0; index < list.length; index++) {
    const arg = list[index];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const name = arg.slice(2);
    if (VALUE_FLAGS.has(name) && list[index + 1] !== undefined && !list[index + 1].startsWith("--")) {
      flags.set(name, list[index + 1]);
      index++;
    } else {
      flags.set(name, true);
    }
  }

  return { positional, flags };
}

const { positional, flags } = parseArgs(argv);
const flag = (name) => flags.get(name);

const rawName = positional[0];

if (!rawName) {
  console.error('Usage: node scripts/new-component.mjs <name> [--title "…"] [--dir path] [--no-test] [--force] [--dry]');
  process.exit(1);
}

/** `Promo Banner` / `promoBanner` / `promo_banner` all become `promo-banner`. */
function toKebab(input) {
  return input
    .replace(/['"]/g, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function toPascal(kebab) {
  return kebab
    .split("-")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

const kebab = toKebab(String(rawName));
if (!/^[a-z][a-z0-9-]*$/.test(kebab)) {
  console.error(`Invalid component name "${rawName}" — it must resolve to kebab-case (got "${kebab}").`);
  process.exit(1);
}

const pascal = toPascal(kebab);
const camel = kebab.replace(/-([a-z0-9])/g, (_, ch) => ch.toUpperCase());
const title = typeof flag("title") === "string" ? flag("title") : pascal.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
const outDir = join(typeof flag("dir") === "string" ? flag("dir") : DEFAULT_OUT, kebab);
const force = flag("force") === true;
const dry = flag("dry") === true;
const withTest = flag("no-test") !== true;

const tokens = {
  __PASCAL__: pascal,
  __CAMEL__: camel,
  __KEBAB__: kebab,
  __TITLE__: title,
};

/** Template file → output path relative to the package folder. */
const PLAN = [
  { from: "Component.ts.tpl", to: `${pascal}.ts`, always: true },
  { from: "Component.css.tpl", to: `${pascal}.css`, always: true },
  { from: "Component.test.ts.tpl", to: join("__tests__", `${pascal}.test.ts`), always: false },
  { from: "package.json.tpl", to: "package.json", always: true },
  { from: "README.md.tpl", to: "README.md", always: true },
];

function fill(text) {
  return Object.entries(tokens).reduce((out, [token, value]) => out.split(token).join(value), text);
}

const available = readdirSync(TEMPLATE_DIR);
const missing = PLAN.filter((entry) => !available.includes(entry.from));
if (missing.length) {
  console.error(`Template folder is incomplete: missing ${missing.map((m) => m.from).join(", ")}`);
  process.exit(1);
}

if (existsSync(outDir) && !force) {
  console.error(`Refusing to overwrite an existing folder: ${relative(ROOT, outDir)} (use --force)`);
  process.exit(1);
}

const written = [];
for (const entry of PLAN) {
  if (!entry.always && !withTest) continue;
  const target = join(outDir, entry.to);
  const content = fill(readFileSync(join(TEMPLATE_DIR, entry.from), "utf8"));
  written.push([target, content]);
  if (dry) continue;
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, "utf8");
}

const list = written.map(([target]) => `  ${relative(ROOT, target)}`).join("\n");

if (dry) {
  console.log(`Would write into ${relative(ROOT, outDir)}:\n${list}`);
  process.exit(0);
}

console.log(`Created ${relative(ROOT, outDir)}:\n${list}`);

console.log(`
Next steps — three places must know the component by name:

1. packages/core/src/types/registry.ts
     ${kebab}: any;

2. host asset map (e.g. examples/demo/src/registry.assets.ts)
     modules: { "@aio-ui/${kebab}/${pascal}": () => import("@aio-ui/${kebab}/${pascal}"), … }
     styles:  { "@aio-ui/${kebab}/${pascal}.css": () => import("@aio-ui/${kebab}/${pascal}.css?inline"), … }

3. declare it on a node, or in the host's component table
     { builder: ["${kebab}"] }
`);

if (flag("install") === true) {
  console.log("Run `npm install` so the workspace link for @aio-ui/" + kebab + " exists.");
}
