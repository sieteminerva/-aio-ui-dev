/**
 * AI OUTPUT CONTRACT — the object the model returns.
 *
 * The orchestrator owns everything deterministic (id, engine pin, scope,
 * endpoint); the model owns only *content*. Splitting it this way means:
 *
 * - a prompt change never touches the preset envelope,
 * - a model cannot widen its own permissions (no scope, no endpoint, no
 *   package names),
 * - validation is one call: `parseAiContent()` → pages + issues, reusing the
 *   same page rules as `parsePreset()`.
 *
 * Shape (v1):
 *
 * ```json
 * {
 *   "contentSchema": 1,
 *   "model": "store",
 *   "theme": "default",
 *   "site": { "tagline": "…", "seo": { "title": "…", "description": "…" } },
 *   "pages": [
 *     { "id": "home", "route": "/", "seo": { "title": "…" }, "content": { "…": "…" } }
 *   ],
 *   "notes": ["Asumsi yang diambil model"]
 * }
 * ```
 */
import { validatePages } from "./parse.ts";
import type {
  PresetDataSource,
  PresetIssue,
  PresetModel,
  PresetPage,
} from "./types.ts";
import type { iWebPreset } from "./types.ts";

/** Version of the AI response shape. Bumped when the prompt's output changes. */
export const AI_CONTENT_SCHEMA = 1 as const;

export interface iAiSeo {
  title?: string;
  description?: string;
  keywords?: string[];
}

export interface iAiPage {
  /** kebab-case, unique across the document. */
  id?: string;
  /** Must start with `/`; unique. */
  route?: string;
  seo?: iAiSeo;
  /** Content AST (`iNodeContent`) or raw HTML string. */
  content?: unknown;
}

export interface iAiSiteContent {
  contentSchema: typeof AI_CONTENT_SCHEMA;
  /**
   * Echoed by the model for traceability. The orchestrator's values win:
   * a model must never choose the webapp model or the theme on its own.
   */
  model?: PresetModel;
  theme?: string;
  /** Site-level copy the model is allowed to write. */
  site?: {
    tagline?: string;
    seo?: iAiSeo;
  };
  pages: iAiPage[];
  /** Caveats for the operator (assumptions, missing inputs) — never rendered. */
  notes?: string[];
}

export interface AiParseResult {
  /** Validated pages, ready to drop into a preset. */
  pages: PresetPage[];
  /** Site-level copy, if the model wrote any. */
  site?: iAiSiteContent["site"];
  /** Operator notes; empty when the model wrote none. */
  notes: string[];
  /** Empty means "safe to assemble". */
  issues: PresetIssue[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

/** Keeps only string keywords, so a stray object cannot reach the renderer. */
function readSeo(value: unknown): iAiSeo | undefined {
  if (!isRecord(value)) return undefined;

  const seo: iAiSeo = {};
  const title = asString(value.title);
  const description = asString(value.description);
  const keywords = Array.isArray(value.keywords)
    ? value.keywords.filter((word): word is string => typeof word === "string" && word.trim() !== "")
    : undefined;

  if (title) seo.title = title;
  if (description) seo.description = description;
  if (keywords && keywords.length) seo.keywords = keywords;

  return Object.keys(seo).length ? seo : undefined;
}

/**
 * Validates the JSON the model returned.
 *
 * @param input - Parsed JSON from the model (never a string).
 * @returns Pages, site copy, notes and every issue found.
 *
 * @example
 * const ai = parseAiContent(JSON.parse(text));
 * if (ai.issues.length) return retry(ai.issues);
 * const preset = assemblePreset(ai, base);
 */
export function parseAiContent(input: unknown): AiParseResult {
  const issues: PresetIssue[] = [];

  if (!isRecord(input)) {
    return {
      pages: [],
      notes: [],
      issues: [{ code: "INVALID_SHAPE", detail: "AI output must be a JSON object." }],
    };
  }

  if (input.contentSchema !== AI_CONTENT_SCHEMA) {
    issues.push({
      code: "INVALID_SHAPE",
      detail: `\`contentSchema\` must be ${AI_CONTENT_SCHEMA}, received ${JSON.stringify(input.contentSchema)}.`,
      where: "contentSchema",
    });
  }

  const pageResult = validatePages(input.pages);
  issues.push(...pageResult.issues);

  const notes = Array.isArray(input.notes)
    ? input.notes.filter((note): note is string => typeof note === "string" && note.trim() !== "")
    : [];

  const site = isRecord(input.site)
    ? {
      ...(asString(input.site.tagline) ? { tagline: String(input.site.tagline) } : {}),
      ...(readSeo(input.site.seo) ? { seo: readSeo(input.site.seo) } : {}),
    }
    : undefined;

  return {
    pages: pageResult.pages,
    ...(site && Object.keys(site).length ? { site } : {}),
    notes,
    issues,
  };
}

/**
 * Throwing variant for server code that must not continue.
 *
 * @param input - Parsed JSON from the model.
 * @returns Parsed content.
 * @throws {Error} With the issue list serialised into the message.
 */
export function assertAiContent(input: unknown): AiParseResult {
  const result = parseAiContent(input);
  if (result.issues.length) {
    throw new Error(
      `Invalid AI content: ${result.issues.map((issue) => `${issue.code} ${issue.detail}`).join("; ")}`,
    );
  }
  return result;
}

/** Everything the orchestrator knows and the model does not. */
export interface PresetAssembly {
  /** Site slug; also the repository name suffix. */
  id: string;
  /** Framework pin, resolved by the generator. */
  engine: { range: string; resolved: string };
  model: PresetModel;
  theme: string;
  site: { name: string; locale: string; domain?: string };
  /** Sheets the site may read, already created by the orchestrator. */
  data?: PresetDataSource[];
  /** Raw wizard answers, kept for regeneration. */
  answers: Record<string, unknown>;
  /** ISO timestamp; passed in so the output stays deterministic in tests. */
  generatedAt: string;
}

/**
 * Combines validated AI content with the orchestrator's facts.
 *
 * @param ai - Result of `parseAiContent()` (must have no issues).
 * @param base - Deterministic values the model never supplies.
 * @returns A complete preset document.
 */
export function assemblePreset(ai: AiParseResult, base: PresetAssembly): iWebPreset {
  return {
    id: base.id,
    presetSchema: 1,
    engine: { range: base.engine.range, resolved: base.engine.resolved },
    model: base.model,
    theme: base.theme,
    site: {
      ...base.site,
      ...(ai.site?.tagline ? { tagline: ai.site.tagline } : {}),
      ...(ai.site?.seo ? { seo: ai.site.seo } : {}),
    },
    pages: ai.pages,
    ...(base.data && base.data.length ? { data: base.data } : {}),
    wizard: { answers: base.answers, generatedAt: base.generatedAt },
  };
}

/**
 * Gemini-style `responseSchema` for the envelope.
 *
 * @summary Gemini cannot express free-form object keys, and page content is
 * exactly that. This schema therefore covers the *envelope*; the AST rules live
 * in `prompt.content.md` and the real gate is `parseAiContent()`.
 * @returns Schema for the `generationConfig.responseSchema` field.
 */
export function aiResponseSchema(): Record<string, unknown> {
  return {
    type: "OBJECT",
    properties: {
      contentSchema: { type: "INTEGER" },
      model: { type: "STRING" },
      theme: { type: "STRING" },
      site: {
        type: "OBJECT",
        properties: {
          tagline: { type: "STRING" },
          seo: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              description: { type: "STRING" },
              keywords: { type: "ARRAY", items: { type: "STRING" } },
            },
          },
        },
      },
      pages: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            id: { type: "STRING" },
            route: { type: "STRING" },
            seo: { type: "OBJECT" },
            content: { type: "OBJECT" },
          },
          required: ["id", "route", "content"],
        },
      },
      notes: { type: "ARRAY", items: { type: "STRING" } },
    },
    required: ["contentSchema", "pages"],
  };
}
