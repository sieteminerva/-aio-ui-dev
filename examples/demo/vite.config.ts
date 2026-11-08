import { defineConfig } from 'vite';

export default defineConfig({
  base: "/demo/",
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
