import { ComponentRegistry } from '@aio-ui/core/ComponentRegistry';
import { DOMRenderer } from '@aio-ui/core/DOMRenderer';
import { AioApp, AppStorage } from '@aio-ui/app';
import { AnimationsService } from '@aio-ui/animations';
import { EventEmitter } from '@aio-ui/event-emitter';
import { HashRouter } from '@aio-ui/router';
import { DefaultTheme, ThemeRenderer } from '@aio-ui/theme';

import '@aio-ui/styles/index.css';
import './style.css';

import { DEMO, manifestFor } from './manifest';
import { kitchenContent } from './pages/kitchen';
import { componentAssets } from './registry.assets';

/**
 * Demo application.
 *
 * The only hand-written part is the module registration below: pages, registry entries
 * and the loader map all derive from `manifest.ts`. Adding a component to the demo is a
 * single row there.
 */
const pages = {
  kitchen: kitchenContent(),
};

const themeStorage = globalThis.localStorage;

async function start(container: HTMLElement) {
  const emitter = new EventEmitter();

  const components = new ComponentRegistry(componentAssets);
  for (const entry of DEMO) {
    components.register(entry.name as any, manifestFor(entry));
  }

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
    .registerModule(ThemeRenderer, { themes: [new DefaultTheme()] })
    .registerModule(emitter);

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
