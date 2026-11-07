/**
 * Component asset map for the example application.
 *
 * Keys are module specifiers, not file paths: components are workspace packages
 * resolved through `node_modules`, so the registry cannot rely on
 * `import.meta.glob` over the repository tree. The AIO Kit generator emits this
 * same file for a generated project, listing only the components that were
 * selected during setup.
 */
export const componentAssets = {
  modules: {
    "@aio-ui/form/Form": () => import("@aio-ui/form/Form"),
    "@aio-ui/table/Table": () => import("@aio-ui/table/Table"),
    "@aio-ui/masonry/Masonry": () => import("@aio-ui/masonry/Masonry"),
    "@aio-ui/article/Article": () => import("@aio-ui/article/Article"),
  } satisfies Record<string, () => Promise<unknown>>,
  styles: {
    // `?inline` keeps stylesheet text addressable so the registry can inject it
    // as a real <style> element and hold the element until it lands.
    "@aio-ui/form/Form.css": () => import("@aio-ui/form/Form.css?inline"),
    "@aio-ui/table/Table.css": () => import("@aio-ui/table/Table.css?inline"),
    "@aio-ui/masonry/Masonry.css": () => import("@aio-ui/masonry/Masonry.css?inline"),
    "@aio-ui/article/Article.css": () => import("@aio-ui/article/Article.css?inline"),
  } satisfies Record<string, () => Promise<unknown>>,
};
