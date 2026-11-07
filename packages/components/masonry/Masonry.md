## Dynamic Masonry Gallery Builder

A high-performance, lightweight (under 3KB), dependency-free Vanilla TypeScript/JavaScript component designed for static landing pages. It features an automated cascading masonry grid, fluid responsive category filtering with a hardware-accelerated sliding background, native progressive lazy loading, and an accessible media lightbox modal with global keyboard bindings.

## Features

- Zero Dependencies: Pure Vanilla TypeScript/ES6 implementation.
- Robust Architecture: Built around strict Immutability and Data Encapsulation principles using ES6 Private Fields (#items) to prevent client-side script pollution or data bypassing.
- Smart Category Filtering: Dynamically scans injected item data payloads, automatically isolates unique category metadata tokens, and establishes a seamless content filter flow.
- Fluid Slider Animation: A 100% precision hardware-accelerated background tracker (translate3d) that dynamically recalculates node dimensions using offsetLeft metrics.
- Infinite Scroll & Paged Delivery: Leverages the high-performance native browser IntersectionObserver API to progressively append asset batches smoothly without viewport-scroll lag (scroll jank).
- Responsive Fluid Grid: Native adaptive layout rendering utilizing the CSS column-count engine.
- Fail-safe Production Recovery: Injected fallback base64 vector engines handle server asset connection loss smoothly.

---

## Installation & Setup

1.  Copy the code into your project structure (e.g., MasonryBuilder.ts).
2.  Implement your stylesheet rules (see Styling Requirements below).
3.  Instantiate and run the execution lifecycles.

## Basic Implementation Example

```ts
import { MasonryBuilder, iSectionContent } from "./MasonryBuilder";
const config = {
  column: 3,
  lazyload: true,
  maxDisplayed: 4,
  useLoadButton: false, // Set to true to switch from Auto-Infinite Scroll to a manual button
  category: null, // Loads 'All' on init. Pass a string like "A" to default to a specific category
};
// Instantiationconst masonry = new MasonryBuilder(config);
// Mock Data Structure Payload
const galleryContent: iSectionContent = {
  id: "marketing-gallery",
  className: "my-custom-wrapper-style",
  items: [
    { image: "https://placehold.co", category: "Branding", title: "Project A", description: "Design work" },
    { image: "https://placehold.co", category: "Web", title: "Project B" },
    { image: "https://placehold.co", category: "Branding", title: "Project C" },
    { image: "https://placehold.co", category: "Mobile", title: "Project D" },
  ],
};
// Render and append onto the UI DOM root
const appContainer = document.getElementById("app");
if (appContainer) {
  const renderedComponent = masonry.prepare(galleryContent);
  appContainer.appendChild(renderedComponent);
}
```

---

## Developer API & Typing Specifications## Configuration Types (iMasonryConfig)

| Property      | Type              | Required    | Description                                                                                          |
| ------------- | ----------------- | ----------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| column        | number            | Yes         | Total structural column count target initialized on desktop views.                                   |
| lazyload      | boolean           | Yes         | Opt-in to trigger native browser element loading="lazy" flags.                                       |
| maxDisplayed  | number            | Yes         | Pagination limiter constraint matching the data volume chunk size to render per batch lifecycle.     |
| container     | string            | HTMLElement | No                                                                                                   | Target boundary reference. If defined, automatically overrides creation of the fallback <section> shell. |
| useLoadButton | boolean           | No          | Overrides automated scroll sentinel mechanics with a hardcoded interaction trigger button interface. |
| category      | string            | null        | No                                                                                                   | Force state tracking constraints on component initialization.                                            |
| selectors     | iMasonrySelectors | No          | Custom object dictionary to override class token outputs.                                            |

## Data Security: Getter & Setter Pipelines

To prevent memory pollution, security leaks, or unwanted modifications from external source scripts, never mutate structural contents directly. The component provides clean, read-only data encapsulation workflows:

```ts
const builder = new MasonryBuilder(config);
builder.prepare(contentData);
// ❌ ANTI-PATTERN: This will not impact internal application state
builder.items.push({ image: "corrupted-payload.png" });
// EXTERNAL STATE OVERRIDES (Safe Data Re-assignment)// When fetching clean content asynchronously from an external API, feed it directly into the setter:
builder.items = freshlyFetchedPayloadFromAPI; // Automatically cleans, sanitizes, and freezes internal objects
```

---

## Styling Requirements (Crucial Notice)

⚠️ Developer Warning: The TypeScript architecture only generates layout nodes and toggles state flags (active, hidden, fade-in). If your CSS stylesheet structure is incorrect or missing, the layout, animations, and lightbox modal will break completely.

Ensure your global or modular CSS structure implements the following nested CSS styling structure:

```css
/* /_ Core Structural Layout Rules _/ */
.masonry {
  & .grid {
    column-count: var(--init-columns, 3);
    column-gap: 1.5rem;
    padding: 1rem 0;
  }

  & .item {
    break-inside: avoid;
    margin-bottom: 1.5rem;
    display: flex;
    flex-direction: column;
    background: rgba(255, 255, 255, 0.03);
    padding: 1rem;
    box-sizing: border-box;
    transform: translate3d(0, 0, 0); /* /_ Hardware GPU Acceleration _/ */
    backface-visibility: hidden;
    transition: transform 0.3s ease;

    &:hover {
      transform: scale(1.02);
    }

    & img {
      width: 100%;
      display: block;
      cursor: pointer;
    }

    &.fade-in {
      opacity: 0;
      transform: translateY(20px);
      animation: masonryFadeIn 0.4s ease forwards;
    }
  }

  /* /_ Dynamic Sliding Category Menu Layout Rules _/ */
  & .filter.menu {
    position: relative;
    display: flex;
    gap: 0.75rem;
    margin: 1.5rem auto;
    flex-wrap: wrap;
    width: max-content;
    padding: 5px;
    border: 2px solid #5b3f86;
    border-radius: 12px;
    z-index: 1;
    & .slider {
      position: absolute;
      top: 0;
      left: 0;
      background: #5b3f86;
      border-radius: 6px;
      z-index: -1;
      pointer-events: none;
      transition: transform 0.35s cubic-bezier(0.25, 1, 0.5, 1),
                  width 0.35s cubic-bezier(0.25, 1, 0.5, 1),
                  height 0.35s cubic-bezier(0.25, 1, 0.5, 1);
    }

    & .item {
      padding: 0.5rem 1.25rem;
      background: none;
      border: none;
      color: #fff;
      cursor: pointer;
      z-index: 2;
      transition: color 0.3s ease;

      &.active {
        color: #fff;
        font-weight: 600;
        background: none; /* Handled dynamically by .slider container shifts */
      }
    }

  }

  /* /_ Utility Loaders & Scroll Indicators _/ */
  & .spinner {
    display: block;
    margin: 1.5rem auto;
    width: 40px;
    height: 40px;
    background-image: var(--spinner-content); /_ Injected from global application root variables _/
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
    transition: opacity 0.2s ease, visibility 0.2s ease;

    &.hidden {
      opacity: 0;
      visibility: hidden;
      height: 0;
      margin: 0 auto;
    }

  }

  & .sentinel {
    width: 100%;
    pointer-events: none;
  }
}
  /* /_ Lightbox Modal Structure Rules _/ */
.gallery .modal {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(10, 10, 20, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  opacity: 1;
  visibility: visible;
  transition: opacity 200ms ease, visibility 200ms ease;

  &.hidden {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
  }

  & .img {
    max-width: 90vw;
    max-height: 90vh;
    object-fit: contain;
  }

  & .close,
  & .next,
  & .prev {
    position: absolute;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: none;
    border-radius: 50%;
    width: 3rem; height: 3rem;
    font-size: 1.5rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.3s ease;

    &:hover { background: rgba(255, 255, 255, 0.3); }

  }
  & .close { top: 1.5rem; right: 1.5rem; }
  & .prev { left: 1.5rem; }
  & .next { right: 1.5rem; }
}
@keyframes masonryFadeIn {
  to { opacity: 1; transform: translateY(0); }
}
@media (max-width: 900px) {
  .masonry .grid { column-count: 2; }
}
@media (max-width: 640px) {
  .masonry .grid { column-count: 1; }
}
```

## Component Lifecycle Cleanup

When managing multi-view setups or deleting container spaces dynamically within your SPA, prevent memory leaks by destroying reference scopes explicitly:

// Triggers observer detachment, global keyboard event listener stripping, and DOM removal cleanups
`masonry.destroy();`

---

This documentation outlines everything your team needs to implement the gallery securely and cleanly. Is there any additional platform setup (such as Webpack, Vite, or a specific CSS library template connection) that you would like to include in this guide before sharing it with your team?
