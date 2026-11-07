import { defineConfig } from 'vite';
import { workspaceAliases } from './aliases.ts';

export default defineConfig({
  base: "/gallery/",
  resolve: {
    // Workspace aliases: the example application imports packages by name so the
    // same imports keep working once the app moves to `examples/gallery`.
    alias: workspaceAliases,
  },
  css: {
    lightningcss: {
      targets: {
        chrome: 114 << 16,  // Version 114.0.0
        firefox: 125 << 16, // Version 125.0.0
        safari: 17 << 16    // Version 17.0.0
      }
    },
  },
  build: {
    cssCodeSplit: false,
    cssMinify: true,
    modulePreload: {
      polyfill: false,
      resolveDependencies: () => [] // Mengosongkan daftar pre-load otomatis untuk chunk dinamis
    },
    rolldownOptions: {
      input: {
        main: './index.html' // Vite akan otomatis membaca entry point dari tag script di dalam index.html asal Anda
      },
      output: {
        // Menggunakan standar baru Rolldown untuk mengelompokkan chunk
        codeSplitting: {
          groups: [
            {
              // Beri nama chunk-nya secara dinamis / statis
              name(id) {
                // Pastikan file berasal dari folder komponen Anda
                if (id.includes('/components/')) {
                  // Ambil jalur setelah nama folder komponen
                  const parts = id.split('components/');
                  if (parts[1]) {
                    // Ambil nama sub-folder pertamanya (misal: 'Form', 'Tab', 'Card')
                    const folderName = parts[1].split('/')[0];
                    // Kembalikan nama chunk unik untuk folder tersebut
                    return `component-${folderName.toLowerCase()}`;
                  }
                }
              },
              // Tangkap semua file (termasuk .ts, .tsx, .css, dll.) yang berada di dalam folder Components Anda
              test: /packages\/components\//,
            },
            {
              // SINKRONISASI VENDOR (Opsional: satukan library pihak ketiga jika ada)
              name: 'vendor',
              test: /node_modules\//,
            }
          ]
        }
      }
    }

  }
});