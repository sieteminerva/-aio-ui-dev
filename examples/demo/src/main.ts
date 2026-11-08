import { ComponentRegistry } from '@aio-ui/core/ComponentRegistry';
import { DOMRenderer } from '@aio-ui/core/DOMRenderer';
import { AioApp, AppStorage } from '@aio-ui/app';
import { AnimationsService } from '@aio-ui/animations';
import { EventEmitter } from '@aio-ui/event-emitter';
import { HttpService } from '@aio-ui/http-service';
import { HashRouter } from '@aio-ui/router';
import { DefaultTheme, ThemeRenderer } from '@aio-ui/theme';

import '@aio-ui/styles/index.css';
import './style.css';

import { DEMO, manifestFor } from './manifest';
import { ArticlePage } from './pages/article';
import { formContent } from './pages/form';
import { kitchenContent } from './pages/kitchen';
import { ProductPage } from './pages/product';
import { componentAssets } from './registry.assets';

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
  kitchen: kitchenContent(),
  form: formContent(),
};

const themeStorage = globalThis.localStorage;

/** Page components split `{ config, schema }` instead of treating the whole node as payload. */
function pageComponent(path: string, stylesheet?: string) {
  return (data: any) => ({
    path,
    stylesheet,
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

  // Page components are registered explicitly: they take config + schema, and `product`
  // is composed from two modules rather than being one builder.
  components
    .register('product-grid' as any, pageComponent('@aio-ui/product/ProductGrid', '@aio-ui/product/ProductGrid.css'))
    .register('product-detail' as any, pageComponent('@aio-ui/product/ProductDetail', '@aio-ui/product/ProductDetail.css'))
    .register('article' as any, pageComponent('@aio-ui/article/Article', '@aio-ui/article/Article.css'))
    .register('form' as any, pageComponent('@aio-ui/form/Form', '@aio-ui/form/Form.css'));

  const app = new AioApp({
    container,
    defaultRoute: 'kitchen',
    theme: 'default',
    debug: true,
    source: { pages },
  })
    .registerModule(components)
    .registerModule(HashRouter)
    .registerModule(DOMRenderer)
    .registerModule(AppStorage, { driver: themeStorage })
    .registerModule(AnimationsService)
    // One door for data, on every route.
    .registerModule(HttpService, mockApi)
    .registerModule(ThemeRenderer, { themes: [new DefaultTheme()] })
    .registerModule(emitter)
    // Behavior per route; their content comes from the controller.
    .registerPage('product', ProductPage)
    .registerPage('article', ArticlePage);

  await app.mount();
  (globalThis as any).__app = app;
}

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { start(app).catch(console.error); });
  } else {
    start(app).catch(console.error);
  }
}
