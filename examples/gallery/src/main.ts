import type { iBuilderRegistry, iNodeContent } from '@aio-ui/core/interface';
import { ComponentRegistry } from '@aio-ui/core/ComponentRegistry';
import { DOMRenderer } from '@aio-ui/core/DOMRenderer';
import { AnimationsService } from '@aio-ui/animations';
import { HashRouter, type iRouteState } from '@aio-ui/router';
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

/** Peta rute → konten halaman. Unknown/`home` selalu jatuh ke HomepageContent. */
function pageContentFor(route: string): iNodeContent {
  const key = route.trim().toLowerCase().replace(/^#|\/+$/g, '') || 'home';
  switch (key) {
    case "home": return HomepageContent;
    case "form": return BuildPageContent;
    case "blog": return BlogContent;
    case "about": return AboutContent;
    case "gallery": return GalleryContent;
    default: return HomepageContent;
  }
}

// Infrastruktur bersama (dibangun sekali di bootstrap)
let renderer: DOMRenderer;
let animation: AnimationsService;
let components: ComponentRegistry;
let buildBuilderFn: (name: keyof iBuilderRegistry, data: any) => HTMLElement | null;
let renderFn: (node: any) => HTMLElement | null;
let currentRoot: HTMLElement | null = null;
let renderSequence = 0;

function buildersForRoute(route: string): string[] {
  switch (route.trim().toLowerCase().replace(/^#|\/+$/g, '')) {
    case 'home': return ['form', 'table'];
    case 'form': return ['form', 'table'];
    case 'gallery': return ['masonry'];
    case 'blog': return ["article"];
    default: return [];
  }
}

/** Render satu halaman (rute) ke dalam #app — mengganti akar sebelumnya. */
export async function renderPage(route: string): Promise<void> {
  const sequence = ++renderSequence;
  // route based Lazy-load components 
  await components.load(buildersForRoute(route));
  if (sequence !== renderSequence) return;

  const page = pageContentFor(route);
  const tree = renderer.render(page, renderFn, buildBuilderFn);
  if (currentRoot && currentRoot.isConnected) {
    currentRoot.replaceWith(tree);
  } else {
    const app = document.getElementById('app');
    if (app) app.replaceWith(tree);
  }
  currentRoot = tree;
  animation.init();
}


/** Pasang HashRouter + jalankan render awal sesuai hash URL. */
function bootRouting(): void {
  const router = new HashRouter(
    "home", // default page
    "default", // theme name
    ["home", "about", "blog", "gallery", "form"],
    (state: iRouteState) => renderPage(state.route)
  );

  // Render pertama mengikuti posisi hash saat ini.
  renderPage(router.parseUrlHash().route);

  // Ekspos ke konsol untuk debugging manual: `window.__router.navigate('build')`
  (globalThis as any).__router = router;
}

async function start(container: HTMLElement) {
  // registerServiceWorker();
  // @ts-ignore
  const emitter = new EventEmitter();
  animation = new AnimationsService();
  components = new ComponentRegistry(componentAssets)
    .register("form", (data: any) => {
      return {
        path: "@aio-ui/form/Form",
        stylesheet: "@aio-ui/form/Form.css", // alternative style definition also didn't loaded
        config: Object.assign({}, data?.config || {}, { emit: (event: any, payload: any) => emitter.emit(event, payload as any) }),
        schema: data?.schema !== undefined ? data.schema : (data?.content !== undefined ? data.content : data),
      };
    })

    .register("table", (data: any) => {
      return {
        path: "@aio-ui/table/Table",
        stylesheet: "@aio-ui/table/Table.css", // alternative style definition also didn't loaded
        config: data?.config,
        schema: data?.schema !== undefined ? data.schema : (data?.content !== undefined ? data.content : data),
      };
    })

    .register("masonry", (data: any) => {
      return {
        path: "@aio-ui/masonry/Masonry",
        stylesheet: "@aio-ui/masonry/Masonry.css", // alternative style definition also didn't loaded
        config: data?.config,
        schema: data?.schema !== undefined ? data.schema : (data?.content !== undefined ? data.content : data),
      };
    })

    .register("article", (data: any) => {
      return {
        path: "@aio-ui/article/Article",
        stylesheet: "@aio-ui/article/Article.css", // alternative style definition also didn't loaded
        config: data?.config,
        schema: data?.schema !== undefined ? data.schema : (data?.content !== undefined ? data.content : data),
      };
    })



  renderer = new DOMRenderer();
  renderFn = (node) => renderer.render(node, undefined, undefined);
  buildBuilderFn = (name, data) => components.build(name, data);

  bootRouting();

  // `container` (asli #app dari index.html) akan diganti renderPage — pastikan
  // referensi akar awal mengarah ke sana bila hash kosong.
  if (!currentRoot && container) currentRoot = container;
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