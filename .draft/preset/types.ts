/**
 * PRESET — document shape (draft).
 *
 * A preset is *data*: one JSON document that says which pages exist, which
 * capabilities those pages use, and which framework release produced it.
 * It is written by the generator (server side) and consumed by the generated
 * site; no `@aio-ui` package depends on this file.
 *
 * Two versions are recorded on purpose:
 * - `presetSchema` describes the document shape, so a parser can refuse a
 *   document it does not understand.
 * - `engine.resolved` is the exact framework release the site was generated
 *   against. The runtime loads *that* release, so a later publish can never
 *   break a site that is already live. `engine.range` only documents intent
 *   for a deliberate regeneration.
 */

/** Webapp models the generator offers. One model = one preset template. */
export type PresetModel = "gallery" | "profile" | "store" | "blog";

export interface PresetPage {
  /** Stable page id, also the component key in the host registry. */
  id: string;
  /** Route the page answers, e.g. `"/"` or `"/produk/:id"`. */
  route: string;
  /**
   * Content AST (`iNodeContent`) or raw HTML string.
   * Typed as `unknown` because this file must not import the renderer: the
   * generator validates it structurally, and the site renders it at runtime.
   */
  content: unknown;
}

export interface PresetDataSource {
  /** Logical id used by page content (`data: "products"`). */
  id: string;
  /** Sheet the CMS serves this data from. */
  sheet: string;
  /** `/exec` endpoint of that site's own Apps Script deployment. */
  endpoint: string;
  /** Extra query parameters (`limit`, `sortBy`, `category`, …). */
  params?: Record<string, string | number | boolean>;
}

export interface PresetWizard {
  /** Raw answers, kept for regeneration and support. */
  answers: Record<string, unknown>;
  /** ISO timestamp of generation. */
  generatedAt: string;
}

export interface iWebPreset {
  /** Site slug; also the repository name suffix. */
  id: string;
  /** Document shape version. Bumped only when the parser's contract changes. */
  presetSchema: 1;
  /** Framework release this site was generated against. */
  engine: {
    /** Intent, e.g. `"^0.1.0"`. */
    range: string;
    /** Exact version the runtime loads, e.g. `"0.1.3"`. */
    resolved: string;
  };
  model: PresetModel;
  /** Theme id (`default`, `cyberpunk`, …) — themes are data, never CSS in the preset. */
  theme: string;
  site: {
    name: string;
    locale: string;
    domain?: string;
    /** One-line description the AI wrote; rendered as the meta description fallback. */
    tagline?: string;
    /** SEO copy; the runtime emits `<title>` and `<meta name="description">` from it. */
    seo?: {
      title?: string;
      description?: string;
      keywords?: string[];
    };
  };
  pages: PresetPage[];
  data?: PresetDataSource[];
  wizard: PresetWizard;
}

/** One package the generated site must load, with its stylesheets. */
export interface PresetAsset {
  /** Import specifier, e.g. `"@aio-ui/article"`. */
  specifier: string;
  /** Stylesheet specifiers that belong to that package. */
  styles: string[];
  /** Package the specifier belongs to, e.g. `"@aio-ui/article"`. */
  package: string;
  /** Link in the import map (filled in by the release pipeline). */
  url?: string;
}

export type PresetIssueCode =
  /** The document does not match `iWebPreset` at all (not an object, page not an array…). */
  | "INVALID_SHAPE"
  /** A required value is missing or empty. */
  | "MISSING_FIELD"
  /** `model` is not one of the offered webapp models. */
  | "UNKNOWN_MODEL"
  /** `theme` has no package. */
  | "UNKNOWN_THEME"
  /** A `builder` word the catalogue cannot render. */
  | "UNKNOWN_BUILDER"
  /** A field `type` no module handles and the browser cannot render natively. */
  | "UNSUPPORTED_FIELD"
  /** A form node has no `schema`/`config` and no field array. */
  | "FORM_SHAPE"
  | "MISSING_PAGE_ID"
  | "DUPLICATE_ROUTE";

/** A problem the generator must report or fix — never silently ignore. */
export interface PresetIssue {
  code: PresetIssueCode;
  /** Human-readable explanation, including the offending value. */
  detail: string;
  /** Where it was found, e.g. `pages[0].content` or `form.config`. */
  where?: string;
}

/** One builder word → the module that renders it (registry registration). */
export interface PresetBinding {
  /** `builder` value in content, also the registry name. */
  word: string;
  /** Module specifier that renders it. */
  specifier: string;
  /** Stylesheet specifiers for the registration manifest. */
  styles: string[];
}

/** A sub-module a builder must be told about (`iComponentModuleRef`). */
export interface PresetModuleRef {
  /** Module id the owner expects (`validation`, `dropdown`, `table`, …). */
  id: string;
  /** Module specifier to load. */
  specifier: string;
}

/** What `plan()` derives from a preset. */
export interface PresetPlan {
  /** Capability ids the site needs (`router`, `http-service`, `form`, …). */
  capabilities: string[];
  /** Stylesheets every site links, before component styles. */
  baseStyles: string[];
  /** Modules/adapters to register, in deterministic order. */
  modules: string[];
  /** Components to register. */
  components: string[];
  /** Builder word → module, for the runtime's `register()` calls. */
  bindings: PresetBinding[];
  /** Sub-modules handed to their owner (form adapters, input modules, bridges). */
  moduleRefs: PresetModuleRef[];
  /** Everything the page must load: one entry per package. */
  assets: PresetAsset[];
  /** Problems found while deriving; a non-empty list must block generation. */
  issues: PresetIssue[];
}
