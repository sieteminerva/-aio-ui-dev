# LandingPageBuilder EventBus

Dokumentasi ini menjelaskan eksperimen relay, attach/detach, dan swap route yang sekarang dipusatkan lewat `EventBus`.

```text
[ TAHAP 1: LAYOUT SWAP ] ──► URL Hash berubah ──► LandingPageBuilder memicu fresh .render()
                                                               │
                                                               ▼
      [ TAHAP 2: RADAR DETECTOR SCANNING (DOMRenderer) ]
      Detik .buildStructure() membaca skema selector Sheets (e.g. "div#carousel-panel")
      │
      └──► 💥 BROADCAST RELAY MELETUP: DOMRenderer melempar siaran ke lambung DOMTreeMemory:
      │    "Wahai Pusat, apakah elemen fisik dengan identifier 'div#carousel-panel' ini sudah eksis?"
      │
      ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                        DOMTREEMEMORY INTEGRATED ROUTING DECISION                          │
├───────────────────────────────────────────────────────────────────────────────────────────┤
│ KASUS A: Elemen Manual Markup Temuan Pusat                                                │
│ ├─► Pusat menjawab: "Ada! Ini alamat pointer fisiknya!"                                   │
│ └─► EXTRACT & BYPASS: DOMRenderer BATAL memicu document.createElement()!                  │
│     Langsung ambil elemen lama, mutasikan atribut barunya JIT, lalu append seadanya!      │
├───────────────────────────────────────────────────────────────────────────────────────────┤
│ KASUS B: Terdeteksi Ada Properti .builder ("carousel")                                    │
│ ├─► JEMBATAN SIARAN KLAN: Sinyal dileruskan menembak saku internal #nodes milik Builder   │
│ ├─► Builder mengecek: "Oh, Carousel instansi ini sudah punya elemen fisik hidup di RAM!"  │
│ └─► RE-HYDRATION BYPASS: Builder BATAL membuat ulang template!                            │
│     Cukup kembalikan live memory pointer lama, sinkronkan data binding Proxy-nya!         │
└───────────────────────────────────────────────────────────────────────────────────────────┘
                                                               │
                                                               ▼
      [ TAHAP 3: THE ULTIMATE BROADCAST COMPLETION ]
      DOMTreeMemory mengirim manifes list KEY hidup ke LandingPageBuilder terluar.
      Sasis atas tinggal melakukan .appendChild() fluid seadanya dalam kecepatan 0 milidetik!

```

## Latar Belakang Eksperimen

Masalah utama yang kita kejar:

- Nested builder sebelumnya mudah membuat namespace baru terus-menerus.
- Rebuild route menyebabkan elemen lama sering dibuang total, padahal sebagian bisa di-reuse.
- Metadata parent-child sulit dijahit tanpa mengotori executor.
- Logging runtime belum cukup informatif untuk melihat builder mana yang disimpan, di-attach, atau di-detach.

Tujuan eksperimen ini:

- Membuat alur `resolve-or-reuse`.
- Memindahkan kontrol attach/detach ke satu pusat.
- Menjaga metadata tetap hidup tanpa full rebuild bila data dan node masih valid.
- Menyediakan statistik runtime yang cukup detail untuk audit perilaku builder.

## Cara Kerja

Secara garis besar alurnya sekarang:

1. `LandingPageBuilder.render()` memicu pergantian route.
2. Shell lama di-detach lewat `RenderingEventBus.handler(...).detach()`.
3. Data halaman dipersiapkan.
4. `DOMRenderer` membangun node dan mencoba reuse elemen lama lewat relay.
5. `Builder` menyimpan metadata node dan mem-broadcast `builder:created`.
6. `DOMTreeMemory` menerima record, menyimpan proxy/raw, lalu menjahit relasi parent-child.
7. Shell baru di-attach lagi ke container aplikasi.
8. Event `page:beforeRender` dan `page:ready` dibroadcast untuk integrasi eksternal.

Prinsipnya:

- `EventBus` adalah pusat komunikasi.
- `DOMTreeMemory` adalah pusat state/record.
- `Builder` adalah pembuat node.
- `LandingPageBuilder` adalah executor route-level.

## Keuntungan Efisiensi

Pendekatan ini memberi beberapa keuntungan:

- Mengurangi rebuild DOM yang tidak perlu.
- Memungkinkan reuse node yang masih valid.
- Menjaga proxy/raw metadata tetap tersimpan di memory graph.
- Mengurangi logika orchestration yang tercecer di executor.
- Mempermudah deactivate karena listener ada di satu tempat.
- Memperjelas statistik runtime untuk debugging performa.

Secara praktis, efeknya:

- Route swap lebih hemat kerja DOM.
- Builder nested lebih stabil.
- Attachment manual bisa dipakai tanpa mengubah executor.
- State mutation tetap bisa mengalir lewat bus yang sama.

## Komponen Yang Sudah Diimplementasikan

### 1. EventBus Facade

File:

- [`src/lib/LandingPageBuilder/Services/EventBus/index.ts`](../EventBus/index.ts)

Fungsi:

- Menyatukan tiga bus:
  - `RenderingEventBus`
  - `ElementCreatedEventBus`
  - `StateMutationEventBus`

Method utama:

- `EventBus.listen()`
- `EventBus.shutdown()`

Pemakai utama:

- `LandingPageBuilder`

### 2. RenderingEventBus

File:

- [`src/lib/LandingPageBuilder/Services/EventBus/Rendering.ts`](./Rendering.ts)

Tanggung jawab:

- Broadcast `page:beforeRender`
- Broadcast `page:ready`
- Attach shell ke container target
- Detach shell dari container target
- Menyediakan statistik shell

Method penting:

- `RenderingEventBus.listen()`
- `RenderingEventBus.shutdown()`
- `RenderingEventBus.broadcast(eventName, payload)`
- `RenderingEventBus.relay(targetBuilder, actionPayload)`
- `RenderingEventBus.receive()`
- `RenderingEventBus.handler(pageKey, shell, mountTarget)`

Yang memakai:

- [`src/lib/LandingPageBuilder/LandingPage.ts`](../../LandingPage.ts)

### 3. ElementCreatedEventBus

File:

- [`src/lib/LandingPageBuilder/Services/EventBus/ElementCreated.ts`](./ElementCreated.ts)

Tanggung jawab:

- Menerima event `builder:created`
- Menyimpan record node ke `DOMTreeMemory`
- Relay reuse node lama
- Attach/detach node secara terpusat
- Menyediakan statistik created/attach/detach/destroy

Method penting:

- `ElementCreatedEventBus.listen()`
- `ElementCreatedEventBus.shutdown()`
- `ElementCreatedEventBus.broadcastCreated(detail)`
- `ElementCreatedEventBus.attach(childElement, globalSlotPathKey)`
- `ElementCreatedEventBus.detach(childElement)`
- `ElementCreatedEventBus.relay(selector, builderId?)`
- `ElementCreatedEventBus.receive()`
- `ElementCreatedEventBus.handler(element, globalKey)`

Yang memakai:

- [`src/lib/LandingPageBuilder/Components/Base.ts`](../../Components/Base.ts)
- [`src/lib/LandingPageBuilder/Modules/DOMRenderer.ts`](../../Modules/DOMRenderer.ts)

### 4. StateMutationEventBus

File:

- [`src/lib/LandingPageBuilder/Services/EventBus/StateMutation.ts`](./StateMutation.ts)

Tanggung jawab:

- Menerima event `builder:mutation`
- Meneruskan perubahan raw/proxy state
- Menjaga sinkronisasi mutation dengan memory graph

Method penting:

- `StateMutationEventBus.listen()`
- `StateMutationEventBus.shutdown()`
- `StateMutationEventBus.broadcast(typeKey, updatedTarget, element?)`
- `StateMutationEventBus.relay(globalKey, prop, value)`
- `StateMutationEventBus.receive()`
- `StateMutationEventBus.handler(targetKey, targetValue)`

Yang memakai:

- [`src/lib/LandingPageBuilder/Components/Base.ts`](../../Components/Base.ts)

### 5. DOMTreeMemory

File:

- [`src/lib/LandingPageBuilder/Modules/DOMTreeMemory.ts`](../../Modules/DOMTreeMemory.ts)

Tanggung jawab:

- Menyimpan node record per global key
- Menyimpan raw, proxy, relations, dan element
- Menyambungkan relasi parent-child
- Menghapus, detach, dan relink node
- Menyediakan statistik jumlah entries

Method penting:

- `DOMTreeMemory.receiveLiveBornEvent(detail, childElement)`
- `DOMTreeMemory.set(tree, element, payload, multiple)`
- `DOMTreeMemory.appendToParent(globalKey, childElement, slotName?)`
- `DOMTreeMemory.detachElement(childElement)`
- `DOMTreeMemory.linkChild(parentGlobalKey, childElement)`
- `DOMTreeMemory.findGlobalKeyByElement(element)`
- `DOMTreeMemory.getByGlobalKey(globalKey, index)`
- `DOMTreeMemory.resolveGlobalKey(tree)`

Yang memakai:

- `ElementCreatedEventBus`
- `RenderingEventBus`
- `LandingPageBuilder`

### 6. Builder Base

File:

- [`src/lib/LandingPageBuilder/Components/Base.ts`](../../Components/Base.ts)

Tanggung jawab:

- Menjadi sumber utama `render()`
- Menjaga namespace instance builder
- Mengirim event `builder:created`
- Mengirim event `builder:mutation`
- Menyediakan `attach()` dan `detach()` yang delegatif

Method penting:

- `Builder.resetCounters()`
- `Builder.currentNamespace()`
- `Builder.resolveNamespace(content, config?)`
- `Builder.buildNamespaceSeed(content, config?)`
- `Builder.create(content, config?)`
- `Builder.render(typeKey, payload, multiple)`
- `Builder.attach(childElement, globalSlotPathKey)`
- `Builder.detach(childElement)`

Pemakai utama:

- Semua builder turunan:
  - `TabBuilder`
  - `FormBuilder`
  - `InputBuilder`
  - `MasonryBuilder`
  - `CarouselBuilder`
  - `SectionBuilder`
  - `ProductGridBuilder`
  - `ProductCardBuilder`
  - dan builder lain di folder `Components`

### 7. LandingPageBuilder

File:

- [`src/lib/LandingPageBuilder/LandingPage.ts`](../../LandingPage.ts)

Tanggung jawab:

- Mengatur route swap
- Menyiapkan snapshot page
- Memanggil compiler
- Menjaga shell attach/detach
- Menggabungkan metadata hasil render

Method penting:

- `LandingPageBuilder.render(route?)`
- `LandingPageBuilder.onPageRebuild(route, payload)`
- `LandingPageBuilder.prepare()`
- `LandingPageBuilder.compile(node)`

Pemakai utama:

- Aplikasi halaman yang memakai `LandingPageBuilder`

## Progress Yang Sudah Dikerjakan

Yang sudah kita ubah sejauh ini:

- Namespacing `Builder` dibuat context-aware, bukan hanya counter global.
- `SelectorToTree` sudah pakai global key yang konsisten.
- `EventBus` sudah dimodularisasi menjadi 3 kanal.
- `builder:created` dan `builder:mutation` sudah hidup lagi.
- `DOMTreeMemory` sudah menerima live born event dan menyimpan statistik.
- `ElementCreatedEventBus` sudah bisa relay/attach/detach/destroy.
- `RenderingEventBus` sudah punya handler shell attach/detach dan statistik.
- `LandingPageBuilder.render()` sudah pakai swap route berbasis handler.
- `onPageRebuild()` sudah mencetak statistik attach dan metadata per node.

## Pengguna Utama

Kalau yang dimaksud "user" adalah pemakai internal kode ini, maka:

- Executor utama: `LandingPageBuilder`
- Pusat builder: `Builder` dan semua turunannya
- Pusat state: `DOMTreeMemory`
- Pusat event: `EventBus`

Kalau yang dimaksud "user" adalah pihak yang memanggil API dari luar, maka yang memakai dokumentasi ini biasanya:

- route controller
- theme module
- builder component
- integrasi halaman eksternal yang memanfaatkan `LandingPageBuilder`

## Cara Pakai

### Inisialisasi

```ts
import { EventBus } from "./Services/EventBus";

EventBus.listen();
```

Biasanya tidak perlu dipanggil manual kalau `LandingPageBuilder` sudah jalan, karena constructor sudah mengaktifkannya.

### Menjalankan Route Swap

```ts
await landingPageBuilder.render("admin");
```

Alur yang terjadi:

- shell lama di-detach
- data route baru diproses
- metadata dibangun
- shell baru di-attach

### Attach Node Manual

```ts
import { ElementCreatedEventBus } from "./Services/EventBus";

ElementCreatedEventBus.attach(childElement, "tab:@tab>panel~slot-name");
```

Kalau tidak pakai slot:

```ts
ElementCreatedEventBus.attach(childElement, "tab:@tab>panel");
```

### Detach Node Manual

```ts
import { ElementCreatedEventBus } from "./Services/EventBus";

ElementCreatedEventBus.detach(childElement);
```

### Handler Shell

```ts
import { RenderingEventBus } from "./Services/EventBus";

const handler = RenderingEventBus.handler("admin", shell, container);
handler.detach();
handler.attach();
```

### Stop / Cleanup

```ts
import { EventBus } from "./Services/EventBus";

EventBus.shutdown();
```

## Catatan Implementasi

- `proxy` tetap hidup di record builder selama record itu masih ada di `DOMTreeMemory`.
- `detach()` tidak otomatis berarti `destroy()`. Detach hanya melepas DOM fisik.
- `destroy()` dipakai kalau node dan relasinya memang harus dibersihkan total.
- Statistik log sengaja dibuat detail supaya kita bisa audit:
  - builder apa yang lahir
  - key apa yang dipakai
  - berapa entries tersimpan
  - node mana yang di-attach/detach

## Arah Lanjutan

Tahap berikutnya yang paling logis:

1. Memindahkan keputusan reuse/attach ke relay yang lebih eksplisit, terutama untuk nested builder yang berubah oleh route.
2. Mengurangi full clear pada route swap, lalu mengganti dengan detach/reattach parsial.
3. Menyempurnakan statistik agar tiap event punya satu helper debug konsisten.
