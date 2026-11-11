/**
 * Dev-only hot-swap for component stylesheets that the host injects itself.
 *
 * A component never imports its own CSS. The example host loads the sheet as text
 * (`@aio-ui/masonry/Masonry.css?inline`) and writes it into a `<style>` element whose id
 * comes from the specifier (`packages/core/src/Stylesheets.ts`). Vite does not own that
 * element, so its normal CSS HMR cannot update it — and invalidating the `?inline` module
 * has no accepting importer, which is what turns a colour tweak into a full reload.
 *
 * This plugin takes those files away from Vite and pushes the text over the websocket
 * instead. The client handler in each example (`import.meta.hot.on("lazy-css", …)`) swaps
 * the element's `textContent`, so state, scroll position and the component tree survive.
 *
 * Scope is deliberately narrow:
 * - only `.css` files under `packages/` (`@aio-ui/styles/index.css`, theme sheets and
 *   `examples/**` keep Vite's own handling);
 * - only when the file is really consumed as `?inline` — a statically imported sheet is
 *   left to Vite, because there is no injected element to swap;
 * - the specifier is read from the nearest `package.json` **exports map**, so a published
 *   alias (`./file-uploader.css` → `FileUploader/FileUploader.css`) resolves to the same
 *   key the host declares. A path-derived key would miss every aliased sheet.
 *
 * Build is untouched (`apply: "serve"`): production keeps the bundled, minified CSS.
 */
import fs from "node:fs";
import path from "node:path";

const toPosix = (value) => value.split(path.sep).join("/");

/** Nearest `packages/<pkg>/package.json` for a file, without escaping `packages/`. */
function nearestPackage(file, packagesDir) {
  let dir = path.dirname(file);
  while (dir === packagesDir || dir.startsWith(`${packagesDir}/`)) {
    const manifest = path.join(dir, "package.json");
    if (fs.existsSync(manifest)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(manifest, "utf8"));
        if (typeof pkg.name === "string" && pkg.name) return { dir, pkg };
      } catch {
        return null; // a broken manifest is not worth guessing around
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Host-facing specifier for one CSS file: the export subpath that points at it, or the
 * plain path inside the package when the sheet is not exported.
 */
function specifierOf(file, packagesDir) {
  const found = nearestPackage(file, packagesDir);
  if (!found) return null;

  const relative = toPosix(path.relative(found.dir, file));
  for (const [subpath, target] of Object.entries(found.pkg.exports ?? {})) {
    // Conditional exports (objects) are skipped: stylesheets are published as strings.
    if (typeof target !== "string") continue;
    if (toPosix(target).replace(/^\.\//, "") !== relative) continue;

    const clean = subpath.replace(/^\.\//, "");
    return clean && clean !== "." ? `${found.pkg.name}/${clean}` : found.pkg.name;
  }
  return `${found.pkg.name}/${relative}`;
}

/** Walks up from the served root until the folder that owns `packages/`. */
function repoRootOf(start) {
  let dir = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(dir, "packages"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return path.resolve(start);
    dir = parent;
  }
}

/**
 * @returns {import("vite").Plugin}
 */
export function lazyCss() {
  /** @type {string} */
  let packagesDir;

  return {
    name: "aio-ui:lazy-css",
    apply: "serve",

    configResolved(config) {
      // Posix form: Vite hands hook paths with forward slashes on every platform.
      packagesDir = toPosix(path.join(repoRootOf(config.root), "packages"));
    },

    handleHotUpdate(context) {
      const { file, server, modules } = context;
      if (!file.endsWith(".css")) return;

      const inside = toPosix(path.relative(packagesDir, file));
      if (!inside || inside.startsWith("..") || path.isAbsolute(inside)) return;

      // Statically imported sheets have no injected element; Vite's own CSS HMR is
      // correct for them and this plugin must not swallow the update.
      const isLazy = [...modules, ...(server.moduleGraph.getModulesByFile(file) ?? [])].some((module) =>
        module.url.includes("?inline"),
      );
      if (!isLazy) return;

      const specifier = specifierOf(file, packagesDir);
      if (!specifier) return;

      let css;
      try {
        css = fs.readFileSync(file, "utf8");
      } catch {
        return; // deleted or unreadable: let Vite report it
      }

      server.ws.send({ type: "custom", event: "lazy-css", data: { specifier, css } });
      server.config.logger.info(`[lazy-css] ${specifier}`, { timestamp: true });

      // An empty module list means "nothing to invalidate": no reload, no re-request.
      return [];
    },
  };
}

export default lazyCss;
