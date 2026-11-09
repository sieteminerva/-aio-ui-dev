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
    "@aio-ui/form": () => import("@aio-ui/form"),
    "@aio-ui/table": () => import("@aio-ui/table"),
    "@aio-ui/masonry": () => import("@aio-ui/masonry"),
    "@aio-ui/article": () => import("@aio-ui/article"),
  } satisfies Record<string, () => Promise<unknown>>,
  styles: {
    // `?inline` keeps stylesheet text addressable so the registry can inject it
    // as a real <style> element and hold the element until it lands.
    "@aio-ui/form/Form.css": () => import("@aio-ui/form/Form.css?inline"),
    "@aio-ui/input/dropdown.css": () => import("@aio-ui/input/dropdown.css?inline"),
    "@aio-ui/input/file-uploader.css": () => import("@aio-ui/input/file-uploader.css?inline"),
    "@aio-ui/input/controls.css": () => import("@aio-ui/input/controls.css?inline"),
    "@aio-ui/message/Message.css": () => import("@aio-ui/message/Message.css?inline"),
    "@aio-ui/accordion/Accordion.css": () => import("@aio-ui/accordion/Accordion.css?inline"),
    "@aio-ui/table/Table.css": () => import("@aio-ui/table/Table.css?inline"),
    "@aio-ui/masonry/Masonry.css": () => import("@aio-ui/masonry/Masonry.css?inline"),
    "@aio-ui/article/Article.css": () => import("@aio-ui/article/Article.css?inline"),
  } satisfies Record<string, () => Promise<unknown>>,
};
