## 🚀 Pure-JS UI Factory Framework## The Anti-Framework Framework: Build Runtimes, Dashboards, and Mass Websites with Zero Code Overhead.

Welcome to the Pure-JS UI Factory Framework! This is a world-class, ultra-lightweight web generation system built entirely on Native Vanilla JS. It completely eliminates the need for modern framework bloatware (No React, No Vue, No Webpack complexity) while delivering 100/100 Google Lighthouse Speed and SEO performance.
This framework treats websites and admin dashboards purely as structured data. By writing simple, human-friendly JSON objects, you can automatically generate high-performance public landing pages and fully functional administration panel forms in an instant.

---

## 🧭 Architectural Philosophy & Ecosystem Flow

The entire framework operates on an Object-Oriented, Source-Driven pattern. The rendering engine remains completely isolated from layout aesthetics and business logic. Component structures are defined declaratively as clean JSON-serializable state structures.

```txt
┌─────────────────────────────────────────────────────────────────────────┐
│                    Google Sheets / Native Data Stream                   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼ (Discovery / Input Schema Parsing)
┌─────────────────────────────────────────────────────────────────────────┐
│               Raw JSON-Serializable Page State Objects                  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼ (NodeTransformer.toFormNode Pipeline)
┌─────────────────────────────────────────────────────────────────────────┐
│      iBasicNode[] Tree Mapping (Standard Layouts + Form Injectors)      │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ├────────────────────────┐
                                     ▼ (beforeRender Event)   │
                        ┌───────────────────────────────┐     │
                        │    ThemeRenderer Intercept    │     │
                        │    (beforePageRender Hooks)   │     │
                        └────────────┬──────────────────┘     │
                                     │ (Pass-by-Reference)    │
                                     ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      DOMRenderer Core Parse Engine                      │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼ (Batch Fragment Synthesis)
┌─────────────────────────────────────────────────────────────────────────┐
│                Native Live HTML Document Element Tree                   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼ (onReady Event Lifecycle)
┌─────────────────────────────────────────────────────────────────────────┐
│           Progressive Hydration Scripts & Smooth Scroll Hijack          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🗺️ Framework Architecture Analogy

To understand how this factory operates, imagine you are building a modular custom house:

1.  The Blueprint (iBasicNode Data Schema): A simple text-based list describing what should be inside the house (e.g., "Put a title text here", "Put an image there"). It doesn't care about complex HTML brackets.
2.  The Factory Assembler (DOMRenderer): The heavy mechanical machine. It takes your text blueprint and instantly manufactures solid physical walls and windows (Live HTML DOM elements) with maximum speed and memory safety.
3.  The Orchestrator (LandingPageBuilder): The site manager. It listens to the browser address bar (Routing Hash) and tells the factory which room blueprint to manufacture currently. It also manages global assets like the shared Header Menu and Footer.
4.  The Custom Furnishers (Component Builders): Specialist technicians called only when a room needs advanced machinery (e.g., a dynamic carousel, a multi-step form, or a calculation data table).
5.  The Magic Painter (ThemeRenderer): A visual shape-shifter. With a single switch, it can tilt the entire house sideways (Horizontal Scroll Mode) or paint it neon (Cyberpunk Mode) without changing the foundation blueprint data.
6.  The Intercom System (EventEmitter): The central walkie-talkie. It broadcasts alerts when a page changes or a theme shifts so external scripts can listen and react.
7.  The Smart Translator (resolveContentObj): A friendly interpreter that translates relaxed, beginner-friendly JSON shorthand into the strict technical tokens required by the factory machine.

---

## 📦 Getting Started & Standard Usage

Making a website is as simple as creating a single data source file containing your pages.

## 1. Define Your Pages Data (site-source.json)

You or an AI Agent can write your website structure using a flat, uniform format where content is the universal slot for text, images, or child elements. You can use the \_field property to mark parts of the page that you want to automatically manage in the admin dashboard panel later.

```json
{
  "pages": {
    "home": [
      {
        "tagName": "section",
        "id": "hero-banner",
        "className": "section row align-mid",
        "content": [
          {
            "tagName": "div",
            "className": "column half",
            "content": [
              {
                "tagName": "p",
                "className": "eyebrow",
                "_field": "@hero:eyebrow~text",
                "content": "Family Private Trip • Seribu Islands"
              },
              {
                "tagName": "h2",
                "className": "title",
                "_field": "@hero:title~textarea",
                "content": "Tranquil and Tailored Sea Vacations."
              }
            ]
          },
          {
            "tagName": "div",
            "className": "column half",
            "builder": "carousel",
            "isRoot": true,
            "content": [
              { "image": "boat-view.jpg", "title": "Explore Paradise" },
              { "image": "beach-sunset.jpg", "title": "White Sand Beaches" }
            ]
          }
        ]
      }
    ],
    "about": [
      {
        "tagName": "section",
        "className": "section padding-large",
        "content": "<h2>About Our Operations</h2><p>We are a certified local island group...</p>"
      }
    ]
  }
}
```

## 2. Initialize the Web Factory Runtime (main.js)

To ignite the page, import your source data, register your component extensions into the central registry container, and fire up the manager.

```ts
import { LandingPageBuilder } from "./core/LandingPageBuilder";
import { BuilderRegistry } from "./core/BuilderRegistry";
import { ThemeRenderer } from "./theme/ThemeRenderer";
// 1. Prepare your dynamic complex extensions library
const appRegistry = new BuilderRegistry()
  .register("carousel", (slideItems) => new CarouselComponent(slideItems))
  .register("form", (formSchema) => new FormBuilder(formSchema).create(formSchema.group))
  .register("pricing-table", (tableData) => new TableGridBuilder(tableData).create());
// 2. Instantiate the orchestrator pointing to an HTML container div
const site = new LandingPageBuilder(
  mySiteSourceData,
  {
    container: "#app-root",
    theme: "vertical",
    defaultRoute: "home",
    useMenu: true,
    useFooter: true,
  },
  appRegistry,
);
// 3. Mount the visual runtime theme manager with a floating controller widget
const themes = new ThemeRenderer(site, "bottom-right")
  .registerTheme(new VerticalNormalTheme())
  .registerTheme(new HorizontalSlideTheme())
  .registerTheme(new CyberpunkNeonTheme());
// 4. Fire! The website goes live instantly
site.render();
```

---

## 🛠️ Customizing the Factory Elements## How to Create or Extend Complex Component Builders

When text and images are not enough and you need advanced interactions (like an interactive sliding image array or an automated form handler), you can encapsulate that behavior inside a class builder.
Every complex builder should expose a single deployment point (like a .create() method) that uses the internal DOMRenderer to assemble its deep element hierarchy. This keeps code incredibly neat and prevents "HTML soup wrapper nesting bugs."
Here is how you write a clean, standardized blueprint extension for future components:

```ts
export class CustomAccordionBuilder {
  constructor() {
    this.renderer = new DOMRenderer();
  }

  public create(itemsArray) {
    // Transform incoming array data into a safe declarative iBasicNode tree structure
    const accordionLayout = {
      tagName: "div",
      className: "ui accordion-wrapper-root",
      content: itemsArray.map((item) => ({
        tagName: "div",
        className: "accordion-item-row",
        content: [
          { tagName: "div", className: "accordion-trigger-header", content: item.title },
          { tagName: "div", className: "accordion-body-content", content: item.description },
        ],
      })),
    };

    // Feed it to the engine to manufacture a highly secure live DOM node
    return this.renderer.render(resolveContentObj(accordionLayout));
  }
}
```

---

## 🧙‍♂️ The "Abakadabra" Visual Theme Transformers

Themes in this framework do not just toggle a light/dark CSS class name. Thanks to the advanced Event-Driven Pre-Render Interceptor, a layout theme can completely intercept your JSON data and reconstruct the entire house framework before anything hits the live viewport.
Themes implement a strict 3-tiered lifecycle:

1.  beforePageRender: Rebuilds, wraps, or injects objects in the JSON blueprint data array.
2.  activate: Alters global shell style containers and mounts event tracking behaviors once live.
3.  deactivate: Wipes clean active listeners from memory when switching themes to prevent layout degradation.

## Example: Customizing a Theme Class

```ts
export class HorizontalSlideTheme {
  constructor() {
    this.themeId = "horizontal";
    this.name = "↔️ Horizontal Slider Mode";
    this.shellRef = null;
  }

  // Tier 1: Reconstruct the structural data blueprint array BEFORE rendering
  beforePageRender(pagesArray, menuObject, footerObject) {
    pagesArray.forEach((block) => {
      // Forcefully inject layout utility tokens to every section array entry
      block.className = `${block.className || "section"} horizontal-slide-panel`;
    });
    return { pages: pagesArray, menu: menuObject, footer: footerObject };
  }

  // Tier 2: Activate post-render layout modifications and behaviors
  activate(shellElement, allLiveElements) {
    this.shellRef = shellElement;
    shellElement.className = "page theme-layout-horizontal";

    // Inject extreme viewport tracking styles natively
    shellElement.style.display = "flex";
    shellElement.style.flexDirection = "row";
    shellElement.style.overflowX = "auto";
    shellElement.style.width = "100vw";
    shellElement.style.height = "100vh";

    // Bind custom mouse wheel hijacking to scroll the page horizontally
    shellElement.addEventListener("wheel", this.scrollShiftHandler, { passive: false });
  }

  // Tier 3: Safely wipe memory bounds clean on theme unmount (Prevents Memory Leaks)
  deactivate(shellElement) {
    if (this.shellRef) {
      this.shellRef.removeEventListener("wheel", this.scrollShiftHandler);
      shellElement.removeAttribute("style");
    }
    this.shellRef = null;
  }

  private scrollShiftHandler = (e) => {
    if (this.shellRef) {
      e.preventDefault();
      this.shellRef.scrollLeft += e.deltaY;
    }
  };
}
```

---

## ⚡ The Event Emitter Ecosystem (Global Hooks)

The LandingPageBuilder exposes a powerful, type-safe public events console terminal. This allows external analytic plugins, global animation scripts (like GSAP ScrollTrigger), or database sync services to safely tap into the application shell lifecycle without interfering with the internal engine.

## Available Event Terminals:

- beforeRender: Fired right before the factory synthesizes DOM nodes. Best place for themes to modify reference JSON objects.
- onPageChanged: Triggers whenever a hash route shift finishes rendering a page.
- onThemeChanged: Broadcasts when a theme switch is actively triggered.
- onElementAdded / onElementRemoved: Dispatched whenever a block node section structural mount/unmount cycle occurs.
- onReady: Fires when the entire elements hierarchy finishes rendering completely on the DOM viewport.
- onError: Captures core rendering exceptions and traps layout crashes gracefully.

## Example: Hooking into Event Listeners

// Tap into the system ready lifecycle globally from main.js

```ts
site.events.on("onReady", (eventData) => {
  console.log("DOM Factory completed rendering page successfully!", eventData.allElements);

  // You can easily attach custom global animation scripts like GSAP or tracking pixels here!
  gsap.from(eventData.allElements, { opacity: 0, y: 30, stagger: 0.1 });
});

// Hook into the global error handler
site.events.on("onError", (errorData) => {
  alert(`Application alert captured inside [${errorData.context}]: ${errorData.message}`);
});
```

---

## 🤖 The Automated CMS Admin Dashboard Flow

The absolute apex power of this framework lies in the Automated CMS Transformation Engine (NodeTransformer.toFormNode).
Because your pages are built using uniform JSON metadata structures, you never need to code an admin dashboard page manually. By simply feeding your website data array into the NodeTransformer, it executes a lightning-fast reverse-engineering scan, maps fields, generates smart variable fallbacks, and instantly returns a fully functional administrative control panel!

## The Automated Flow:

1.  The Automatic Mapping Selector: You pass your visual page nodes array alongside simple CSS selector rules (e.g., Target all p.eyebrow elements as a text field, target all h2.title as a large textarea input).
2.  The Manual Override Bypass: If you or an AI Agent want specific control on a certain element, you don't even need to touch the global selector rules. Simply add a localized system key tag \_field: "@group:key~inputType" on that specific node. The transformer will instantly bypass global rules and execute your precise manual command.
3.  The Production Output: The transformer spits out a highly organized form schema that plugs straight into your FormBuilder component to render a complete client dashboard interface on any server platform (including Node.js, cPanel, or Google Apps Script/Google Sheets).

## Complete Example of an Admin Generation Event:

```ts
// 1. Define global rules for your visual text markers

const autoCMSInjectionRules = [
  { selector: "p.eyebrow", inputType: "text" },
  { selector: "h2.title", inputType: "textarea" },
  { selector: "p.description", inputType: "textarea" },
  { selector: "img", inputType: "file" }, // Auto-triggers your custom Google Drive file uploader!
];

// 2. One-Step Magic Reverse Engineering Execution!
// // Maps visual nodes, runs smart fallback variables, respects manual overrides, and returns a form schema array.

const autogeneratedFormSchema = NodeTransformer.toFormNode(pureVisualNodes, autoCMSInjectionRules);

// 3. Inject it straight into your class-based FormBuilder component
const liveCmsControlPanelDOM = globalFormBuilder.create(autogeneratedFormSchema);

// 4. Render the dashboard layout instantly on your admin container viewport!
document.getElementById("admin-dashboard-container").appendChild(liveCmsControlPanelDOM);
```

---

## 💎 Why This System is a Massive Victory For You:

1.  Unrivaled Coding Speed: You write a layout once as a clean text-based list, and your landing pages, content configurations, database models, and administration forms are generated automatically. Development times are slashed by hundreds of times.
2.  AI Agent Heaven: AI Agents absolutely thrive on this architecture. They don't need to hazardously write sloppy, unpredictable raw HTML brackets. They simply generate flat, highly structured JSON data strings matching the iBasicNode schema, and your engine handles 100% of the visual safety and execution.
3.  Complete Vendor Lock-In Independence: This framework does not tie you down to an expensive hosting infrastructure or specific server stack. You can host the compiled static files anywhere in the world—hooked into Google Sheets cloud infrastructure or an enterprise corporate SQL database server via simple HTTP requests.

---

```ts
export class LandingPageBuilder2 {
  constructor() {
    // 1. menginit value dari property-property yang ada
    // 2. men-setup routes
    // 3. emit event error kalau gagal
  }

  render() {
    // 1. tugasnya hanya mengorkestrasi
    // - memisahkan menu, pages, footer lalu ditransform oleh `prepare` kemudian difinishing oleh `compile` masing-masing
  }

  prepare() {
    // 1. men-clone data snapshot dari source
    // 2. scanning metadata
    // 3. emit event. dimana data yang diemit ini nanti disubscribe oleh themeRenderer,
    // jadi bisa dirubah sebelum di compile menjadi dom.
  }

  compile() {
    // 1. men-transformasi json data source yang ditulis dengan format iBasicNode = basic user friendly,
    // ke iNodeContent <= DOMRenderer object format
    // 2. mengumpulkan object mana saja yang memiliki property `builder` ini akan diarahkan ke saluran `ComponentRegistry` untuk diarahkan
    // ke component buildernya masing-masing sesuail value dari property builder ini. ini dihandle helper `_renderComponent` nanti outputnya
    // dikembalikan lagi namun property contentnya bukan lagi json data tapi .content => HTMLElement
    // 3. transformasi data dari step satu, dan dua disatukan kembali lalu diproses DOMRenderer untuk menjadi page penuh.
  }

  destroy() {
    // mencabut `shell: HTMLElement` dari DOM
    // memanggil ComponentRegistry.clear()
    // emit event
  }
}
```
