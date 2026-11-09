// ================================================================
// HOME — halaman presentasi (rute #/home)
// ================================================================

import type { iNodeContent } from "@aio-ui/core/interface";
import { HomepageContent_id } from "./home_id";
import { HorizontalScrollingPage } from "@aio-ui/theme-horizontal";
import { navigationMenu, navScroll, requestStart } from "./shared";


// ── SECTION_SLOT ──

// =====================================================================
// 🤝 TRUST MOMENT — "apa yang lahir langsung di akun ANDA"
// =====================================================================
const TrustSection = {
  attrs: { "animation": "fade-in" },
  content: {
    ".shell": {
      content: {
        "h2.title": { content: "How I Work" },
        "p.description": { content: "I did not come through a conventional programming path. I came from design, production, and physical objects—then discovered that code gave me a new way to understand, improve, and expand the act of making." },
        ".trust.grid": {
          content: [
            {
              ".trust.card": {
                "h5": { content: "⚡ Custom Rendering & Framework Architecture" },
                "p": { content: "I built it to reduce the setup, dependency, and abstraction overhead that makes frontend work harder to start and harder to maintain." }
              }
            },
            {
              ".trust.card": {
                "h5": { content: "🧩 Serverless & No-Code Infrastructure" },
                "p": { content: "I turned Google Sheets into a familiar control panel, a validated data source, and an automatically generated REST API." }
              }
            },
            {
              ".trust.card": {
                "h5": { content: "🗺️ Spatial & Data Logic Engineering" },
                "p": { content: "I built a headless, adapter-based address engine so complex hierarchical data could work across different interfaces and frameworks." }
              }
            },
            {
              ".trust.card": {
                "h5": { content: "🛠️ Automation & Physical-Digital Integration" },
                "p": { content: "I use it to turn structured digital data into repeatable production workflows, from generated files to CNC and Arduino processes." }
              }
            },
          ]
        },
      }
    }
  }
};

// =====================================================================
// 🧭 CARA KERJA — empat langkah dari deskripsi menuju website live
// =====================================================================
const HowSection = {
  attrs: { "animation": "fade-in" },
  content: {
    ".shell": {
      content: {
        "h2.title": { content: "A Few Things I Believe In" },
        "p.description": { content: "I do not pursue technology simply because it is new. I pursue it when it helps us work with more clarity, efficiency, and freedom." },
        ".steps": {
          content: [
            { ".step": { ".step-num": { content: "1" }, "h5": { content: "Remove What Is Unnecessary" }, "p": { content: "Complex frameworks, lengthy setup, and fragile dependencies often hide the real problem. I look for a more direct path." } } },
            { ".step": { ".step-num": { content: "2" }, "h5": { content: "Make Everything Traceable" }, "p": { content: "What can be seen, recorded, and tracked is easier to understand, improve, and develop." } } },
            { ".step": { ".step-num": { content: "3" }, "h5": { content: "Eliminate Repetition" }, "p": { content: "Repetitive work is a sign that a process can be reconsidered, automated, or turned into a tool." } } },
            { ".step": { ".step-num": { content: "4" }, "h5": { content: "Learn Until It Makes Sense" }, "p": { content: "I do not always know the answer at the beginning. But I am willing to go deeper until I can make something that truly works." } } },
          ]
        },
      }
    }
  }
};

// =====================================================================
// 🖼️ KARYA — pengantar menuju gallery portfolio
// =====================================================================
const GallerySection = {
  attrs: { "animation": "fade-in" },
  content: {
    ".shell": {
      content: {
        "h2.title": { content: "What I Have Built" },
        "p.description": { content: "These projects began with concrete frustrations: fragile frontend setup, unfamiliar admin dashboards, tangled regional data, and repetitive production work. Each one became an attempt to make the process clearer and more independent." },
        ".features.grid": {
          attrs: { "animation": "fade-in", "animation-chain": "true" },
          content: [
            { ".feature.card": { "h5": { content: "DOMRenderer" }, "p": { content: "A dependency-free declarative DOM compiler that turns structured schemas into live interfaces, with lifecycle protection and theme overrides." } } },
            { ".feature.card": { "h5": { content: "Google Sheets CMS" }, "p": { content: "A CMS ecosystem that turns a familiar spreadsheet into validated content, a REST API, and a control panel—without forcing users to learn another dashboard." } } },
            { ".feature.card": { "h5": { content: "IdAddressBuilder" }, "p": { content: "A headless and adapter-based engine for Indonesian administrative data, supporting cascading selection, reverse postal lookup, caching, and geocoding." } } },
            { ".feature.card": { "h5": { content: "Automated Website Generator" }, "p": { content: "A complete pipeline that turns a natural-language brief into a website, creates its data layer, deploys it, and detaches ownership to the client." } } },
          ]
        },
        "a.button.primary#gallery-link": { attrs: { href: "#gallery" }, content: "Explore the Portfolio Gallery", onCreated: (el: HTMLElement) => el.addEventListener("click", navScroll("#gallery")) },
      }
    }
  }
};

// ── SECTION_SLOT ──

// =====================================================================
// ⚙️ FITUR — dibuat untuk usaha kecil yang mandiri
// =====================================================================
const FeaturesSection = {
  attrs: { "animation": "fade-in" },
  content: {
    ".shell": {
      content: {
        "h2.title": { content: "What You Can Expect" },
        "p.description": { content: "I bring a designer's way of thinking into frontend engineering: attention to detail, a sense of form, and the discipline to understand how every part works—from the first input to the final result." },
        ".features.grid": {
          attrs: { "animation": "fade-in", "animation-chain": "true" },
          content: [
            {
              ".feature.card": {
                "h5": { content: "🧭 Start at the Root" },
                "p": { content: "I try to understand what actually needs to be solved, including the small parts that are often overlooked." }
              }
            },
            {
              ".feature.card": {
                "h5": { content: "🪶 Deliberate Simplicity" },
                "p": { content: "I value solutions that can be explained clearly and do not make life harder for the next person who maintains them." }
              }
            },
            {
              ".feature.card": {
                "h5": { content: "🌱 Room to Grow" },
                "p": { content: "I keep learning when the work demands new knowledge, because good work should not stop at what I already know." }
              }
            },
          ]
        },
      }
    }
  }
};

// =====================================================================
// ❓ TANYA JAWAB — meredam keraguan sebelum mulai
// =====================================================================
const FaqSection = {
  attrs: { "animation": "fade-in", style: "margin:auto;" },
  content: {
    ".shell": {
      content: {
        "h2.title": { content: "Working Together" },
        "p.description": { content: "I am open to work and projects that require curiosity, care, and a willingness to go deeper." },
        ".faq-list": {
          content: `
            <details open>
              <summary>What areas am I focused on?</summary>
              <p>Frontend engineering, framework architecture, data systems, automation, tooling, and the relationship between software and physical production.</p>
            </details>
            <details>
              <summary>Do I only build my own frameworks?</summary>
              <p>No. I can work with existing technology. I build my own frameworks because I want to understand the foundations and address the limitations I encounter.</p>
            </details>
            <details>
              <summary>How do I maintain quality?</summary>
              <p>By documenting processes, tracking data flows, reducing repetition, and paying attention to small details that often only become visible when something breaks.</p>
            </details>
            <details>
              <summary>Do I still bring my design experience?</summary>
              <p>Yes. My experience in graphic design, 3D, product design, packaging, printing, and workshop production shaped how I see structure, detail, material, and the final result.</p>
            </details>
            <details>
              <summary>How should we talk about a project?</summary>
              <p>Tell me about the problem or idea as it is. I am more interested in understanding the context and process before discussing the technology.</p>
            </details>
          `
        },
      }
    }
  }
};

// ── SECTION_SLOT ──

// =====================================================================
// 🚀 CTA — ajakan terakhir kembali ke wizard
// =====================================================================
const CtaSection = {
  attrs: { "animation": "fade-in" },
  content: {
    ".shell": {
      content: {
        "h2.title": { content: "Let Us Make Something Meaningful" },
        "p.description": { content: "If you are looking for someone willing to understand a problem down to its details, perhaps we can find something to build together." },
        "button.button.primary#cta-start": {
          content: "Start a Conversation",
          onCreated: (el: HTMLElement) => el.addEventListener("click", () => requestStart()),
        },
      }
    }
  }
};

// =====================================================================
// 🦶 FOOTER — penegasan terakhir kemandirian & kepemilikan
// =====================================================================
const FooterSection = {
  content: {
    ".inner": {
      content: {
        ".brand": { content: "Frontend Engineer & Maker" },
        ".tagline": { content: "We learn, we build, we innovate." },
        ".legal": { content: "A product has its price, but its packaging adds value." },
      }
    }
  }
};
export const HomepageContent_en: iNodeContent =
{
  ".page": {
    content: {
      ...navigationMenu,
      "main": {
        content: {
          "section#home": {
            content: {
              ".row$1": {
                content: {
                  "h3.title": {
                    attrs: { "animation": "fade-in", "animation-chain": "true", "animated-once": "true" },
                    content: "I Make Things, Then Find Ways to Make Them Better"
                  },
                  ".description.natural": {
                    attrs: { "animation": "typewriter", "data-tw-rewrite": "true", "animation-chain": "true" },
                    content: `
                      <span>
                        I began in visual design—graphic design, 3D, product design, packaging, and printing—long before programming became part of my work.
                      </span>

                      <span>
                      That taught me that creating something is not only about its final form, but also about the process behind it.
                      </span>

                      <blockquote>

                      "How can I reduce mistakes, eliminate repetition, and make every part of the process understandable?"

                      </blockquote>

                      <span>
                        That question led me from printing calculators, parametric dieline generators, and G-code to CMS tools, CLIs, frontend frameworks, and DIY CNC machines. Today I build frontend systems and automation that remove unnecessary friction—from a natural-language brief to a working website, data layer, deployment, and client ownership.
                      </span>`
                  },

                  "h4.asking.question": {
                    attrs: { "animation": "fade-in", "animation-chain": "true", "animated-once": "true" },
                    content: "See what I have built"
                  },
                  "button#start.button.small": {
                    attrs: {
                      "animation": "text-scramble",
                      "animation-chain": "true",
                      "animated-once": "true"
                    },
                    content: "Explore My Work",
                    onCreated: (el: HTMLElement) => {
                      el.addEventListener("click", () => requestStart());
                    }
                  }
                },
              },
              // (blok rujukan .row$2 dengan tabel lama dihapus — dipindah ke section terpisah)
            }
          },
          "section#trust": TrustSection,
          "section#how": HowSection,
          "section#gallery": GallerySection,
          "section#features": FeaturesSection,
          "section#faq": FaqSection,
          "section#cta": CtaSection,
          "footer": FooterSection,
        },
        onCreated: (el: HTMLElement) => {
          const elements = el.children;
          console.log(elements)
          new HorizontalScrollingPage().activate(el, elements)
        }
      },
    }
  }
}

const locale: "id" | "en" = "en"
// Backward-compatible default used by the current router until i18n is wired.
export const HomepageContent = locale === "en" ? HomepageContent_en : HomepageContent_id;
