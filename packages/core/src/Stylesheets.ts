/**
 * Lazy stylesheet seam — one place that knows where a component's CSS lives.
 *
 * A component never imports its own stylesheet. A static `import "./Table.css"` is
 * resolved by the bundler, so the sheet rides inside the JS chunk: it is downloaded
 * with the component *and* injected again by the lazy loader, and it defeats the point
 * of loading the component on demand. Instead a builder declares
 * `stylesheet = "./X.css"`, the host declares where that file can be fetched, and this
 * module resolves the two.
 *
 * Two callers use it:
 *
 * - the `ComponentRegistry`, which injects through the `<style>` id scheme declared here;
 * - {@link ensureStylesheet} — any builder, including the ones created *outside* the
 *   registry (a table built inside a form field, a dropdown inside an input), asks for
 *   its own sheet by specifier.
 *
 * The anti-FOUC *hold* is deliberately absent: hiding an unstyled root is a lifecycle
 * detail of `Builder.create()` (which knows its own `loading()` mockup), so it lives next
 * to the builder in `@aio-ui/base/BaseAdapters/Hydration`. This module only answers "is
 * the sheet there" and "give me the sheet".
 */

/** Lazy loader for one stylesheet, returning its text (`?inline` import). */
export type iStyleLoader = () => Promise<unknown>;

/** Host-declared loaders, keyed by the module specifier the host chose. */
let assets: Record<string, iStyleLoader> = {};

/** Specifiers already injected, so a second request never re-fetches or re-inserts. */
const ready = new Set<string>();
const loading = new Map<string, Promise<void>>();

/**
 * Registers the host's stylesheet loaders.
 *
 * @param styles - The same map the host hands the `ComponentRegistry`.
 * @returns Nothing.
 *
 * @summary Called by the registry constructor: the host already declares its asset
 * maps once, and this makes the same declaration usable by builders that never pass
 * through the registry.
 */
export function useStylesheetAssets(styles: Record<string, iStyleLoader> | null | undefined): void {
  assets = styles ?? {};
}

/**
 * Normalizes a specifier to `/<specifier>` so two spellings of one sheet share a key.
 *
 * @param specifier - Specifier as declared by a component or the host.
 * @returns The normalized key (`""` for an empty specifier).
 */
export function normalizeStylesheetPath(specifier: string): string {
  if (!specifier) return "";
  let clean = specifier.trim().replace(/\\/g, "/");
  if (clean.startsWith("./")) clean = clean.slice(2);
  if (clean.startsWith("/")) clean = clean.slice(1);
  return `/${clean}`;
}

/** File name of a specifier: the fallback key when the host layout is unknown. */
function baseNameOf(specifier: string): string {
  return specifier.replace(/\\/g, "/").split("/").pop() ?? "";
}

/**
 * Finds the loader for a component's declared stylesheet.
 *
 * @param specifier - What the component declares, usually relative to itself (`"./Table.css"`).
 * @returns The loader and the key it was found under, or `undefined` when the host
 *   declares no such sheet.
 *
 * @summary A component cannot know the host's key layout, so the declaration is tried
 * as written, normalized, case-insensitively, and finally by file name — the sheet sits
 * next to the component under a name no sibling reuses.
 */
function resolveLoader(specifier: string): { key: string; load: iStyleLoader } | undefined {
  if (!specifier) return undefined;

  const candidates = [specifier, normalizeStylesheetPath(specifier)];
  for (const candidate of candidates) {
    if (typeof assets[candidate] === "function") return { key: normalizeStylesheetPath(candidate), load: assets[candidate] };
  }

  const wanted = candidates.map((candidate) => candidate.toLowerCase());
  const exact = Object.keys(assets).find((key) => wanted.includes(key.toLowerCase()));
  if (exact) return { key: normalizeStylesheetPath(exact), load: assets[exact] };

  const file = baseNameOf(specifier).toLowerCase();
  const byName = file
    ? Object.keys(assets).find((key) => baseNameOf(key).toLowerCase() === file)
    : undefined;
  return byName ? { key: normalizeStylesheetPath(byName), load: assets[byName] } : undefined;
}

/** `<style>` id for one sheet: stable across the registry path and this one. */
export function styleTagId(specifier: string): string {
  return `rajutan-lazy-css__${normalizeStylesheetPath(specifier).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

/** Whether this sheet is already part of the document (either injection path). */
export function isStyleInjected(specifier: string): boolean {
  if (typeof document === "undefined") return true;
  return Boolean(document.getElementById(styleTagId(specifier)));
}

/**
 * Whether a component's own stylesheet is still on its way.
 *
 * @param specifier - The component's declared `stylesheet` (`"./Table.css"`).
 * @returns `true` only when the host declares a loader for this sheet and the document
 *   does not have it yet — the single state in which a builder must hold its root.
 *
 * @example
 * if (isStylesheetPending("./Table.css")) return "still coming";
 *
 * @summary A component without a loader is never "pending": waiting for a sheet nobody
 *   can serve would strand the anti-FOUC hold forever. A non-DOM host (SSR, tests) has no
 *   document to be styled, so it never holds either. This is the question the hold asks
 *   *before* a root is returned — hence synchronous, unlike {@link ensureStylesheet}.
 */
export function isStylesheetPending(specifier: string): boolean {
  const resolved = resolveLoader(specifier);
  if (!resolved) return false;
  return !isStyleInjected(resolved.key);
}

/**
 * Writes a stylesheet into the document as a real `<style>` element.
 *
 * @param rawCss - Stylesheet text as returned by the loader.
 * @param specifier - Specifier the text belongs to; drives the element id and dedupe.
 * @returns Nothing.
 *
 * @summary A `<style>` node (not `adoptedStyleSheets`) so the sheet is visible in
 * DevTools, and idempotent by id so the registry and {@link ensureStylesheet} can both
 * ask for the same sheet without duplicating rules.
 */
export function injectLazyCss(rawCss: string, specifier: string): void {
  if (!rawCss || typeof document === "undefined") return;

  const id = styleTagId(specifier);
  if (document.getElementById(id)) return;

  const style = document.createElement("style");
  style.id = id;
  style.setAttribute("data-lazy-component", "true");
  style.textContent = rawCss;
  document.head.appendChild(style);
}

/**
 * Replaces the text of an already injected sheet — the dev-only hot path.
 *
 * @param rawCss - New stylesheet text.
 * @param specifier - Specifier the text belongs to; the same one the sheet was injected under.
 * @returns Nothing.
 *
 * @summary Injection stays lazy by default: {@link injectLazyCss} never touches an
 * existing sheet, so editing a file changes nothing on screen until something asks again.
 * A stylesheet watcher (Vite's HMR, a file watcher) needs the opposite: keep the element,
 * swap its text, and skip the reload. That is why this is a **separate, opt-in function**
 * instead of a flag on the injector — no production path can reach it by accident, and a
 * sheet that has not arrived yet simply falls back to the normal lazy injection.
 *
 * ```ts
 * import.meta.hot?.on("vite:afterUpdate", async ({ updates }) => {
 *   for (const file of updates) replaceLazyCss(await textOf(file), specifierOf(file));
 * });
 * ```
 */
export function replaceLazyCss(rawCss: string, specifier: string): void {
  if (!rawCss || typeof document === "undefined") return;

  const tag = document.getElementById(styleTagId(specifier)) as HTMLStyleElement | null;
  // Nothing to replace: behave exactly like the lazy path, so a caller can use this for
  // both "first paint" and "hot update" without checking first.
  if (!tag) {
    injectLazyCss(rawCss, specifier);
    return;
  }

  tag.textContent = rawCss;
}

/**
 * Makes sure one component's stylesheet is present.
 *
 * @param specifier - The component's declared `stylesheet` (`"./Table.css"`).
 * @returns A promise resolved once the sheet is in the document, or immediately when
 *   the host declares no loader for it (never a rejection: style is not fatal).
 *
 * @example
 * void ensureStylesheet("./Table.css"); // a table built outside the registry
 *
 * @summary The one call the hydration hold makes: `Builder.create()` asks for its own
 *   sheet, so a component a builder constructs directly (never through the registry) is
 *   styled by the same loader. It is a no-op when the sheet already arrived, so the two
 *   paths cannot double-inject.
 */
export function ensureStylesheet(specifier: string): Promise<void> {
  const resolved = resolveLoader(specifier);
  if (!resolved) return Promise.resolve();
  // "Ready" means present: a document that lost the tag (a host tearing its head
  // down between renders) must not be remembered as styled.
  if (ready.has(resolved.key)) {
    if (isStyleInjected(resolved.key)) return Promise.resolve();
    ready.delete(resolved.key);
  }
  if (isStyleInjected(resolved.key)) {
    ready.add(resolved.key);
    return Promise.resolve();
  }

  const inflight = loading.get(resolved.key);
  if (inflight) return inflight;

  const session = Promise.resolve()
    .then(() => resolved.load())
    .then((module) => {
      const raw = typeof module === "string"
        ? module
        : (module as { default?: unknown })?.default;
      if (typeof raw !== "string") {
        console.warn(`[stylesheets] loader for "${resolved.key}" returned ${typeof module}, not CSS text — skipped`);
        return;
      }
      injectLazyCss(raw, resolved.key);
      ready.add(resolved.key);
    })
    .catch((error) => {
      console.warn(`[stylesheets] could not load "${resolved.key}":`, error);
    })
    .finally(() => {
      loading.delete(resolved.key);
    });

  loading.set(resolved.key, session);
  return session;
}
