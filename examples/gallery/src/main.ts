import { ComponentRegistry } from '@aio-ui/core/ComponentRegistry';
import { AioApp, type iEventPort, type iStoragePort } from '@aio-ui/app';
import { AnimationsService } from '@aio-ui/animations';
import { HashRouter } from '@aio-ui/router';
import { HomepageContent } from './content/home';

import '@aio-ui/styles/index.css';
import './style.css';

import { EventEmitter } from '@aio-ui/event-emitter';
import { AboutContent } from './content/about';
import { GalleryContent } from './content/gallery';
import { BlogContent } from './content/blog';
import { BuildPageContent } from './content/wizard';
import { componentAssets } from './registry.assets';

// 🔐 Daftarkan Service Worker supaya id_token disimpan di variabel SW.
// BASE_URL mengikuti base vite ("/rajutan/") agar cocok dengan scope GitHub Pages.
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const base = import.meta.env.BASE_URL || '/';
  const swUrl = `${base}sw.js`;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(swUrl, { scope: base })
      .then((reg) => console.log('[SW] registrasi aktif, scope:', reg.scope))
      .catch((err) => console.warn('[SW] registrasi gagal:', err));
  });
}

/**
 * Halaman per rute, key = route id.
 *
 * Inilah satu-satunya daftar rute: `AioApp` menurunkannya untuk router,
 * derivation komponen, dan fallback rute tak dikenal.
 */
const pages = {
  home: HomepageContent,
  about: AboutContent,
  blog: BlogContent,
  gallery: GalleryContent,
  form: BuildPageContent,
};

/** `localStorage` bisa ada tapi melempar (mode privat / iframe), jadi dibungkus. */
const storage: iStoragePort = {
  get: (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* persistence is optional */
    }
  },
};

async function start(container: HTMLElement) {
  // registerServiceWorker();

  const emitter = new EventEmitter();
  // `EventEmitter` hanya menerima kunci `iPageEvents`; app memakai kunci string
  // supaya tidak terikat ke satu implementasi emitter.
  const events: iEventPort = {
    emit: (event, data) => emitter.emit(event as any, data as any),
    on: (event, callback) => emitter.on(event as any, callback as any),
  };

  const components = new ComponentRegistry(componentAssets)
    .register("form", (data: any) => {
      return {
        path: "@aio-ui/form/Form",
        stylesheet: "@aio-ui/form/Form.css",
        config: Object.assign({}, data?.config || {}, { emit: (event: any, payload: any) => emitter.emit(event, payload as any) }),
        schema: data?.schema !== undefined ? data.schema : (data?.content !== undefined ? data.content : data),
        // Form owns a table preview; the registry loads it with the form instead of
        // requiring the route to list it.
        modules: [{ id: "table" }],
      };
    })

    .register("table", (data: any) => {
      return {
        path: "@aio-ui/table/Table",
        stylesheet: "@aio-ui/table/Table.css",
        config: data?.config,
        schema: data?.schema !== undefined ? data.schema : (data?.content !== undefined ? data.content : data),
      };
    })

    .register("masonry", (data: any) => {
      return {
        path: "@aio-ui/masonry/Masonry",
        stylesheet: "@aio-ui/masonry/Masonry.css",
        config: data?.config,
        schema: data?.schema !== undefined ? data.schema : (data?.content !== undefined ? data.content : data),
      };
    })

    .register("article", (data: any) => {
      return {
        path: "@aio-ui/article/Article",
        stylesheet: "@aio-ui/article/Article.css",
        config: data?.config,
        schema: data?.schema !== undefined ? data.schema : (data?.content !== undefined ? data.content : data),
      };
    });

  const shell = new AioApp({
    container,
    defaultRoute: 'home',
    theme: 'default',
    source: { pages },
    deps: {
      registry: components,
      routerFactory: (defaultRoute, theme, routes, onRouteChanged) =>
        new HashRouter(defaultRoute, theme, routes, onRouteChanged),
      animation: new AnimationsService(),
      events,
      storage,
    },
  });

  await shell.mount();

  // Debug manual di console: `__shell.navigate('blog')`.
  (globalThis as any).__shell = shell;
}

const app = document.querySelector<HTMLDivElement>('#app')
if (app) {
  // `<script type="module">` sudah deferred → DOM & document.head sudah ada,
  // jadi ini hanya jaring pengaman bila entry dieksekusi lebih awal
  // (mis. di-inline / kondisi parses lucu) supaya #app & document.head pasti siap.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { start(app).catch(console.error) })
  } else {
    start(app).catch(console.error)
  }
}