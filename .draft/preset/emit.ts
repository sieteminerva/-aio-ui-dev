/**
 * PRESET EMITTER — turn a plan into the three things a generated site needs:
 *
 * 1. `links`      — stylesheet URLs for `<link rel="stylesheet">`,
 * 2. `importMap`  — bare specifier → URL, so `import("@aio-ui/form")` works
 *                   in a browser without a bundler,
 * 3. `table`      — the same mapping as data, for hosts that build a registry
 *                   (the current `componentAssets` shape).
 *
 * Resolution is deliberately injected: this module knows *what* to load, never
 * *where* it is hosted. GitHub/CDN layout is a deployment decision, and the
 * generator passes it in.
 */
import { plan } from "./plan.ts";
import type { iWebPreset, PresetPlan } from "./types.ts";

/** Where a specifier actually lives. `null` means "not resolvable". */
export interface AssetResolver {
  module(specifier: string): string | null;
  style(specifier: string): string | null;
  /**
   * Prefix mappings (`"@aio-ui/utilities/"` → `"…/packages/utilities/dist/"`).
   * Import maps resolve a module's own internal imports through these, so the
   * closure of a component does not have to be listed one subpath at a time.
   */
  prefixes?(): Record<string, string>;
  /**
   * Exact bare subpath entries from each package's `exports` map.
   *
   * Needed because a bare subpath such as `@aio-ui/utilities/AttributeUtils` has
   * no extension: a prefix alone would produce a URL that 404s. Exact keys also
   * carry the real file when a subpath does not mirror its name
   * (`input/dropdown/module` → `dist/Dropdown/Dropdown.InputModule.js`).
   */
  exact?(): Record<string, string>;
}

export interface EmittedModule {
  specifier: string;
  url: string;
  styles: string[];
}

/** A builder registration, with URLs resolved. */
export interface EmittedBinding {
  word: string;
  specifier: string;
  url: string;
  styles: string[];
}

/** A sub-module ref, with its URL resolved. */
export interface EmittedModuleRef {
  id: string;
  specifier: string;
  url: string;
  /** Named export the registry must pick; see `PresetModuleRef.export`. */
  export?: string;
}

export interface EmittedSite {
  /** Stylesheet URLs, de-duplicated, in plan order. */
  links: string[];
  /** Ready to serialise into `<script type="importmap">`. */
  importMap: { imports: Record<string, string> };
  /** Registry-shaped view: one row per module specifier. */
  table: EmittedModule[];
  /** Builder word → resolved module, for `registry.register()`. */
  bindings: EmittedBinding[];
  /** Resolved sub-modules for the registrations that need them (the form). */
  moduleRefs: EmittedModuleRef[];
  /** Specifiers the resolver could not place — must block generation. */
  missing: string[];
}

/** Emits the site assets for an already-computed plan. */
export function emitPlan(input: PresetPlan, resolver: AssetResolver): EmittedSite {
  const links: string[] = [];
  const imports: Record<string, string> = {};
  const table: EmittedModule[] = [];
  const missing: string[] = [];

  const pushStyle = (styleSpecifier: string): string | null => {
    const url = resolver.style(styleSpecifier);
    if (!url) {
      missing.push(styleSpecifier);
      return null;
    }
    if (!links.includes(url)) links.push(url);
    return url;
  };

  // Global sheets come first so component rules win on equal specificity.
  input.baseStyles.forEach((styleSpecifier) => pushStyle(styleSpecifier));

  for (const asset of input.assets) {
    const url = resolver.module(asset.specifier);
    if (!url) {
      missing.push(asset.specifier);
      continue;
    }

    imports[asset.specifier] = url;

    const styles: string[] = [];
    asset.styles.forEach((styleSpecifier) => {
      const styleUrl = pushStyle(styleSpecifier);
      if (styleUrl) styles.push(styleUrl);
    });

    table.push({ specifier: asset.specifier, url, styles });
  }

  return {
    links,
    // Sorted keys keep the generated `index.html` diff-free between runs.
    // Prefixes ride along so a component's own imports resolve in the browser.
    importMap: {
      imports: Object.fromEntries(
        Object.entries({ ...(resolver.prefixes?.() ?? {}), ...(resolver.exact?.() ?? {}), ...imports }).sort(([a], [b]) =>
          a.localeCompare(b),
        ),
      ),
    },
    table,
    bindings: input.bindings
      .map((binding) => {
        const url = resolver.module(binding.specifier);
        if (!url) {
          if (!missing.includes(binding.specifier)) missing.push(binding.specifier);
          return null;
        }
        return {
          word: binding.word,
          specifier: binding.specifier,
          url,
          styles: binding.styles.map((style) => resolver.style(style)).filter((style): style is string => !!style),
        };
      })
      .filter((binding): binding is EmittedBinding => binding !== null),
    moduleRefs: input.moduleRefs
      .map((ref) => {
        const url = resolver.module(ref.specifier);
        if (!url) {
          if (!missing.includes(ref.specifier)) missing.push(ref.specifier);
          return null;
        }
        return { id: ref.id, specifier: ref.specifier, url, ...(ref.export ? { export: ref.export } : {}) };
      })
      .filter((ref): ref is EmittedModuleRef => ref !== null),
    missing,
  };
}

/** Convenience: plan a preset, then emit it. */
export function emitSite(preset: iWebPreset, resolver: AssetResolver): EmittedSite {
  return emitPlan(plan(preset), resolver);
}

/** One package's location inside the published repository. */
export interface PackageLayoutEntry {
  /** Repository-relative directory, e.g. `packages/components/form`. */
  dir: string;
  /** Entry file for the bare specifier, e.g. `dist/Form.js`. Empty for CSS-only packages. */
  entry?: string;
  /** Directory holding the published stylesheets. Defaults to `dist`. */
  stylesRoot?: string;
  /** `false` when the package has no root export (named subpaths only). */
  bare?: boolean;
  /**
   * The package's own `exports` map, flattened: `"./Form" → "dist/Form.js"`.
   * Subpath specifiers are **not** derivable from their name (`dropdown/module`
   * ships as `dist/Dropdown/Dropdown.InputModule.js`), so the resolver reads this
   * map first and only falls back to the `dist/` mirror rule.
   */
  subpaths?: Record<string, string>;
}

/** `{ "@aio-ui/form": { dir: "packages/components/form", entry: "dist/Form.js" } }` */
export type PackageLayout = Record<string, PackageLayoutEntry>;

export interface CdnResolverOptions {
  /** Base URL ending with `/`, e.g. `https://cdn.jsdelivr.net/gh/u/r@v0.1.3/`. */
  base: string;
  layout: PackageLayout;
}

/**
 * Builds a resolver for a flat CDN layout (`jsDelivr gh`, GitHub Pages, a
 * release folder).
 *
 * Subpaths follow the package's own `exports` map (`layout[pkg].subpaths`), so
 * `@aio-ui/input/dropdown/module` lands on `dist/Dropdown/Dropdown.InputModule.js`.
 * A layout without `subpaths` falls back to the `dist/<subpath>.js` mirror rule.
 *
 * @param options - CDN base plus the package → directory map.
 * @returns Resolver for `emitPlan()`.
 */
export function createCdnResolver(options: CdnResolverOptions): AssetResolver {
  const base = options.base.endsWith("/") ? options.base : `${options.base}/`;

  const split = (specifier: string): { pkg: string; subpath: string } => {
    const parts = specifier.split("/");
    // Scoped package = "@scope/name"; everything after is the subpath.
    const pkg = parts.slice(0, 2).join("/");
    return { pkg, subpath: parts.slice(2).join("/") };
  };

  return {
    module(specifier) {
      const { pkg, subpath } = split(specifier);
      const entry = options.layout[pkg];
      if (!entry) return null;

      // Exact export wins: a package may place a subpath anywhere.
      const mapped = entry.subpaths?.[subpath ? `./${subpath}` : "."];
      if (mapped && mapped.endsWith(".js")) return `${base}${entry.dir}/${mapped}`;

      // A package with named-only exports has no valid bare specifier.
      if (!subpath) {
        if (!entry.entry || entry.bare === false) return null;
        return `${base}${entry.dir}/${entry.entry}`;
      }

      // Fallback for a layout without an exports map: dist mirrors the name.
      return `${base}${entry.dir}/dist/${subpath}.js`;
    },

    style(specifier) {
      const { pkg, subpath } = split(specifier);
      const entry = options.layout[pkg];
      if (!entry || !subpath.endsWith(".css")) return null;

      const mapped = entry.subpaths?.[`./${subpath}`];
      if (mapped && mapped.endsWith(".css")) return `${base}${entry.dir}/${mapped}`;

      // Published packages keep their sheets next to the compiled JS; a
      // CSS-only package publishes them from `src`.
      const root = entry.stylesRoot ?? "dist";
      return `${base}${entry.dir}/${root}/${subpath}`;
    },

    prefixes() {
      const map: Record<string, string> = {};
      for (const [pkg, entry] of Object.entries(options.layout)) {
        // Only JS packages need a module prefix; import maps ignore unused keys.
        if (!entry.entry) continue;
        map[`${pkg}/`] = `${base}${entry.dir}/dist/`;
      }
      return map;
    },

    exact() {
      const map: Record<string, string> = {};
      for (const [pkg, entry] of Object.entries(options.layout)) {
        // Every root is mapped: a loaded component may import a package the
        // preset itself never names (form → module-loader, for example).
        if (entry.entry && entry.bare !== false) map[pkg] = `${base}${entry.dir}/${entry.entry}`;

        // A prefix cannot add `.js`, so each concrete subpath needs its own key.
        for (const [key, file] of Object.entries(entry.subpaths ?? {})) {
          if (key === "." || key.includes("*") || !file.endsWith(".js")) continue;
          map[`${pkg}/${key.replace(/^\.\//, "")}`] = `${base}${entry.dir}/${file}`;
        }
      }
      return map;
    },
  };
}
