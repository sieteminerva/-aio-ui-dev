/**
 * PRESET PLAN — derive what a preset actually needs.
 *
 * The AI writes `pages`, `theme` and `data` intents; this module decides the
 * packages. That split is deliberate: an AI that can name a package can name a
 * wrong one, while a table (see `catalogue.ts`) can be tested row by row.
 *
 * Walk rules:
 * - a node with `builder: "<word>"` adds that word's catalogue row;
 * - `attrs.animation` (or `animation=` inside a raw HTML string) adds `animations`;
 * - `builder: "form"` starts a form scope, where config flags and field types
 *   decide which form/input sub-modules are needed;
 * - more than one page adds `router`; any `data[]` entry adds `http-service`.
 */
import {
  BASE_ASSETS,
  BASE_STYLES,
  BUILDER_CATALOGUE,
  CAPABILITY_CATALOGUE,
  FIELD_TYPE_MODULES,
  FORM_ADAPTER_CATALOGUE,
  INPUT_MODULE_CATALOGUE,
  THEME_ASSETS,
  UNIMPLEMENTED_BUILDERS,
} from "./catalogue.ts";
import type { CatalogueEntry } from "./catalogue.ts";
import type { iWebPreset, PresetAsset, PresetBinding, PresetIssue, PresetPlan } from "./types.ts";

/** Anything the walker treats as a node. */
type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** `@aio-ui/input/dropdown/module` → `@aio-ui/input`. */
function packageOf(specifier: string): string {
  return specifier.split("/").slice(0, 2).join("/");
}

/**
 * Derives the modules, components and assets a preset needs.
 *
 * @param preset - Preset document (only `pages`, `theme` and `data` are read).
 * @returns Plan; `issues` must be empty before a site is generated.
 */
export function plan(preset: iWebPreset): PresetPlan {
  const issues: PresetIssue[] = [];
  const capabilities = new Set<string>();
  const modules = new Set<string>();
  const components = new Set<string>();
  /** word → binding; a word registered twice keeps the first (catalogue is stable). */
  const bindings = new Map<string, PresetBinding>();
  /** id → module + its named export for sub-modules handed to their owner. */
  const moduleRefs = new Map<string, { specifier: string; export?: string }>();
  /** specifier → style specifiers, so two pages needing the same package merge. */
  const assets = new Map<string, Set<string>>();

  const addEntry = (entry: CatalogueEntry, word?: string): void => {
    capabilities.add(entry.capability);

    // Every module is registered; the styles belong to the entry's own package.
    for (const specifier of entry.modules) {
      modules.add(specifier);
      if (!assets.has(specifier)) assets.set(specifier, new Set());
    }

    const owner = entry.modules[0];
    if (owner) {
      entry.styles.forEach((style) => assets.get(owner)!.add(style));
    }

    // A builder word registers one component; a sub-module is passed by id.
    if (word && owner && !bindings.has(word)) {
      bindings.set(word, { word, specifier: owner, styles: [...entry.styles].sort() });
    }
    if (entry.id && owner) moduleRefs.set(entry.id, { specifier: owner, export: entry.export });
  };

  const addCapability = (key: keyof typeof CAPABILITY_CATALOGUE): void => {
    const entry = CAPABILITY_CATALOGUE[key];
    if (entry) addEntry(entry);
  };

  // ---- base + theme: always present -------------------------------------
  capabilities.add("core");
  BASE_ASSETS.forEach((asset) => {
    modules.add(asset.specifier);
    assets.set(asset.specifier, new Set(asset.styles));
  });

  const theme = THEME_ASSETS[preset.theme];
  if (theme) {
    capabilities.add("theme");
    modules.add(theme.specifier);
    assets.set(theme.specifier, new Set(theme.styles));
  } else {
    issues.push({
      code: "UNKNOWN_BUILDER",
      detail: `Theme "${preset.theme}" has no package.`,
      where: "theme",
    });
  }

  // ---- pages -------------------------------------------------------------
  const routes = new Set<string>();
  preset.pages.forEach((page, index) => {
    const where = `pages[${index}]`;
    if (!page.id) issues.push({ code: "MISSING_PAGE_ID", detail: "Page has no id.", where });
    if (routes.has(page.route)) {
      issues.push({ code: "DUPLICATE_ROUTE", detail: `Route "${page.route}" is declared twice.`, where });
    }
    routes.add(page.route);

    scanContent(page.content, where, {
      onBuilder: (word, at) => {
        // `form` and `input` are handled below with their config.
        if (word === "form" || word === "input") return;
        if (UNIMPLEMENTED_BUILDERS.has(word)) {
          issues.push({
            code: "UNKNOWN_BUILDER",
            detail: `Builder "${word}" is declared in the AST but no package implements it.`,
            where: at,
          });
          return;
        }
        const entry = BUILDER_CATALOGUE[word];
        if (!entry) {
          issues.push({
            code: "UNKNOWN_BUILDER",
            detail: `Builder "${word}" is not in the catalogue.`,
            where: at,
          });
          return;
        }
        addEntry(entry, word);
        components.add(entry.modules[0]);
      },
      onAnimation: () => addCapability("animations"),
      onForm: (content, at) => scanForm(content, at, {
        addAdapter: (key) => {
          const entry = FORM_ADAPTER_CATALOGUE[key];
          if (entry) addEntry(entry);
        },
        addInputModule: (key) => {
          const entry = INPUT_MODULE_CATALOGUE[key];
          if (entry) addEntry(entry);
        },
        addCapability,
        addBuilder: (word) => {
          const entry = BUILDER_CATALOGUE[word];
          if (entry) {
            addEntry(entry, word);
            components.add(entry.modules[0]);
          }
        },
        issue: (issue) => issues.push(issue),
      }),
    });
  });

  // ---- cross-cutting -----------------------------------------------------
  if (preset.pages.length > 1) addCapability("router");
  if (preset.data && preset.data.length > 0) addCapability("http");

  // ---- materialise -------------------------------------------------------
  const assetList: PresetAsset[] = [...assets.entries()]
    .map(([specifier, styles]) => ({
      specifier,
      styles: [...styles].sort(),
      package: packageOf(specifier),
    }))
    .sort((a, b) => a.specifier.localeCompare(b.specifier));

  return {
    capabilities: [...capabilities].sort(),
    baseStyles: [...BASE_STYLES],
    modules: [...modules].sort(),
    components: [...components].sort(),
    bindings: [...bindings.values()].sort((a, b) => a.word.localeCompare(b.word)),
    moduleRefs: [...moduleRefs.entries()]
      .map(([id, ref]) => ({ id, specifier: ref.specifier, ...(ref.export ? { export: ref.export } : {}) }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    assets: assetList,
    issues,
  };
}

/** Convenience wrapper: only the asset list, which is what the host consumes. */
export function assetsOf(preset: iWebPreset): PresetAsset[] {
  return plan(preset).assets;
}

interface ContentVisitor {
  onBuilder(word: string, where: string): void;
  onAnimation(where: string): void;
  onForm(content: unknown, where: string): void;
}

const ANIMATION_ATTR = /\banimation\s*=\s*["']/;

/**
 * Walks a content AST or a raw HTML string.
 *
 * Handles both AST modes (`iBasicNode` objects and `iNodeContent` selector
 * maps), because generated content may mix them.
 */
function scanContent(content: unknown, where: string, visitor: ContentVisitor): void {
  if (content === null || content === undefined) return;

  if (typeof content === "string") {
    // Raw HTML string: the wizard sets `animation` directly in markup.
    if (ANIMATION_ATTR.test(content)) visitor.onAnimation(where);
    return;
  }

  if (Array.isArray(content)) {
    content.forEach((child, index) => scanContent(child, `${where}[${index}]`, visitor));
    return;
  }

  if (!isRecord(content)) return;

  const builder = content.builder;
  if (typeof builder === "string") {
    if (builder === "form") visitor.onForm(content.content, where);
    else visitor.onBuilder(builder, where);
  }

  const attrs = content.attrs;
  if (isRecord(attrs) && typeof attrs.animation === "string") visitor.onAnimation(where);

  for (const [key, value] of Object.entries(content)) {
    // Lifecycle hooks are functions; nothing to derive from them.
    if (key === "onCreated" || key === "onDestroy") continue;
    scanContent(value, `${where}.${key}`, visitor);
  }
}

interface FormVisitor {
  addAdapter(key: keyof typeof FORM_ADAPTER_CATALOGUE): void;
  addInputModule(key: keyof typeof INPUT_MODULE_CATALOGUE): void;
  addCapability(key: keyof typeof CAPABILITY_CATALOGUE): void;
  addBuilder(word: string): void;
  issue(issue: PresetIssue): void;
}

/**
 * Scans a form subtree.
 *
 * A form always brings validation + the input adapter + the form/input
 * packages. Everything else follows the declared schema: config flags turn on
 * adapters, field types turn on input modules, a group with `table` turns on
 * the table bridge.
 */
function scanForm(content: unknown, where: string, visitor: FormVisitor): void {
  // Form is present: its own package, the input layer, and the two adapters
  // that are always part of the submit path.
  visitor.addBuilder("form");
  visitor.addBuilder("input");
  visitor.addAdapter("validation");
  visitor.addAdapter("input");
  // Feedback path: a submit answers through the message module.
  visitor.addBuilder("message");
  visitor.addCapability("form-message");

  const config = isRecord(content) && isRecord(content.config) ? content.config : {};

  if (config.multistep === true) visitor.addAdapter("multistep");
  if (config.cascading === true || config.autoDisableNextStep === true) visitor.addAdapter("cascade");
  if (config.calculation === true) visitor.addAdapter("calculation");

  if (config.address && typeof config.address === "object") {
    visitor.addCapability("id-address");
  }

  walkFields(content, where, visitor);
}

/** Finds field schemas anywhere inside a form subtree. */
function walkFields(node: unknown, where: string, visitor: FormVisitor): void {
  if (node === null || node === undefined) return;

  if (typeof node === "string") {
    // Inline markup inside a form can carry its own animation tokens.
    if (ANIMATION_ATTR.test(node)) visitor.addCapability("animations");
    return;
  }

  if (Array.isArray(node)) {
    node.forEach((child, index) => walkFields(child, `${where}[${index}]`, visitor));
    return;
  }

  if (!isRecord(node)) return;

  const attrs = node.attrs;
  if (isRecord(attrs) && typeof attrs.animation === "string") visitor.addCapability("animations");

  // A group carrying `table` renders an editable grid through its own bridge.
  if (node.table !== undefined && node.table !== null) {
    visitor.addBuilder("table");
    visitor.addCapability("form-table");
  }

  // Any node declaring `actions` renders a control set.
  if (node.actions !== undefined) visitor.addInputModule("controls");

  const type = node.type;
  if (typeof type === "string") {
    const moduleKey = FIELD_TYPE_MODULES[type];
    if (moduleKey) visitor.addInputModule(moduleKey);
  }

  const fieldConfig = isRecord(node.config) ? node.config : undefined;
  if (fieldConfig) {
    if (fieldConfig.actions !== undefined) visitor.addInputModule("controls");
    if (fieldConfig.popover !== undefined) visitor.addInputModule("popover");
    if (fieldConfig.address !== undefined && typeof fieldConfig.address === "object") {
      visitor.addCapability("id-address");
    }
  }

  for (const [key, value] of Object.entries(node)) {
    if (key === "onCreated" || key === "onDestroy") continue;
    walkFields(value, `${where}.${key}`, visitor);
  }
}
