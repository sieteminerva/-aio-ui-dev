import type { iBasicNode, iBuilderRegistry } from "./interface";
import type { iEventEmit } from "./types/events";
import { Registry } from "./Registry";
import { getBuilderAdapter } from "./BuilderPort";
import { injectLazyCss, isStyleInjected, useStylesheetAssets } from "./Stylesheets";

/**
 * Layered config for one build: `theme < emitter < manifest < node`.
 *
 * The emitter sits above the theme so every builder gets a publisher even when a theme
 * configured it, and below the manifest/node so a component can still set its own — or
 * silence it with `emit: null`. Selectors are merged across the three layers so a node
 * that overrides one key keeps the rest.
 *
 * Pure and exported: the merge is the one part of `build()` that can be pinned down
 * without a DOM.
 */
export function mergeBuildConfig(
  theme: Record<string, any> | undefined,
  emitter: iEventEmit | null,
  manifest: Record<string, any> | undefined,
  node: Record<string, any> | undefined
): Record<string, any> {
  const merged: Record<string, any> = { ...theme };
  if (emitter) merged.emit = emitter;
  if (manifest) Object.assign(merged, manifest);

  const user = node ?? {};
  Object.assign(merged, user);

  // Selectors merge *per key and per property*: a node that overrides `{ "@menu": { id } }`
  // keeps the theme's other `@menu` properties instead of dropping the whole object.
  const selectors: Record<string, any> = {};
  for (const source of [theme, manifest, user]) {
    if (!source?.selectors || typeof source.selectors !== "object") continue;
    for (const [key, value] of Object.entries(source.selectors)) {
      const previous = selectors[key];
      selectors[key] = isPlainRecord(previous) && isPlainRecord(value) ? { ...previous, ...value } : value;
    }
  }
  if (Object.keys(selectors).length) merged.selectors = selectors;
  else delete merged.selectors;

  return merged;
}

/**
 * Component manifest — the single registration shape.
 *
 * A component package describes how to load itself and how to configure itself.
 * The registry never receives a class, an element, or a promise directly.
 */
export interface iComponentManifest {
  /** Module specifier or host path used to load the component module. */
  path: string;
  /** Stylesheet specifier. Derived from `path` when omitted and `path` is a file. */
  stylesheet?: string;
  /**
   * Named export holding *this* component's builder.
   *
   * A package that ships several builders (`@aio-ui/product` has card, grid and detail)
   * cannot be registered twice by pointing both words at the same `path`: without a name
   * the loader takes `default`, then the first exported function — so both words would
   * resolve to the same class. Naming the export is the only honest way to say which one
   * this registration means.
   */
  export?: string;
  /** Default configuration, merged beneath the node's own config. */
  config?: any;
  /** Payload handed to the builder. When omitted, the node content is used. */
  schema?: any;
  /** Sub-modules this component owns, loaded alongside it. */
  modules?: iComponentModuleRef[];
}

/** A sub-module a component declares (engine, adapter, adapter). */
export interface iComponentModuleRef {
  /** Stable id inside the owning component, e.g. `validation`. */
  id: string;
  /**
   * Module specifier. When omitted, `id` is treated as the name of another
   * registered component: its own manifest (path, stylesheet, nested modules) is
   * honoured, so a component registered standalone works as a sub-module without
   * being declared again.
   */
  path?: string;
  /**
   * Named export to take from the module. Adapters and handlers are usually one
   * export among several; without this the registry picks `default`, then the
   * first exported function, then the namespace object.
   */
  export?: string;
  /**
   * Which slot or role inside the component this module fills.
   *
   * @summary Free-form on purpose — the registry does not care, the component does.
   * In a page-level or composite component, `scope` names the slot or role this module
   * targets (e.g. `form` → `"adapter"`, `product` → `"grid"` / `"detail"`).
   * A component that nests another builder (`form` → `input`) uses it to route a
   * resolved module to the right preset instead of dumping everything into one bag:
   * `"input"` modules become the field-level adapter set, `"form"` (or omitted) the
   * component's own. The module `id` stays authoritative; `scope` documents intent and slot mapping.
   */
  scope?: string;
  stylesheet?: string;
  config?: any;
}

/**
 * One registration signature, no variants: every entry returns a manifest.
 */
export type RegisterFn<K extends keyof iBuilderRegistry> =
  (data: iBuilderRegistry[K]) => iComponentManifest;

/**
 * Asset loader maps supplied by the HOST application.
 *
 * `import.meta.glob` resolves patterns relative to the application that declares
 * them, so a reusable package cannot own these maps: the keys belong to the host
 * layout. The host passes both maps in the constructor, which also lets a
 * generated project point at its own component directory.
 */
export interface iComponentAssetMaps {
  /** Script loaders keyed by Vite module path, e.g. `/src/lib/Components/Table/Table.ts`. */
  modules: Record<string, () => Promise<any>>;
  /** Inline stylesheet loaders keyed by Vite CSS path. */
  styles: Record<string, () => Promise<any>>;
}

function normalizeVitePath(pathStr: string): string {
  if (!pathStr) return "";
  let clean = pathStr.trim().replace(/\\/g, "/");
  if (clean.startsWith("./")) clean = clean.slice(2);
  if (clean.startsWith("/")) clean = clean.slice(1);
  // Paths are project-root relative. No `src/` assumption: the host decides
  // where its components live and supplies the matching glob keys.
  return `/${clean}`;
}

function resolveRelativePath(baseScriptPath: string, stylePath: string): string {
  if (!stylePath) return "";
  if (!stylePath.startsWith("./") && !stylePath.startsWith("../")) {
    return stylePath;
  }
  if (!baseScriptPath) return stylePath;
  const scriptDir = baseScriptPath.substring(0, baseScriptPath.lastIndexOf("/") + 1);
  return (scriptDir + stylePath.replace(/^\.\//, "")).replace(/\/+/g, "/");
}

// 🔎 Lookup helper untuk peta glob CSS: exact match dulu, lalu scan case-insensitive
// (Windows FS longgar soal case, tapi KEYS hasil import.meta.glob tidak toleran salah case)
function findStyleLoader(map: Record<string, () => Promise<any>>, key: string): (() => Promise<any>) | undefined {
  if (!key) return undefined;
  if (typeof map[key] === "function") return map[key];
  const lower = key.toLowerCase();
  const matched = Object.keys(map).find(k => k.toLowerCase() === lower);
  return matched ? map[matched] : undefined;
}

const DEV = (import.meta as any).env?.DEV === true;

/**
 * Narrow a value to a plain object record (not array, element, or null).
 *
 * The `Element` guard is skipped when the global is absent, so the registry can be
 * exercised outside a browser (tests, future server-side rendering).
 */
function isPlainRecord(value: unknown): value is Record<string, any> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return typeof Element === "undefined" || !(value instanceof Element);
}

/**
 * Collects the component names a page source needs, in discovery order.
 *
 * Two shapes are recognised:
 *
 * - node trees: a `builder` field naming **one** component — the node the renderer
 *   builds. A route that mounts several components declares them on the registry
 *   (`iComponentRoute` in `@aio-ui/app`), not on a node;
 * - page blocks: a `type` field paired with a table binding (`{ type: "masonry",
 *   source: "portfolio" }`). The `source` requirement keeps input descriptors out,
 *   because they also carry a `type` (`{ type: "text" }`) that is not a component.
 *
 * `builder` is a reserved key, so a declaration there can never leak into the DOM.
 *
 * The walk is depth-first, cycle-safe, and ignores everything it does not recog-
 * nise, so it can be run on raw CMS output without validation.
 *
 * @param source - Page content, array, or any nested structure.
 * @returns Unique component names, in the order they were first seen.
 */
export function collectComponentNames(source: unknown): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  const visited = new Set<unknown>();

  const walk = (value: unknown): void => {
    if (typeof value !== "object" || value === null || visited.has(value)) return;
    visited.add(value);

    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }

    const record = value as Record<string, any>;
    const declared = record.builder;
    // `builder` names one component. Anything else is ignored, not guessed: a node is
    // one component, and a route's component list belongs to the registry plan.
    const declaredNames = typeof declared === "string" ? [declared] : [];
    const type = typeof record.type === "string" && "source" in record ? record.type : undefined;
    const names = type ? [...declaredNames, type] : declaredNames;

    for (const name of names) {
      if (!seen.has(name)) {
        seen.add(name);
        found.push(name);
      }
    }

    for (const key of Object.keys(record)) walk(record[key]);
  };

  walk(source);
  return found;
}

export class ComponentRegistry {
  /** Slot this class fills when registered as an app module. */
  static readonly slot = "registry" as const;

  /**
   * 🧱 Builder storage backed by the generic registry kernel.
   *
   * `duplicate: "replace"` preserves the previous silent-overwrite behaviour
   * that HMR and preset rebuilds depend on. Lazy loading, stylesheet injection,
   * and hydration gating stay in this adapter — the kernel only stores values.
   */
  private builders = new Registry<RegisterFn<any>>("component", { duplicate: "replace" });

  /** Host-supplied lazy loaders for component scripts and stylesheets. */
  #assets: iComponentAssetMaps;

  /**
   * Publisher handed to every builder config.
   *
   * Set once by the host (`useEmitter`) instead of being threaded through every node, so
   * a component is never asked whether the application has an event bus — it just calls
   * `config.emit?.(...)`, which stays `undefined` when the host registered no emitter.
   */
  #emitter: iEventEmit | null = null;

  /**
   * @summary Stores the host asset maps used for every lazy component load.
   * @param assets - Vite glob maps declared by the host application.
   *
   * The style map is also published to the shared stylesheet seam, so a component
   * built *outside* the registry (a table inside a form field) can still get its CSS
   * without importing it — a static CSS import would ride along in the JS chunk and be
   * injected twice.
   */
  constructor(assets: iComponentAssetMaps) {
    this.#assets = assets;
    useStylesheetAssets(assets.styles);
  }

  /**
   * Attaches the publisher every subsequent build receives.
   *
   * Optional by design: a host without an event bus never calls it, and the configs it
   * builds simply have no `emit`. Passing `null` detaches.
   *
   * @param emit - Publisher, or `null` to stop forwarding component events.
   * @returns The current registry instance.
   */
  public useEmitter(emit: iEventEmit | null): this {
    this.#emitter = emit;
    return this;
  }

  private registeredSheets = new Set<CSSStyleSheet>();
  // 💡 Deklarasikan cache secara formal agar tipe data aman dan tidak memakai (this as any)
  private _resolvedCache = new Map<string, any>();

  /** Sub-modules resolved per component name: `componentName → { moduleId → module }`. */
  private _modules = new Map<string, Record<string, unknown>>();

  private _dynamicConfigs = new Map<keyof iBuilderRegistry, Record<string, any>>();

  // 🧊 ANTI-FOUC LEDGER: jejek siap-notnya stylesheet lazy (normalized vite path)
  // serta janji pemuatan yang sedang berjalan agar build() paralel tidak dobel-fetch.
  private _stylesReady = new Set<string>();
  private _stylesLoading = new Map<string, Promise<void>>();

  /** Components currently being loaded, so a `modules` cycle cannot recurse forever. */
  private _loading = new Set<string>();

  /**
   * 🚀 POST-LAUNCH FLIPPER (O(1) RELEASE VIA POINTER data-loaded)
   * Dipanggil SETELAH promise style lazy terselesaikan (sukses/gagal).
   * Pelepasan didelegasikan ke HydrationGate (instance.hydration.release(actualElement)):
   * satu penulis marker di Base — `--is-loading: 0` + hapus `data-hydrating`
   * + pasang `data-loaded="true"` pada elemen puncak yang memang dipegang
   * registry. Rule CSS `[data-loaded="true"] *` lalu memaksa SELURUH
   * keturunan membaca --is-loading: 0 (pointer permanen untuk anak-anak),
   * tanpa forEach/querySelectorAll/observer — aman page-switching brutal.
   */
  private _launchPostLoadInstance(instance: any, stylePending: Promise<void>, actualElement?: HTMLElement | null): void {
    if (!instance) return;


    // 🛡️ Fail-open: error jaringan/chunk tetap WAJIB melepas pembekuan
    // agar konten tidak mati selamanya di balik shimmer.
    stylePending.catch(() => null).finally(() => {
      try {
        // Builder package plugged in through the port: it owns the gate type and
        // the fallback marker writer, so core never learns about either.
        getBuilderAdapter()?.releaseHydration(instance, actualElement);
      } catch (releaseError) {
        console.warn("[ComponentRegistry] Hydration release skipped:", releaseError);
      }
      instance.isLoaded = true;

    });
  }

  /**
   * Registers a component factory under a stable name.
   *
   * @summary Delegates storage to the registry kernel, then returns this instance for fluent registration.
   * @param name - Public component identifier.
   * @param builderFn - Polymorphic registration function (direct builder, loadable builder, or manifest).
   * @returns The current registry instance.
   * @example
   * registry.register("masonry", masonryBuilder);
   */
  public register<K extends keyof iBuilderRegistry>(name: K, builderFn: RegisterFn<K>): this {
    // Step 1: Delegate storage; the kernel applies the `replace` duplicate policy.
    this.builders.register(String(name), builderFn);
    return this;
  }

  /**
   * Lists every registered component name.
   *
   * @summary Exposes the kernel's insertion-ordered ids so callers can preload components.
   * @returns Registered component names in registration order.
   */
  public getRegisteredNames(): string[] {
    return this.builders.ids();
  }

  /**
   * Resolves a registered component factory.
   *
   * @summary Returns `undefined` for unknown names so legacy call sites that test the result keep working.
   * @param name - Public component identifier.
   * @returns The registration function, or `undefined` when the name is not registered.
   */
  public get(name: string) {
    if (this.has(name)) {
      return this.builders.resolve(name) ?? undefined;
    }
  }

  /**
   * Checks whether a component name is registered.
   *
   * @param name - Public component identifier.
   * @returns `true` when a factory is registered under `name`.
   */
  public has(name: string): boolean {
    return this.builders.has(name);
  }

  private async loadModule(script?: string, stylesheet?: string, componentName?: string, exportName?: string): Promise<any> {
    let jsModule: any = null;
    let rawCss: any = null;

    // 1. Memuat File JavaScript/TypeScript (Berlaku untuk Dev & Prod)
    if (script) {
      const normScript = normalizeVitePath(script);
      // Mencari di dalam modul glob yang sudah dipaksa pecah chunk oleh Vite
      const jsLoader = this.#assets.modules[normScript] || this.#assets.modules[script];

      if (typeof jsLoader === "function") {
        jsModule = await jsLoader(); // HMR aktif di dev, Code-split aktif di prod build!
      }
    }

    // Ekstrak nilai yang diminta: export bernama, default, fungsi pertama, atau namespace.
    if (DEV && jsModule && !exportName) {
      const candidates = Object.entries(jsModule).filter(([k, v]) => {
        if (k === "default") return false;
        return typeof v === "function" || (v && typeof (v as any).create === "function");
      });
      if (candidates.length > 1) {
        console.warn(
          `[ComponentRegistry] module "${script}" exports ${candidates.length} candidates ` +
          `(${candidates.map(([k]) => `"${k}"`).join(", ")}), but no "export" was declared in the manifest ` +
          `for component "${String(componentName)}". The loader fell back to the first candidate. ` +
          `Declare 'export: "<name>"' in the manifest to remove ambiguity.`
        );
      }
    }

    const builderClass = !jsModule
      ? null
      : exportName
        ? (jsModule[exportName] ?? jsModule?.default?.[exportName] ?? null)
        : (jsModule.default
          || Object.values(jsModule).find(v => typeof v === 'function' || (v && typeof (v as any).create === 'function'))
          || jsModule);
    // console.log({ builderClass, stylesheet })
    // 2. Memuat File CSS (Menggunakan inline query untuk Constructable Stylesheets)
    let effectiveStyle: string | CSSStyleSheet | undefined = stylesheet;
    if (!effectiveStyle && builderClass) {
      effectiveStyle = builderClass?.stylesheet || builderClass.prototype?.stylesheet;
    }
    // Turunkan path stylesheet dari script — aturan yang sama dengan derivasi
    // manifest di build() — agar load() ikut memuat stylesheet. Hanya berlaku
    // bila `script` benar-benar berkas berskrip; specifier paket tidak punya CSS
    // bersebelahan, dan dulu diperlakukan sebagai path CSS (lalu gagal).
    if (!effectiveStyle && script && /\.[cm]?[jt]sx?$/.test(script)) {
      effectiveStyle = script.replace(/\.[cm]?[jt]sx?$/, ".css");
    }

    if (effectiveStyle) {
      if (typeof CSSStyleSheet !== "undefined" && effectiveStyle instanceof CSSStyleSheet) {
        this.injectStyle(effectiveStyle);
      } else if (typeof effectiveStyle === "string") {
        const resolvedCssPath = script ? resolveRelativePath(script, effectiveStyle) : effectiveStyle;
        const normCss = normalizeVitePath(resolvedCssPath);

        // Ambil loader CSS inline (exact → case-insensitive scan via findStyleLoader)
        const cssLoader = findStyleLoader(this.#assets.styles, normCss)
          || findStyleLoader(this.#assets.styles, resolvedCssPath)
          || findStyleLoader(this.#assets.styles, effectiveStyle);

        if (typeof cssLoader === "function") {
          rawCss = await cssLoader(); // Mengembalikan string CSS mentah berkat properti ?inline

          // 🛡️ Normalisasi bentuk modul: sebagian mode/transform Vite dapat mengembalikan
          // namespace modul alih-alih langsung string — tarik .default bila ada.
          if (rawCss && typeof rawCss === "object" && "default" in rawCss) {
            rawCss = (rawCss as any).default;
          }

          if (typeof rawCss === "string") {
            this.injectCssString(rawCss, normCss);
            // 🧊 ANTI-FOUC LEDGER: setiap injeksi stylesheet via loadModule (termasuk
            // saat preload) wajib menandai kunci yang SAMA dengan yang dihitung build()
            // (normalizeVitePath). Tanpa ini, build() menganggap style belum siap →
            // re-fetch + dobel-adoption sheet + jeda hold yang sia-sia.
            this._stylesReady.add(normCss);
            // if (DEV) console.info(`[ComponentRegistry] 🎨 stylesheet injected: ${normCss} (${rawCss.length} chars)`);
          } else if (DEV) {
            console.warn(`[ComponentRegistry] ⚠️ CSS loader returned non-string for ${normCss} (got: ${typeof rawCss}) — stylesheet skipped`);
          }
        } else if (DEV) {
          console.warn(`[ComponentRegistry] ⚠️ no CSS loader found for "${normCss}" (also tried: "${resolvedCssPath}", "${effectiveStyle}") — check the .css file name/case beside the .ts, or add stylesheet to the manifest`);
        }
      }

    } else if (/* import.meta.env?.DEV && */ componentName && !effectiveStyle) {
      // console.warn(`[ComponentRegistry] Warning: No stylesheet provided or defined for component "${String(componentName)}".`);
    }

    return builderClass;
  }


  /**
   * Resolves every component a page source needs, without the caller listing them.
   *
   * This is the default entry point: a route only has to hand over its content,
   * and the registry derives the set itself (see `collectComponentNames`). `load()`
   * stays public for callers that already know the names, or need query data.
   *
   * @param source - Page content, block list, or any nested structure.
   * @returns The component names that were resolved, in discovery order.
   */
  public async loadFor(source: unknown): Promise<string[]> {
    const names = collectComponentNames(source);
    if (names.length) await this.load(names, [source]);
    return names;
  }

  /**
   * Derives the component names a source needs, without loading anything.
   *
   * Exposed so a host (for example `@aio-ui/app`) can inspect a route before the
   * render pass without importing `collectComponentNames` directly — that keeps the
   * dependency between app and core type-only at runtime.
   *
   * @param source - Page content, block list, or any nested structure.
   * @returns Unique component names, in discovery order.
   */
  public collect(source: unknown): string[] {
    return collectComponentNames(source);
  }

  /**
   * Resolves component modules and stylesheets ahead of a render pass.
   *
   * Paired with `build()`: `load()` is always asynchronous and fills the resolved
   * cache, while `build()` stays synchronous and reads from it. A component that
   * was never loaded cannot be built.
   *
   * @param componentNames - Registered component names to resolve.
   * @param pagesData - Source tree used to find each component's node config.
   */
  public async load(componentNames: string[], pagesData: any[] = []): Promise<void> {
    for (const nameKey of componentNames) {
      const name = nameKey as keyof iBuilderRegistry;

      // Step 1: A component already in flight is skipped; this also makes a
      // two-way `modules` reference (form → table → form) safe.
      if (this._loading.has(String(name))) continue;

      const fn = this.builders.resolve(String(name));
      if (!fn) continue;

      // @ts-ignore (Mempertahankan fungsionalitas pencarian framework bawaan Anda)
      const matchedData = this.getBuilderNode(pagesData as iBasicNode[], name as string);

      try {
        this._loading.add(String(name));
        const manifest = fn((matchedData || {}) as iBuilderRegistry[typeof name]);
        if (manifest?.path || manifest?.stylesheet) {
          const loadedClass = await this.loadModule(manifest.path, manifest.stylesheet, name as string, manifest.export);
          if (loadedClass) this._resolvedCache.set(name as string, loadedClass);
        }
        await this.loadModules(name as string, manifest);
      } catch (err) {
        console.error(`[ComponentRegistry] load failed for "${String(nameKey)}":`, err);
        throw err;
      } finally {
        this._loading.delete(String(name));
      }
    }
  }

  /**
   * Resolves the sub-modules a component declares in its manifest.
   *
   * Each module is cached under a namespaced key (`form:table`) so a module id
   * shared by two components never collides. A module that cannot be resolved is
   * reported and skipped: the component still loads, and `Builder.module(id)`
   * decides how to degrade at use time.
   *
   * @param componentName - Owner of the modules.
   * @param manifest - The component manifest that declares them.
   */
  private async loadModules(componentName: string, manifest: iComponentManifest): Promise<void> {
    const refs = manifest.modules;
    if (!refs?.length) return;

    const resolved: Record<string, unknown> = this._modules.get(componentName) ?? {};
    for (const ref of refs) {
      if (resolved[ref.id] !== undefined) continue;

      // A module without a path names another registered component. Delegate to
      // its own entry so its manifest, stylesheet and nested modules are honoured.
      if (!ref.path) {
        if (!this.has(ref.id)) {
          if (DEV) {
            console.warn(
              `[ComponentRegistry] module "${ref.id}" of "${componentName}" is neither a path nor a registered component.`,
            );
          }
          continue;
        }
        await this.load([ref.id]);
        const registered = this._resolvedCache.get(ref.id);
        if (registered !== undefined) {
          resolved[ref.id] = registered;
          this._resolvedCache.set(`${componentName}:${ref.id}`, registered);
        }
        continue;
      }

      const cacheKey = `${componentName}:${ref.id}`;
      const loaded = await this.loadModule(ref.path, ref.stylesheet, cacheKey, ref.export);

      if (loaded !== undefined && loaded !== null) {
        resolved[ref.id] = loaded;
        this._resolvedCache.set(cacheKey, loaded);
      } else if (DEV) {
        console.warn(
          `[ComponentRegistry] module "${ref.id}" of "${componentName}" could not be resolved from "${ref.path}"` +
          `${ref.export ? ` (export "${ref.export}")` : ""}.`,
        );
      }
    }
    this._modules.set(componentName, resolved);
  }

  /**
   * ⚡ AMAN & SINKRONUS MURNI (.run Method)
   */


  public build<K extends keyof iBuilderRegistry>(name: K, data: any): HTMLElement {
    const fn = this.builders.resolve(String(name));
    if (!fn) {
      throw new Error(`[ComponentRegistry] No builder registered for "${String(name)}".`);
    }

    // 1. Every registration returns a manifest: there are no variants to detect.
    const manifest = fn(data);
    const manifestConfig = manifest.config;
    const cssPath = manifest.stylesheet
      ?? (/\.[cm]?[jt]sx?$/.test(manifest.path) ? manifest.path.replace(/\.[cm]?[jt]sx?$/, ".css") : undefined);

    // 2. Content payload: the manifest wins; otherwise the node content is used.
    const activeThemeConfig = this._dynamicConfigs.get(name) || {};
    const nodeRecord = isPlainRecord(data) ? data : null;
    const contentPayload = manifest.schema !== undefined
      ? manifest.schema
      : (nodeRecord && nodeRecord.content !== undefined ? nodeRecord.content : data);

    // 4. Merge config — PRIORITAS = tema < emitter < manifest (default registrasi) < userConfig (instance/node).
    //    Instance (node.config) menang atas default registrasi; tema jadi lapisan terbawah.
    //    `selectors` digabung sehingga override parsial (mis. sidebar hanya mengirim
    //    `{ "@menu": { id } }`) tidak menimpa seluruh selectors default milik builder.
    const userConfig = nodeRecord ? (nodeRecord.config || {}) : {};
    const finalMergedConfig = mergeBuildConfig(activeThemeConfig, this.#emitter, manifestConfig, userConfig);

    if (nodeRecord && nodeRecord.config) {
      nodeRecord.config = finalMergedConfig;
    }

    // 5. 🧊 GAYA MUNDUR CERDAS (MANIFEST CSS): muat stylesheet Manifest sambil
    //    MENAHAN pembangunan visual sampai style benar-benar terinjeksi.
    //    Versi lama membiarkan loadModule jalan tanpa awaits (= penyebab FOUC:
    //    DOM terlanjur tampil telanjang menunggu CSS datang belakangan).
    let stylePending: Promise<void> = Promise.resolve();
    if (cssPath) {
      // Kunci normalisasi HARUS identik dengan resolusi internal loadModule
      // (dipanggil tanpa script di jalur ini → langsung normalizeVitePath).
      const styleKey = normalizeVitePath(cssPath);
      const inflight = this._stylesLoading.get(styleKey);

      if (!inflight) {
        // Belum pernah dimuat sama sekali → mulai sesi load baru.
        const session = this.loadModule(undefined, cssPath, name as string)
          .then(() => { this._stylesReady.add(styleKey); })
          .catch(() => null)
          .then(() => { this._stylesLoading.delete(styleKey); }) as Promise<void>;
        this._stylesLoading.set(styleKey, session);
        stylePending = session;
      } else if (!this._stylesReady.has(styleKey)) {
        // Ada pemuatan lintas-build yang masih menggantung → ikuti janji yang sama.
        stylePending = inflight;
      }
      // Skenario ketiga (_stylesReady sudah memuat styleKey): style dijamin
      // terinjeksi — jalur sinkron tanpa penahanan apapun (bebas jeda ulang).
    }

    // 6. Kembalikan ke logika eksekusi cache standar
    const cachedClass = this._resolvedCache.get(name as string);
    if (cachedClass && typeof cachedClass === "function") {
      try {
        const instance = new cachedClass(finalMergedConfig);
        if (instance && typeof instance.create === "function") {
          // Hand over the sub-modules resolved during load(); a builder without
          // a provideModules() implementation simply ignores them.
          const resolvedModules = this._modules.get(String(name));
          if (resolvedModules && typeof instance.provideModules === "function") {
            instance.provideModules(resolvedModules);
          }
          // 🧊 TOGGLE FASE: tandakan instance belum "loaded" SEBELUM create();
          // create() menempel marker hold pada SATU elemen puncaknya saja.
          instance.isLoaded = false;
          const builtElement = instance.create(contentPayload, finalMergedConfig);
          if (!builtElement) {
            throw new Error(`[ComponentRegistry] Builder "${String(name)}" created a null element. Check prepare()/create() or selector definitions.`);
          }
          // ✅ STYLE MATANG → HydrationGate.release(): --is-loading 0 + hapus
          // data-hydrating + data-loaded="true" (pointer pelepasan subtree).
          this._launchPostLoadInstance(instance, stylePending, builtElement);
          return builtElement;
        }
      } catch (error) {
        throw error instanceof Error ? error : new Error(`[ComponentRegistry] Failed to instantiate "${String(name)}": ${String(error)}`);
      }
    }

    throw new Error(
      `[ComponentRegistry] Builder "${String(name)}" could not produce a DOM element. ` +
      `Its module was not preloaded, or the class is not a Builder.`,
    );
  }

  private injectStyle(sheet: CSSStyleSheet): void {
    if (!this.registeredSheets.has(sheet)) {
      this.registeredSheets.add(sheet);
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    }
  }

  /**
   * 🎯 Penanam CSS mentah sebagai elemen <style id="…"> NYATA di <head>.
   *
   * Mengapa tidak lagi mengandalkan Constructable Stylesheet
   * (document.adoptedStyleSheets)? Stylesheet yang di-`adopt` TIDAK muncul
   * sebagai node DOM — Anda buka DevTools > Elements, cari <style>/<link>,
   * tidak ada → tampak "stylesheet tidak loaded" padahal sesungguhnya CSS
   * sudah ter-pakai. Elemen <style> nyata membuat inject gampang diverifikasi.
   *
   * Selain itu ini juga lebih andal daripada jalur CSSOM: beberapa browser
   * melempar SyntaxError dari replaceSync pada CSS modern mentah (nesting,
   * @starting-style, ::picker, position-area, dst) — yang dulu membuat
   * stylesheet diam-diam TIDAK pernah masuk DOM sama sekali.
   *
   * Id `<style>` dan dedupe-nya milik seam bersama (`Stylesheets`), sehingga
   * komponen yang dibangun DI LUAR registry (tabel di dalam field form) memakai
   * jalur injeksi yang sama dan tidak pernah menghasilkan style ganda.
   */
  private injectCssString(rawCss: string, normCss: string): void {
    if (!rawCss || isStyleInjected(normCss)) return;

    injectLazyCss(rawCss, normCss);

    if (DEV) {
      // console.log(`[ComponentRegistry] 📦 stylesheet injected: ${normCss} (${rawCss.length} chars)`);
    }
  }

  public setConfig(builderName: keyof iBuilderRegistry, newConfig: Record<string, any>): void {
    console.log(`[Registry Config Central] Storing live configuration inject request for: "${String(builderName)}"`);

    // Lakukan deep-merge terisolasi di dalam Map agar selectors kustom tema tidak hilang saling menimpa
    const existingConfig = this._dynamicConfigs.get(builderName) || {};
    this._dynamicConfigs.set(builderName, {
      ...existingConfig,
      ...newConfig,
      selectors: {
        ...(existingConfig.selectors || {}),
        ...(newConfig.selectors || {})
      }
    });

    console.log(`[Registry Success] Configuration for "${String(builderName)}" officially sealed in dynamic config state.`);
  }

  public clear(): void {

    this._dynamicConfigs.clear();
    this.registeredSheets = new Set<CSSStyleSheet>();

    // NOTE: builder registrations are intentionally preserved. The previous
    // implementation never cleared them either; wiping them here would break
    // route changes and preset rebuilds that rely on existing registrations.

    getBuilderAdapter()?.resetCounters();

    // console.log(`🧹 [ComponentRegistry]: Cleaned node registries and instance identity counters.`);
  }

  public destroy() {

  }

  public getBuilderNode(nodes: iBasicNode[] | iBasicNode, name: string, visited = new Set()): iBasicNode | undefined {
    // 1. Validasi tipe data: abaikan jika bukan object atau null
    if (typeof nodes !== 'object' || nodes === null) {
      return undefined;
    }

    // 2. Cegah Circular Reference
    if (visited.has(nodes)) {
      return undefined;
    }

    // Tandai object ini sebagai 'sudah dikunjungi'
    visited.add(nodes);

    // 3. Langsung kembalikan jika nodes itu sendiri adalah builder yang dicari
    if ('builder' in nodes && (nodes as any).builder === name) {
      return nodes;
    }

    // 4. Proses jika nodes berbentuk Array
    if (Array.isArray(nodes)) {
      for (const item of nodes) {
        const found = this.getBuilderNode(item, name, visited);
        if (found) return found; // Jika ketemu, langsung return
      }
    }
    // 5. Proses jika nodes berbentuk Object (nested)
    else {
      for (const key in nodes) {
        if (Object.prototype.hasOwnProperty.call(nodes, key)) {
          const found = this.getBuilderNode((nodes as any)[key], name, visited);
          if (found) return found; // Jika ketemu, langsung return
        }
      }
    }

    return undefined;
  }

}



