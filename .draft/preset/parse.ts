/**
 * PRESET VALIDATOR — the gate between AI output and a generated site.
 *
 * `plan()` assumes the document is well-formed; this module is what guarantees
 * that. It checks two different things and keeps them apart:
 *
 * 1. **Shape** — the document matches `iWebPreset` v1 (strings where strings
 *    belong, `pages` non-empty, unique routes).
 * 2. **Vocabulary** — every `builder` word exists in the catalogue and every
 *    field `type` is one the input layer accepts. This is the check that stops
 *    a hallucinated component from reaching a client's browser.
 *
 * Issues are collected, not thrown, so the generator can feed them back to the
 * model and retry. `assertPreset()` is the throwing variant for server code
 * that must not proceed.
 */
import {
  BUILDER_CATALOGUE,
  FIELD_TYPE_MODULES,
  NATIVE_FIELD_TYPES,
  THEME_ASSETS,
  UNIMPLEMENTED_BUILDERS,
} from "./catalogue.ts";
import type { iWebPreset, PresetIssue, PresetModel, PresetPage } from "./types.ts";

/** Webapp models the generator offers. Must match `iWebPreset["model"]`. */
export const PRESET_MODELS: readonly PresetModel[] = ["gallery", "profile", "store", "blog"];

/** Field types outside this set are reported, never rendered blindly. */
export const SUPPORTED_FIELD_TYPES = new Set([...NATIVE_FIELD_TYPES, ...Object.keys(FIELD_TYPE_MODULES)]);

export interface PresetParseResult {
  /** Normalised document; safe to hand to `plan()`. */
  preset: iWebPreset;
  /** Empty means "nothing to fix". */
  issues: PresetIssue[];
}

/** Thrown by `assertPreset()`; carries the full issue list. */
export class PresetValidationError extends Error {
  readonly issues: PresetIssue[];

  constructor(issues: PresetIssue[]) {
    super(`Invalid preset: ${issues.map((issue) => `${issue.code} ${issue.detail}`).join("; ")}`);
    this.name = "PresetValidationError";
    this.issues = issues;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

/**
 * Validates and normalises an untrusted preset document.
 *
 * @param input - Parsed JSON from the model (or anything else).
 * @returns Normalised preset plus every issue found.
 *
 * @example
 * const { preset, issues } = parsePreset(aiOutput);
 * if (issues.length) return retryWith(issues);
 */
export function parsePreset(input: unknown): PresetParseResult {
  const issues: PresetIssue[] = [];
  const seen = new Set<string>();

  /** Adds an issue once; repeated words across pages would only be noise. */
  const report = (code: PresetIssue["code"], detail: string, where?: string): void => {
    const key = `${code}:${detail}`;
    if (seen.has(key)) return;
    seen.add(key);
    issues.push({ code, detail, where });
  };

  if (!isRecord(input)) {
    report("INVALID_SHAPE", "Preset must be a JSON object.");
    return { preset: emptyPreset(), issues };
  }

  const id = asString(input.id);
  if (!id) report("MISSING_FIELD", "`id` (site slug) is required.", "id");

  if (input.presetSchema !== 1) {
    report("INVALID_SHAPE", `\`presetSchema\` must be 1, received ${JSON.stringify(input.presetSchema)}.`, "presetSchema");
  }

  const engine = isRecord(input.engine) ? input.engine : {};
  const range = asString(engine.range);
  const resolved = asString(engine.resolved);
  if (!range) report("MISSING_FIELD", "`engine.range` is required.", "engine.range");
  if (!resolved) report("MISSING_FIELD", "`engine.resolved` is required.", "engine.resolved");

  const model = asString(input.model);
  if (!model || !PRESET_MODELS.includes(model as PresetModel)) {
    report("UNKNOWN_MODEL", `Unknown model ${JSON.stringify(model ?? null)}. Use one of: ${PRESET_MODELS.join(", ")}.`, "model");
  }

  const theme = asString(input.theme);
  if (!theme) report("MISSING_FIELD", "`theme` is required.", "theme");
  else if (!THEME_ASSETS[theme]) report("UNKNOWN_THEME", `Theme "${theme}" has no package.`, "theme");

  const site = isRecord(input.site) ? input.site : {};
  const siteName = asString(site.name);
  if (!siteName) report("MISSING_FIELD", "`site.name` is required.", "site.name");

  // Site copy is optional, but only strings survive: a model output never gets
  // to put an object into an attribute value.
  const tagline = asString(site.tagline);
  const seoInput = isRecord(site.seo) ? site.seo : undefined;
  const seoTitle = seoInput ? asString(seoInput.title) : undefined;
  const seoDescription = seoInput ? asString(seoInput.description) : undefined;
  const seoKeywords = seoInput && Array.isArray(seoInput.keywords)
    ? seoInput.keywords.filter((word): word is string => typeof word === "string" && word.trim() !== "")
    : undefined;
  const seo = seoTitle || seoDescription || (seoKeywords && seoKeywords.length)
    ? {
      ...(seoTitle ? { title: seoTitle } : {}),
      ...(seoDescription ? { description: seoDescription } : {}),
      ...(seoKeywords && seoKeywords.length ? { keywords: seoKeywords } : {}),
    }
    : undefined;

  const pagesInput = Array.isArray(input.pages) ? input.pages : null;
  if (!pagesInput) report("INVALID_SHAPE", "`pages` must be an array.", "pages");

  const pageResult = validatePages(pagesInput ?? []);
  pageResult.issues.forEach((issue) => report(issue.code, issue.detail, issue.where));
  const pages = pageResult.pages;

  if (pages.length === 0 && pagesInput) {
    report("MISSING_FIELD", "A preset needs at least one page.", "pages");
  }

  const data = Array.isArray(input.data) ? input.data.filter(isRecord) : [];
  data.forEach((source, index) => {
    const where = `data[${index}]`;
    if (!asString(source.id)) report("MISSING_FIELD", "Data source needs `id`.", where);
    if (!asString(source.sheet)) report("MISSING_FIELD", "Data source needs `sheet`.", where);
    if (!asString(source.endpoint)) report("MISSING_FIELD", "Data source needs `endpoint`.", where);
  });

  const wizard = isRecord(input.wizard) ? input.wizard : {};
  if (!isRecord(wizard.answers)) report("MISSING_FIELD", "`wizard.answers` is required.", "wizard.answers");
  if (!asString(wizard.generatedAt)) report("MISSING_FIELD", "`wizard.generatedAt` is required.", "wizard.generatedAt");

  const preset: iWebPreset = {
    id: id ?? "",
    presetSchema: 1,
    engine: { range: range ?? "", resolved: resolved ?? "" },
    model: (PRESET_MODELS.includes(model as PresetModel) ? model : "gallery") as PresetModel,
    theme: theme ?? "default",
    site: {
      name: siteName ?? "",
      locale: asString(site.locale) ?? "id",
      ...(asString(site.domain) ? { domain: String(site.domain) } : {}),
      ...(tagline ? { tagline } : {}),
      ...(seo ? { seo } : {}),
    },
    pages,
    ...(data.length ? { data: data as unknown as iWebPreset["data"] } : {}),
    wizard: {
      answers: isRecord(wizard.answers) ? wizard.answers : {},
      generatedAt: asString(wizard.generatedAt) ?? "",
    },
  };

  return { preset, issues };
}

/**
 * Validates a `pages` array on its own.
 *
 * Shared by the preset parser and the AI-output parser: the AI writes pages,
 * the orchestrator writes the rest of the document, and both must apply the
 * same rules (ids, routes, closed vocabulary).
 *
 * @param rawPages - Untrusted array.
 * @returns Normalised pages plus issues found.
 */
export function validatePages(rawPages: unknown): { pages: PresetPage[]; issues: PresetIssue[] } {
  const issues: PresetIssue[] = [];
  const seen = new Set<string>();
  const report = (code: PresetIssue["code"], detail: string, where?: string): void => {
    const key = `${code}:${detail}`;
    if (seen.has(key)) return;
    seen.add(key);
    issues.push({ code, detail, where });
  };

  const pages: PresetPage[] = [];
  const routes = new Map<string, number>();

  const list = Array.isArray(rawPages) ? rawPages : [];

  list.forEach((raw, index) => {
    const where = `pages[${index}]`;
    if (!isRecord(raw)) {
      report("INVALID_SHAPE", "Page must be an object.", where);
      return;
    }

    const pageId = asString(raw.id);
    if (!pageId) report("MISSING_PAGE_ID", "Page has no `id`.", where);

    const route = asString(raw.route);
    if (!route) report("MISSING_FIELD", "Page has no `route`.", where);
    else if (!route.startsWith("/")) report("INVALID_SHAPE", `Route "${route}" must start with "/".`, where);
    else if (routes.has(route)) {
      report("DUPLICATE_ROUTE", `Route "${route}" is declared twice.`, where);
    } else {
      routes.set(route, index);
    }

    if (raw.content === undefined || raw.content === null) {
      report("MISSING_FIELD", "Page has no `content`.", where);
      return;
    }

    // A page root must be a node; primitives deeper inside a node (a config
    // flag, a number) are valid values, so the check stops at the root.
    if (typeof raw.content !== "string" && !Array.isArray(raw.content) && !isRecord(raw.content)) {
      report("INVALID_SHAPE", "Page `content` must be a node, an array of nodes or a string.", where);
      return;
    }

    inspectContent(raw.content, `${where}.content`, { report });
    pages.push({ id: pageId ?? `page-${index}`, route: route ?? `/${index}`, content: raw.content });
  });

  return { pages, issues };
}

/**
 * Validates and throws on the first problem set.
 *
 * @param input - Untrusted document.
 * @returns The normalised preset.
 * @throws {PresetValidationError} When any issue was found.
 */
export function assertPreset(input: unknown): iWebPreset {
  const { preset, issues } = parsePreset(input);
  if (issues.length) throw new PresetValidationError(issues);
  return preset;
}

/** Minimal placeholder so a failed parse still returns the right type. */
function emptyPreset(): iWebPreset {
  return {
    id: "",
    presetSchema: 1,
    engine: { range: "", resolved: "" },
    model: "gallery",
    theme: "default",
    site: { name: "", locale: "id" },
    pages: [],
    wizard: { answers: {}, generatedAt: "" },
  };
}

interface ContentInspector {
  report(code: PresetIssue["code"], detail: string, where?: string): void;
}

/**
 * Walks generated content for vocabulary mistakes.
 *
 * Kept separate from `plan()`'s walker on purpose: planning answers "what do I
 * need", validation answers "is this even legal". Mixing them makes an unknown
 * builder look like a missing asset.
 */
function inspectContent(content: unknown, where: string, inspector: ContentInspector): void {
  if (content === null || content === undefined) return;

  if (typeof content === "string") return;

  if (Array.isArray(content)) {
    content.forEach((child, index) => inspectContent(child, `${where}[${index}]`, inspector));
    return;
  }

  // Numbers and booleans are legitimate values inside a node's config; only
  // objects can carry a `builder` that needs checking.
  if (!isRecord(content)) return;

  const builder = content.builder;
  if (typeof builder === "string") {
    if (builder === "form") {
      inspectForm(content.content, where, inspector);
    } else if (builder !== "input" && !BUILDER_CATALOGUE[builder]) {
      const reason = UNIMPLEMENTED_BUILDERS.has(builder)
        ? `Builder "${builder}" is declared in the AST but no package implements it.`
        : `Builder "${builder}" is not in the catalogue.`;
      inspector.report("UNKNOWN_BUILDER", reason, where);
    }
  }

  for (const [key, value] of Object.entries(content)) {
    if (key === "onCreated" || key === "onDestroy") continue;

    // Selector keys are parsed into a tag name, and the renderer replaces `-`
    // with a space in that tag (`product-card-grid` → tag "product card grid").
    // Generated content must therefore use `div#id` + `builder`, never a
    // component name as the key.
    if (isRecord(value) || Array.isArray(value)) {
      const hint = selectorKeyIssue(key);
      if (hint) inspector.report("INVALID_SHAPE", hint, `${where}.${key}`);
    }

    inspectContent(value, `${where}.${key}`, inspector);
  }
}

/**
 * Detects a selector key the renderer cannot turn into a tag name.
 *
 * @param key - Object key from a content node (`section#hero`, `.page`, `product-card-grid`).
 * @returns A human explanation when invalid, otherwise null.
 */
function selectorKeyIssue(key: string): string | null {
  const last = key.split(">").pop() ?? key;
  const clean = last.replace(/\[[^\]]*\]/g, "");
  const base = clean.split(/[#.]/)[0];

  if (!base || !base.includes("-")) return null;

  return (
    `Key "${key}" looks like a component name: the renderer would use "${base.replace(/-/g, " ")}" as the tag. ` +
    `Use "div#${base}" with "builder": "${base}".`
  );
}

/** Validates a form node: shape, then every field type it declares. */
function inspectForm(content: unknown, where: string, inspector: ContentInspector): void {
  if (content === null || content === undefined) {
    inspector.report("FORM_SHAPE", "Form node has no content.", where);
    return;
  }

  const isArray = Array.isArray(content);
  const isWrapped = isRecord(content) && ("schema" in content || "config" in content);

  if (!isArray && !isWrapped) {
    inspector.report(
      "FORM_SHAPE",
      "Form content must be an array of groups/fields or `{ config, schema }`.",
      where,
    );
    return;
  }

  // Fields may be nested in groups/rows; a shallow scan is enough for types
  // because `type` only ever appears on a field node.
  const seen: string[] = [];
  collectFieldTypes(content, seen);

  seen.forEach((type) => {
    if (!SUPPORTED_FIELD_TYPES.has(type)) {
      inspector.report(
        "UNSUPPORTED_FIELD",
        `Field type "${type}" is not supported. Use one of: ${[...SUPPORTED_FIELD_TYPES].join(", ")}.`,
        where,
      );
    }
  });
}

/** Collects every `type` string found under a form subtree. */
function collectFieldTypes(node: unknown, out: string[]): void {
  if (node === null || node === undefined) return;

  if (Array.isArray(node)) {
    node.forEach((child) => collectFieldTypes(child, out));
    return;
  }

  if (!isRecord(node)) return;

  if (typeof node.type === "string" && node.type !== "") out.push(node.type);

  for (const [key, value] of Object.entries(node)) {
    if (key === "onCreated" || key === "onDestroy") continue;
    collectFieldTypes(value, out);
  }
}
