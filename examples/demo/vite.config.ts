import { defineConfig } from 'vite';
import { lazyCss } from '../vite.lazy-css.mjs';

export default defineConfig({
  // Dev serves under `/demo/`; the GitHub Pages build passes `DEMO_BASE=/-aio-ui-dev/`
  // because a project page lives under the repository name.
  base: process.env.DEMO_BASE ?? "/demo/",
  // Component sheets are injected by the host, not by Vite: dev edits swap the
  // <style> text over the websocket instead of reloading the page.
  plugins: [lazyCss()],
  css: {
    lightningcss: {
      targets: {
        chrome: 114 << 16,
        firefox: 125 << 16,
        safari: 17 << 16,
      },
    },
  },
  build: {
    cssCodeSplit: false,
    cssMinify: true,
    modulePreload: { polyfill: false, resolveDependencies: () => [] },
    rolldownOptions: {
      input: { main: './index.html' },
      output: {
        codeSplitting: {
          groups: [
            {
              name(id) {
                if (id.includes('/components/')) {
                  const parts = id.split('components/');
                  if (parts[1]) return `component-${parts[1].split('/')[0].toLowerCase()}`;
                }
              },
              test: /packages\/components\//,
            },
            { name: 'vendor', test: /node_modules\// },
          ],
        },
      },
    },
  },
});
