# AIO Framework Monorepo Plan

## npm Workspaces

`npm workspaces` mengelola beberapa package dalam satu repository dan terutama berguna untuk development lokal. Package internal akan di-link otomatis oleh npm, sehingga `core`, component, module, dan example project dapat dikembangkan bersama.

Workspaces tidak mengharuskan package dipublish ke npm. Repository tetap dapat di-install dari GitHub dengan `npm install github:username/aio-framework#v0.1.0`.

## Struktur

`packages/core`: DOMRenderer, ComponentRegistry, interfaces.

`packages/base`: Base dan BaseAdapters.

`packages/styles`: reset, variables, layout, typography.

`packages/modules`: router, http-service, animation, store.

`packages/utilities`: Metadata, selector, helper, attributes.

`packages/components/*`: form, masonry, table, article, rating.

Root `package.json` menggunakan `workspaces: ["packages/*", "packages/components/*"]`.

## Dependency Rules

- `core` tidak mengetahui component.
- `base` menjadi fondasi component.
- Style global berada di `styles`.
- Style khusus tetap berada bersama component.
- Component hanya mengimpor utility yang diperlukan.
- Utility tidak di-download saat runtime browser.
- Module dan component dipilih oleh generator atau import manual.

Gunakan root package dengan subpath exports, misalnya `@aio-ui/framework/core` dan `@aio-ui/framework/components/masonry`. Ini lebih sederhana untuk distribusi melalui GitHub daripada meng-install workspace package dari subfolder repository.

## AIO Kit Generator

Command utama: `aio new --type website`.

Pipeline: buat Vite project → pilih preset atau manual → pilih module dan component → buat `aio.config.json` → generate `main.ts` dan `content/**` → install dependency → jalankan dev server.

Vite dibuat terlebih dahulu agar hasil generator tetap menjadi project Vite standar dan dapat dibuka tanpa AIO Kit.

## Menu Inquirer

Menu pertama: `manual`, `ecommerce`, `blog`, `profile`, `gallery`, dan `news`.

Mode `manual` membuka pilihan component seperti `navigation`, `form`, `table`, `masonry`, `article`, dan `rating`, lalu pilihan module seperti `router`, `animation`, `http-service`, `event-emitter`, dan `build-store`.

Preset langsung memakai konfigurasi yang sudah ditentukan, tetapi tetap menampilkan ringkasan dan meminta konfirmasi sebelum generate.

## Preset

Preset sebaiknya berupa data configuration, bukan logic yang tersebar. Contoh preset `profile` menggunakan component `navigation`, `article`, `masonry`, module `router`, `animation`, dan content `home`, `about`, `gallery`.

Preset dan manual mode harus menghasilkan manifest yang sama.

## Manifest

Setiap hasil generate memiliki `aio.config.json` sebagai single source of truth.

Field minimum: `projectType`, `frameworkVersion`, `components`, `modules`, `content`, dan `language`.

Contoh: `projectType: profile`, `components: [navigation, article, masonry]`, `modules: [router, animation]`, `content: [home, about, gallery]`.

Manifest dipakai untuk generator, validasi, upgrade, dan debugging.

## Output Project

Project hasil generate berisi `aio.config.json`, `package.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/content/**`, `src/styles/app.css`, dan `src/assets/**`.

Generator hanya membuat file yang dipilih dan tidak menyalin seluruh source framework.

## Generated main.ts

Generator menyusun import dan registry berdasarkan manifest. Jika `masonry` dipilih, ia menulis import atau lazy import `@aio-ui/framework/components/masonry`. Jika tidak dipilih, component tersebut tidak masuk ke project.

## Versioning

Walaupun tidak memakai npm registry, framework tetap memakai Git tags seperti `v0.1.0`. Project production sebaiknya mengunci tag GitHub, bukan branch `main`.

## Tahapan Implementasi

1. Extract `DOMRenderer`, `ComponentRegistry`, `Base`, dan `BaseAdapters`.
2. Pisahkan global styles dan component styles.
3. Pindahkan component satu per satu beserta manifest-nya.
4. Buat root exports dan subpath exports.
5. Buat Vite scaffold generator di AIO Kit.
6. Implementasikan preset dan manual selection dengan Inquirer.
7. Generate `aio.config.json`, `main.ts`, dan `content/**`.
8. Tambahkan `aio doctor` untuk validasi manifest.
9. Tambahkan `aio update` untuk upgrade berdasarkan Git tag.

## Struktur Package yang Disarankan

Setiap package memiliki `package.json` sendiri. Root hanya mengatur workspace dan command global.

```txt
aio-framework/
├── package.json
├── tsconfig.base.json
├── tsconfig.json
├── packages/
│   ├── core/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── DOMRenderer.ts
│   │   │   ├── ComponentRegistry.ts
│   │   │   ├── interfaces.ts
│   │   │   └── index.ts
│   │   └── dist/
│   ├── base/
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── Base.ts
│   │   │   ├── BaseAdapters/
│   │   │   └── index.ts
│   │   └── dist/
│   ├── styles/
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── variables.css
│   │   │   ├── layout.css
│   │   │   └── index.css
│   │   └── dist/
│   │   ├── modules/
│   │   │   ├── package.json
│   │   │   ├── router/
│   │   │   ├── animation/
│   │   │   └── http-service/
│   │   └── utilities/
│   │       ├── package.json
│   │       ├── metadata/
│   │       ├── selector/
│   │       └── helper/
│   └── components/
│       ├── masonry/
│       │   ├── package.json
│       │   ├── src/
│       │   │   ├── Masonry.ts
│       │   │   ├── Masonry.css
│       │   │   └── index.ts
│       │   └── dist/
│       └── form/
│           ├── package.json
│           ├── src/
│           └── dist/
├── examples/
│   ├── gallery/
│   └── profile/
└── scripts/
```

`dist/` tidak ditulis manual dan tidak menjadi source utama. Folder itu merupakan hasil build TypeScript dan CSS.

## Root Development

Root repository harus memiliki satu example project yang dapat dijalankan untuk memvalidasi framework secara end-to-end.

Root `package.json` dapat memiliki command berikut:

```json
{
  "private": true,
  "workspaces": ["packages/*", "packages/components/*"],
  "scripts": {
    "dev": "npm --workspace examples/gallery run dev",
    "build": "npm run build --workspaces",
    "typecheck": "tsc --build",
    "test": "npm run test --workspaces"
  }
}
```

Alur development:

```txt
npm install
    ↓
edit packages/core/src
    ↓
workspace link memakai package lokal
    ↓
example project menggunakan @aio-ui/core
    ↓
npm run dev
```

Untuk development cepat, Vite example dapat mengimpor source package secara langsung melalui workspace alias. Untuk simulasi production, jalankan build semua package terlebih dahulu.

## Menghindari Import Path yang Terlalu Dalam

Source file boleh memiliki folder dalam, tetapi pengguna tidak boleh mengimpor path internal seperti:

```ts
import { DOMRenderer } from "../../packages/core/src/Modules/DOMRenderer";
```

Setiap package memiliki `src/index.ts` sebagai public barrel:

```ts
export { DOMRenderer } from "./DOMRenderer";
export { ComponentRegistry } from "./ComponentRegistry";
export type * from "./interfaces";
```

Pengguna cukup memakai:

```ts
import { DOMRenderer, ComponentRegistry } from "@aio-ui/core";
```

Package component juga memiliki barrel sendiri:

```ts
export { MasonryBuilder } from "./Masonry";
```

Lalu digunakan dengan:

```ts
import { MasonryBuilder } from "@aio-ui/component-masonry";
```

## Root Exports dan Subpath Exports

`index.ts` mengatur export dari dalam package. Field `exports` di `package.json` mengatur jalur publik package.

Contoh `packages/core/package.json`:

```json
{
  "name": "@aio-ui/core",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./DOMRenderer": {
      "types": "./dist/DOMRenderer.d.ts",
      "import": "./dist/DOMRenderer.js"
    }
  }
}
```

`index.ts` mencegah import internal yang berantakan. `package.json#exports` mencegah file internal yang tidak dimaksudkan untuk publik ikut diakses.

## Build dan Folder dist

Setiap package memiliki build command sendiri. Contoh:

```json
{
  "scripts": {
    "build": "tsc -p tsconfig.json"
  },
  "files": ["dist", "src/*.css"]
}
```

Build TypeScript menghasilkan:

```txt
src/DOMRenderer.ts
    ↓ tsc
dist/DOMRenderer.js
dist/DOMRenderer.d.ts
dist/DOMRenderer.js.map
```

Jadi `dist/` berisi JavaScript untuk runtime, declaration `.d.ts` untuk TypeScript, dan source map untuk debugging. File `.ts` tidak dijalankan langsung oleh project consumer production.

Untuk CSS, Vite atau bundler package dapat menyalin dan memproses file CSS ke `dist`. Component sebaiknya menyediakan export style:

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./style.css": "./dist/Masonry.css"
  }
}
```

## Urutan Build Package

Dependency build harus mengikuti urutan:

```txt
utilities
    ↓
core
    ↓
base
    ↓
modules dan components
    ↓
examples
```

Workspace runner dapat menjalankan build semua package, tetapi untuk hasil yang konsisten sebaiknya gunakan project references TypeScript atau script build yang memahami dependency graph.

## Local, GitHub, dan Generated Project

Saat mengembangkan framework:

```txt
aio-framework repository
    ├── packages/core
    ├── packages/components/masonry
    └── examples/gallery
```

Saat AIO Kit membuat website, website tersebut menjadi repository terpisah:

```txt
generated-website/
├── package.json
├── aio.config.json
└── src/
```

Generated project tidak menggunakan relative path menuju source monorepo. Ia menggunakan package GitHub yang dikunci pada tag tertentu. Untuk development lokal, dependency dapat diganti menjadi `file:` atau workspace protocol.
