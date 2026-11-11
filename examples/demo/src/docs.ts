/**
 * Docs view-model for the elements page.
 *
 * Phase 1 of the docs shell: everything the three tabs (Display / Cara Penggunaan / API)
 * need, derived from the demo table — no nodes, no CSS, no builders. Keeping it pure means
 * the panels cannot invent documentation the table does not contain, and the numbers below
 * can be checked without a browser.
 */
import { DEMO, DEMO_TIERS, TIER_COST, TIER_LABELS } from "./manifest";
import type { DemoTier, iDemoEntry, iDemoVariant } from "./manifest";

/** Label/value pair rendered as one line of a list or table. Values are strings on purpose. */
export interface iApiRow {
  label: string;
  value: string;
}

/** One `config` key as the demo actually passes it — type plus the value in the table. */
export interface iApiConfigRow {
  key: string;
  type: string;
  example: string;
}

export interface iUsageView {
  /** One sentence: what the component is and what it costs. */
  summary: string;
  fields: iApiRow[];
  /** Registration + build call, with the real payload and config keys from the table. */
  snippet: string;
  /** Things the caller must know before it works: declared note plus per-kind facts. */
  limits: string[];
}

export interface iApiView {
  rows: iApiRow[];
  config: iApiConfigRow[];
}

/** Long demo payloads are real, but 200 lines of travel copy is not documentation. */
const MAX_PREVIEW_LINES = 16;

/** Pretty JSON with functions spelled out, capped so one row cannot swallow the panel. */
function preview(value: unknown, maxLines: number = MAX_PREVIEW_LINES): string {
  if (value === undefined) return "undefined";
  const text =
    JSON.stringify(value, (_key, item) => (typeof item === "function" ? "[function]" : item), 2) ??
    JSON.stringify(String(value));
  const lines = text.split("\n");
  if (lines.length <= maxLines) return text;
  return `${lines.slice(0, maxLines).join("\n")}\n// … dipotong — payload lengkap: examples/demo/src/manifest.ts`;
}

/** Top-level shape of the payload, e.g. `{ content }` or `Array(2)`. */
export function payloadShapeOf(payload: unknown): string {
  if (Array.isArray(payload)) return `Array(${payload.length})`;
  if (payload && typeof payload === "object") {
    const keys = Object.keys(payload as Record<string, unknown>);
    return keys.length ? `{ ${keys.join(", ")} }` : "{}";
  }
  return typeof payload;
}

/** What the builder hands back, per `kind` — the one difference that changes the call site. */
export const RESULT_OF_KIND: Record<iDemoEntry["kind"], string> = {
  element: "HTMLElement",
  modal: "{ open, close, element }",
};

/**
 * Display variants for one row.
 *
 * A row may declare `variants`; without them the row itself is the single variant, so the
 * panel always has at least one thing to build.
 */
export function variantsOf(entry: iDemoEntry): iDemoVariant[] {
  if (entry.variants?.length) return entry.variants;
  return [{ label: "payload tabel", payload: entry.payload, config: entry.config }];
}

/** Tab "Cara Penggunaan": summary, the four facts you need, one snippet, and the limits. */
export function usageOf(entry: iDemoEntry): iUsageView {
  const configKeys = Object.keys(entry.config ?? {});

  return {
    summary: `${entry.name} · komponen ${entry.category} tingkat ${entry.tier} — ${TIER_COST[entry.tier]}.`,
    fields: [
      { label: "Path", value: entry.path },
      { label: "Stylesheet", value: entry.stylesheet ?? "—" },
      { label: "Builder", value: `build("${entry.name}", payload)` },
      { label: "Hasil", value: RESULT_OF_KIND[entry.kind] },
      { label: "Config", value: configKeys.length ? configKeys.join(", ") : "—" },
    ],
    snippet: [
      `registry.register("${entry.name}", () => ({`,
      `  path: "${entry.path}",`,
      ...(entry.stylesheet ? [`  stylesheet: "${entry.stylesheet}",`] : []),
      ...(configKeys.length ? [`  config: { ${configKeys.join(", ")} }, // lihat tab API`] : []),
      "  schema: payload, // entry.payload dari manifest",
      "}));",
      "",
      `const element = build("${entry.name}", ${preview(entry.payload)});`,
    ].join("\n"),
    limits: [
      ...(entry.kind === "modal"
        ? ["builder mengembalikan handle kontrol, bukan elemen: { open, close, element }."]
        : []),
      ...(entry.note ? [entry.note] : []),
    ],
  };
}

/** Tab "API": the table row itself, plus every config key with its real value. */
export function apiOf(entry: iDemoEntry): iApiView {
  const config = Object.entries(entry.config ?? {}).map(([key, value]) => ({
    key,
    type: Array.isArray(value) ? "array" : typeof value,
    example: typeof value === "function" ? "—" : preview(value, 4).replace(/\n/g, " "),
  }));

  return {
    rows: [
      { label: "name", value: entry.name },
      { label: "path", value: entry.path },
      { label: "stylesheet", value: entry.stylesheet ?? "—" },
      { label: "category", value: entry.category },
      { label: "tier", value: `${entry.tier} (${TIER_LABELS[entry.tier]})` },
      { label: "kind", value: entry.kind },
      { label: "payload", value: payloadShapeOf(entry.payload) },
      { label: "config", value: config.length ? `${config.length} key` : "—" },
    ],
    config,
  };
}

/** Sidebar groups, in tier order — the ramp the page is meant to teach. */
export function tierGroups(): { tier: DemoTier; label: string; rows: iDemoEntry[] }[] {
  return DEMO_TIERS.map((tier) => ({
    tier,
    label: TIER_LABELS[tier],
    rows: DEMO.filter((entry) => entry.tier === tier),
  }));
}

/** `#kitchen/<name>` — the only place that knows the shape of the selection hash. */
export function entryHash(name: string): string {
  return `#kitchen/${name}`;
}

/** The row a fragment selects. `fragment` arrives without `#` or a leading slash. */
export function entryForFragment(fragment?: string | null): iDemoEntry {
  const name = (fragment ?? "").trim().replace(/^#/, "").split("/")[0];
  return DEMO.find((entry) => entry.name === name) ?? DEMO[0];
}
