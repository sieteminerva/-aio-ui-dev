import { ComponentRegistry } from '@aio-ui/core/ComponentRegistry';
import { DOMRenderer } from '@aio-ui/core/DOMRenderer';
import { AioApp, AppStorage } from '@aio-ui/app';
import { AnimationsService } from '@aio-ui/animations';
import { HashRouter } from '@aio-ui/router';
import { HomepageContent } from './content/home';

import '@aio-ui/styles/index.css';
import './style.css';

import { EventEmitter } from '@aio-ui/event-emitter';
import { HttpService } from '@aio-ui/http-service';
import { DefaultTheme } from '@aio-ui/theme-default';
import { HorizontalTheme } from '@aio-ui/theme-horizontal';
import { ThemeRenderer } from '@aio-ui/theme';
import { AboutContent } from './content/about';
import { BuildPageContent } from './content/wizard';
import { BlogPage } from './pages/blog';
import { GalleryPage } from './pages/gallery';
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
  form: BuildPageContent,
};

/**
 * Endpoint mock: setiap tabel dilayani sebagai file JSON statis yang benar-benar
 * di-fetch. Pindah ke backend asli = hapus `endpoint`, isi `url` dengan URL GAS.
 */
const mockApi = {
  url: '',
  endpoint: (query: Record<string, any>) => `${import.meta.env.BASE_URL}mock/${query.sheetName}.json`,
};

/** `localStorage` bisa ada tapi melempar (mode privat / iframe); `StorageModule` yang membungkusnya. */
const themeStorage = globalThis.localStorage;

async function start(container: HTMLElement) {
  // registerServiceWorker();

  const emitter = new EventEmitter();

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

  // Semua modul diregister dulu, baru dipakai. Kelasnya sendiri yang jadi token:
  // masing-masing mendeklarasikan `static readonly slot`, dan config menempel di
  // tempat registrasinya — jadi `iAppConfig` tetap general.
  const app = new AioApp({
    container,
    defaultRoute: 'home',
    theme: 'default',
    source: { pages },
  })
    // instance yang sudah dirakit (manifest komponen hidup di sini, bukan di app)
    .registerModule(components)
    // kelas tanpa config: routes, theme dan onRouteChanged disuntik dari context
    .registerModule(HashRouter)
    // renderer wajib: app tidak membawa renderer bawaan
    .registerModule(DOMRenderer)
    .registerModule(AppStorage, { driver: themeStorage })
    .registerModule(AnimationsService)
    // satu-satunya pintu data untuk halaman
    .registerModule(HttpService, mockApi)
    // tema: phase prepare/activate/deactivate, tanpa event subscriber
    .registerModule(ThemeRenderer, { themes: [new DefaultTheme(), new HorizontalTheme()] })
    // instance yang sama dipakai manifest form di atas, jadi event-nya nyambung
    .registerModule(emitter)
    // perilaku per-route; kontennya datang dari controller
    .registerPage('blog', BlogPage)
    .registerPage('gallery', GalleryPage);

  await app.render();

  // Debug manual di console: `__app.navigate('blog')`.
  (globalThis as any).__app = app;
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