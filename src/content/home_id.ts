import type { iNodeContent } from "@aio-ui/core/interface";

function navScroll(selector: string): (e: Event) => void {
  return (e) => {
    e.preventDefault();
    document.querySelector(selector)?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (location.hash !== selector) history.replaceState(null, "", selector);
  };
}

function showWork(): void {
  document.querySelector("#gallery")?.scrollIntoView({ behavior: "smooth", block: "start" });
  if (location.hash !== "#gallery") history.replaceState(null, "", "#gallery");
}

const TrustSection = {
  attrs: { animation: "fade-in" },
  content: {
    ".shell": {
      content: {
        "h2.title": { content: "Cara Saya Bekerja" },
        "p.description": { content: "Saya tidak datang dari jalur programming yang lurus. Saya datang dari dunia desain, produksi, dan benda-benda nyata—lalu menemukan bahwa kode memberi saya cara baru untuk memahami, memperbaiki, dan memperluas proses mencipta." },
        ".trust.grid": {
          content: [
      { ".trust.card": { h5: { content: "⚡ Arsitektur Rendering & Framework" }, p: { content: "Saya membangun DOMRenderer untuk mengurangi setup, dependency, dan abstraksi berlebih yang membuat frontend sulit dimulai dan dirawat." } } },
      { ".trust.card": { h5: { content: "🧩 Infrastruktur Data Mandiri" }, p: { content: "Saya mengubah Google Sheets menjadi panel kontrol yang familiar, sumber data tervalidasi, dan REST API yang dibuat otomatis." } } },
      { ".trust.card": { h5: { content: "🗺️ Logika Data Spasial" }, p: { content: "Saya membangun engine alamat headless berbasis adapter agar data administratif yang rumit dapat digunakan lintas tampilan dan framework." } } },
      { ".trust.card": { h5: { content: "🛠️ Otomasi & Integrasi Fisik" }, p: { content: "Saya mengubah data digital terstruktur menjadi alur produksi berulang, dari file hasil generate hingga proses CNC dan Arduino." } } },
          ]
        }
      }
    }
  }
};

const HowSection = {
  attrs: { animation: "fade-in" },
  content: {
    ".shell": {
      content: {
        "h2.title": { content: "Beberapa Hal yang Saya Yakini" },
        "p.description": { content: "Saya tidak mengejar teknologi hanya karena ia baru. Saya mengejarnya ketika ia membantu kita bekerja dengan lebih jernih, efisien, dan bebas." },
        ".steps": {
          content: [
            { ".step": { ".step-num": { content: "1" }, h5: { content: "Kurangi yang Tidak Perlu" }, p: { content: "Framework rumit, setup panjang, dan dependency rapuh sering menyembunyikan masalah. Saya mencari jalan yang lebih langsung." } } },
            { ".step": { ".step-num": { content: "2" }, h5: { content: "Semua Harus Terdata" }, p: { content: "Hal yang dapat dilihat, dicatat, dan dilacak lebih mudah dipahami, diperbaiki, dan dikembangkan." } } },
            { ".step": { ".step-num": { content: "3" }, h5: { content: "Hilangkan Pengulangan" }, p: { content: "Pekerjaan berulang adalah tanda bahwa proses bisa dipikirkan ulang, diotomasi, atau dibuatkan alat." } } },
            { ".step": { ".step-num": { content: "4" }, h5: { content: "Belajar Sampai Mengerti" }, p: { content: "Saya tidak selalu mengetahui jawabannya sejak awal, tetapi bersedia masuk lebih dalam sampai sesuatu benar-benar bekerja." } } },
          ]
        }
      }
    }
  }
};

const GallerySection = {
  attrs: { animation: "fade-in" },
  content: {
    ".shell": {
      content: {
        "h2.title": { content: "Yang Pernah Saya Bangun" },
    "p.description": { content: "Karya-karya ini lahir dari masalah konkret: setup frontend yang rapuh, dashboard admin yang asing, data wilayah yang rumit, dan pekerjaan produksi yang berulang. Semuanya adalah upaya untuk membuat proses lebih jelas dan mandiri." },
        ".features.grid": {
          content: [
      { ".feature.card": { h5: { content: "DOMRenderer" }, p: { content: "Compiler DOM deklaratif tanpa dependency yang mengubah schema terstruktur menjadi interface hidup, lengkap dengan lifecycle protection dan theme override." } } },
      { ".feature.card": { h5: { content: "Google Sheets CMS" }, p: { content: "Ekosistem CMS yang mengubah spreadsheet familiar menjadi konten tervalidasi, REST API, dan panel kontrol tanpa dashboard baru." } } },
      { ".feature.card": { h5: { content: "IdAddressBuilder" }, p: { content: "Engine data administratif Indonesia yang headless dan berbasis adapter, dengan cascading selection, reverse postal lookup, cache, dan geocode." } } },
      { ".feature.card": { h5: { content: "Automated Website Generator" }, p: { content: "Pipeline yang mengubah brief bahasa natural menjadi website, membuat data layer, melakukan deployment, lalu menyerahkan ownership kepada klien." } } },
          ]
        },
        "a.button.primary#gallery-link": { attrs: { href: "#gallery" }, content: "Buka Gallery Portfolio", onCreated: (el: HTMLElement) => el.addEventListener("click", navScroll("#gallery")) }
      }
    }
  }
};

const FeaturesSection = {
  attrs: { animation: "fade-in" },
  content: {
    ".shell": {
      content: {
        "h2.title": { content: "Apa yang Bisa Anda Harapkan" },
    "p.description": { content: "Saya membawa cara berpikir seorang designer ke dalam frontend engineering: perhatian pada detail, rasa terhadap bentuk, dan disiplin untuk memahami setiap bagian dari input awal sampai hasil akhir." },
        ".features.grid": {
          content: [
            { ".feature.card": { h5: { content: "🧭 Berpikir dari Akar" }, p: { content: "Saya mencari tahu apa yang sebenarnya ingin diselesaikan, termasuk bagian kecil yang sering terlewat." } } },
            { ".feature.card": { h5: { content: "🪶 Kesederhanaan yang Disengaja" }, p: { content: "Saya menyukai solusi yang dapat dijelaskan dengan jernih dan tidak menyulitkan orang berikutnya yang harus merawatnya." } } },
            { ".feature.card": { h5: { content: "🌱 Ruang untuk Bertumbuh" }, p: { content: "Saya terus belajar ketika pekerjaan menuntut pengetahuan baru, karena karya yang baik tidak boleh berhenti pada kemampuan yang sudah dimiliki." } } },
          ]
        }
      }
    }
  }
};

const FaqSection = {
  attrs: { animation: "fade-in", style: "margin:auto;" },
  content: {
    ".shell": {
      content: {
        "h2.title": { content: "Tentang Bekerja Bersama" },
        "p.description": { content: "Saya terbuka pada pekerjaan dan proyek yang membutuhkan rasa ingin tahu, ketelitian, dan kemauan untuk masuk lebih dalam." },
        ".faq-list": { content: `<details open><summary>Bidang apa yang sedang saya tekuni?</summary><p>Frontend engineering, arsitektur framework, sistem data, automation, tooling, dan hubungan antara software dengan proses produksi fisik.</p></details><details><summary>Apakah saya hanya membuat framework sendiri?</summary><p>Tidak. Saya dapat bekerja dengan teknologi yang sudah ada. Framework sendiri saya bangun karena ingin memahami fondasinya dan mengatasi batasan yang saya temui.</p></details><details><summary>Bagaimana saya menjaga kualitas pekerjaan?</summary><p>Dengan mencatat proses, melacak alur data, mengurangi pengulangan, dan memberi perhatian pada detail kecil yang biasanya baru terlihat ketika sesuatu mulai rusak.</p></details><details><summary>Apakah saya masih membawa pengalaman desain?</summary><p>Ya. Pengalaman di graphic design, 3D, product design, packaging, printing, dan workshop membentuk cara saya melihat struktur, detail, material, dan hasil akhir.</p></details><details><summary>Bagaimana cara membicarakan sebuah proyek?</summary><p>Ceritakan masalah atau gagasannya apa adanya. Saya lebih tertarik memahami konteks dan prosesnya sebelum membicarakan teknologi yang akan digunakan.</p></details>` }
      }
    }
  }
};

const CtaSection = {
  attrs: { animation: "fade-in" },
  content: {
    ".shell": {
      content: {
        "h2.title": { content: "Mari Membuat Sesuatu yang Berarti" },
        "p.description": { content: "Jika Anda sedang mencari seseorang yang mau memahami masalah sampai ke detailnya, mungkin kita bisa menemukan sesuatu untuk dibangun bersama." },
        "button.button.primary#cta-start": { content: "Mulai Berdiskusi", onCreated: (el: HTMLElement) => el.addEventListener("click", showWork) }
      }
    }
  }
};

const FooterSection = {
  content: {
    ".inner": {
      content: {
        ".brand": { content: "Frontend Engineer & Maker" },
        ".tagline": { content: "We learn, we build, we innovate." },
        ".legal": { content: "Produk memiliki harga, tetapi kemasan menambah nilainya." }
      }
    }
  }
};

export const HomepageContent_id: iNodeContent = {
  "#app": {
    content: {
      nav: {
        content: {
          ".brand": { attrs: { href: "#home" }, content: "Portfolio Personal", onCreated: (el: HTMLElement) => el.addEventListener("click", navScroll("#home")) },
          ".navigations": {
            "a.item#home-link": { attrs: { href: "#home" }, content: "Beranda", onCreated: (el: HTMLElement) => el.addEventListener("click", navScroll("#home")) },
            "a.item#how-link": { attrs: { href: "#how" }, content: "Prinsip", onCreated: (el: HTMLElement) => el.addEventListener("click", navScroll("#how")) },
            "a.item#gallery-link": { attrs: { href: "#gallery" }, content: "Karya", onCreated: (el: HTMLElement) => el.addEventListener("click", navScroll("#gallery")) },
            "a.item#features-link": { attrs: { href: "#features" }, content: "Pendekatan", onCreated: (el: HTMLElement) => el.addEventListener("click", navScroll("#features")) },
            "a.item#faq-link": { attrs: { href: "#faq" }, content: "Tentang", onCreated: (el: HTMLElement) => el.addEventListener("click", navScroll("#faq")) },
          },
          "button.button.primary#start-link": { content: "Karya Saya", onCreated: (el: HTMLElement) => el.addEventListener("click", showWork) }
        }
      },
      main: {
        content: {
          "section#home": {
            content: {
              ".row$1": {
                content: {
                  "h3.title": { content: "Saya Membuat Sesuatu, Lalu Mencari Cara Membuatnya Lebih Baik" },
      ".description.natural": { content: `<span>Saya memulai perjalanan dari dunia desain visual—graphic design, 3D, product design, packaging, dan printing—jauh sebelum programming menjadi bagian dari pekerjaan saya.</span><span>Dari sana saya belajar bahwa menciptakan sesuatu bukan hanya soal bentuk akhirnya, tetapi juga tentang proses di belakangnya.</span><blockquote>"Bagaimana mengurangi kesalahan, menghilangkan pengulangan, dan membuat setiap bagian proses dapat dipahami?"</blockquote><span>Pertanyaan itu membawa saya dari printing calculator, generator dieline parametrik, dan G-code menuju CMS, CLI, framework frontend, serta mesin DIY CNC. Sekarang saya membangun sistem frontend dan automation yang mengurangi friksi—dari brief bahasa natural hingga website, data layer, deployment, dan ownership klien.</span>` },
                  "h4.asking.question": { content: "Lihat apa saja yang pernah saya buat" },
                  "button#start.button.small": { content: "Lihat Karya Saya", onCreated: (el: HTMLElement) => el.addEventListener("click", showWork) }
                }
              }
            },
            "section#trust": TrustSection, "section#how": HowSection, "section#gallery": GallerySection,
            "section#features": FeaturesSection, "section#faq": FaqSection, "section#cta": CtaSection
          }
        },
        footer: FooterSection
      }
    }
  }
};
