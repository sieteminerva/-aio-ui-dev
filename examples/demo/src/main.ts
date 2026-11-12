import {
  DOMRenderer,
  ComponentRegistry,
  AioApp,
  AppStorage,
  isStyleInjected,
  replaceLazyCss,
  type iComponentModuleRef,
} from '@aio-ui/frameworks';
import { AnimationsService, EventEmitter, HttpService, HashRouter, ThemeRenderer } from '@aio-ui/modules';
import { DefaultTheme, CyberpunkTheme, } from '@aio-ui/themes';

import '@aio-ui/theme-cyberpunk/CyberpunkTheme.css';

// Stylesheets are files, not module side effects: package JS never imports its own CSS
// (a browser import map would reject text/css as a module), so the host links them.
import '@aio-ui/styles/index.css';
import '@aio-ui/animations/Animations.css';
import './style.css';

import { DEMO, manifestFor } from './manifest';
import { ArticlePage } from './pages/article';
import { formContent, formManifest } from './pages/form';
import { GettingStartedPage } from './pages/getting-started';
import { KitchenPage } from './pages/kitchen';
import { ModulesPage } from './pages/modules';
import { ProductPage } from './pages/product';
import { componentAssets } from './registry.assets';
import { productModules } from '@aio-ui/product';
import type { iComponentRoute } from '@aio-ui/frameworks';

/**
 * Dev-only: an edited component stylesheet arrives as text, not as a reload.
 *
 * `examples/vite.lazy-css.mjs` keeps Vite from invalidating the `?inline` module and
 * sends this event instead. A sheet that is not in the document yet is skipped on
 * purpose — injecting it here would add a second <style> next to the lazy path.
 */
import.meta.hot?.on('lazy-css', (payload: { specifier: string; css: string }) => {
  if (isStyleInjected(payload.specifier)) replaceLazyCss(payload.css, payload.specifier);
});

/**
 * Demo application.
 *
 * Four routes, because two different things are being demonstrated:
 *
 * - `#kitchen` — element components: one builder, one node, driven by the manifest table.
 * - `#product`, `#article`, `#form` — page components: big enough to own their route,
 *   their data and their lifecycle. `product` composes list/detail at page level,
 *   `article` composes its slots inside the builder, `form` owns a schema and a submit
 *   cycle. These are the ones the manifest table could never describe.
 *
 * Data goes through `HttpService` even though it is static JSON, so moving to a real
 * backend is a config change rather than a rewrite.
 */

/** `public/mock/<sheet>.json` — fetched for real, exactly like a backend would be. */
const mockApi = {
  url: '',
  endpoint: (query: Record<string, any>) => `${import.meta.env.BASE_URL}mock/${query.sheetName}.json`,
};

const pages = {
  form: formContent(),
};

/**
 * What each route mounts, declared once beside the registry.
 *
 * A node's `builder` means "this node is that component"; it is not a dependency list,
 * so the route states everything it mounts here. `fab-menu` is host chrome (the theme
 * switcher) and is mounted on every route, hence the repetition.
 */
const componentRoutes: iComponentRoute[] = [
  // Every route mounts the same shell menu, so every route names it. A builder called
  // inside `onCreated` is invisible to the node collector, and this plan is the only
  // thing that preloads it — a missing entry fails the render on a cold load.
  { route: 'getting-started', components: ['menu', 'fab-menu'] },
  // The modules docs reuse the same `menu` builder for their sidebar.
  { route: 'modules', components: ['menu', 'fab-menu'] },
  { route: 'kitchen', components: [...DEMO.map((entry) => entry.name), 'menu', 'fab-menu'] },
  { route: 'product', components: ['product', 'menu', 'fab-menu'] },
  { route: 'article', components: ['article', 'menu', 'fab-menu'] },
  { route: 'form', components: ['form', 'menu', 'fab-menu'] },
];

const themeStorage = globalThis.localStorage;

/** Page components split `{ config, schema }` instead of treating the whole node as payload. */
function pageComponent(path: string, stylesheet?: string, modules?: iComponentModuleRef[], exportName?: string) {
  return (data: any) => ({
    path,
    stylesheet,
    modules,
    // A package that ships several builders has to say which one this word means;
    // without it the loader would take the first exported function for every word.
    export: exportName,
    config: data?.config,
    schema: data?.schema !== undefined ? data.schema : data?.content !== undefined ? data.content : data,
  });
}

async function start(container: HTMLElement) {
  const emitter = new EventEmitter();

  const components = new ComponentRegistry(componentAssets);
  for (const entry of DEMO) {
    components.register(entry.name as any, manifestFor(entry));
  }

  // Page components are registered explicitly: they take config + schema. `product` is
  // one word for the whole package — `ProductBuilder` owns grid ⇄ detail as sub-modules,
  // so the host never registers (or wires) those two separately.
  components
    .register('product', pageComponent('@aio-ui/product', undefined, productModules(), 'ProductBuilder'))
    .register('article', pageComponent('@aio-ui/article', '@aio-ui/article/Article.css', undefined, 'ArticleBuilder'))
    // The form's adapter stack is declared here, not inside the page: the registry resolves
    // it, `Form.provideModules()` partitions it, and the page only supplies a schema.
    .register('form', pageComponent('@aio-ui/form', '@aio-ui/form/Form.css', formManifest(), 'FormBuilder'))
    // The theme switcher is a fab menu with per-item handlers, so it needs config too.
    .register('fab-menu', pageComponent('@aio-ui/fabmenu', '@aio-ui/fabmenu/FabMenu.css'))
    // The docs shell: `menu` is one builder with two shapes, `top` and `sidebar`.
    .register('menu', pageComponent('@aio-ui/menu', '@aio-ui/menu/Menu.css', undefined, 'MenuBuilder'));

  const app = new AioApp({
    container,
    defaultRoute: 'kitchen',
    theme: 'default',
    debug: true,
    source: { pages },
  })
    .registerModule(components, componentRoutes)
    .registerModule(HashRouter)
    .registerModule(DOMRenderer)
    .registerModule(AppStorage, { driver: themeStorage })
    .registerModule(AnimationsService)
    // One door for data, on every route.
    .registerModule(HttpService, mockApi)
    .registerModule(ThemeRenderer, { themes: [new DefaultTheme(), new CyberpunkTheme()] })
    .registerModule(emitter)
    // Behavior per route; their content comes from the controller.
    .registerPage('getting-started', GettingStartedPage)
    .registerPage('modules', ModulesPage)
    .registerPage('kitchen', KitchenPage)
    .registerPage('product', ProductPage)
    .registerPage('article', ArticlePage);

  await app.render();
  // Debug handles: the app, and the bus it publishes through (component + page events).
  (globalThis as any).__app = app;
  (globalThis as any).__emitter = emitter;
}

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { start(app).catch(console.error); });
  } else {
    start(app).catch(console.error);
  }
}
