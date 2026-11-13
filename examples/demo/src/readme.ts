/**
 * Package READMEs as data.
 *
 * Every `packages/**\/README.md` is imported as text at build time and split on `##` headings, so
 * the demo renders the documentation a consumer actually reads instead of a hand-written copy.
 * The splitter is pure (string in, structure out) and fence-aware: a README may print a `## heading`
 * as *example source*, and that must not become a section.
 *
 * `PLUGIN_PACKAGES` marks the packages whose markup is hand-built (`kind: plugin` in the conventions
 * doc). They keep the component section names and add `## Methods`, so both kinds parse the same way.
 */

import accordionReadme from "../../../packages/components/accordion/README.md?raw";
import articleReadme from "../../../packages/components/article/README.md?raw";
import badgeReadme from "../../../packages/components/badge/README.md?raw";
import carouselReadme from "../../../packages/components/carousel/README.md?raw";
import codeBlockReadme from "../../../packages/components/code-block/README.md?raw";
import fabmenuReadme from "../../../packages/components/fabmenu/README.md?raw";
import footerReadme from "../../../packages/components/footer/README.md?raw";
import formReadme from "../../../packages/components/form/README.md?raw";
import idAddressReadme from "../../../packages/components/id-address/README.md?raw";
import inputReadme from "../../../packages/components/input/README.md?raw";
import markdownReadme from "../../../packages/components/markdown/README.md?raw";
import masonryReadme from "../../../packages/components/masonry/README.md?raw";
import menuReadme from "../../../packages/components/menu/README.md?raw";
import messageReadme from "../../../packages/components/message/README.md?raw";
import modalReadme from "../../../packages/components/modal/README.md?raw";
import modeswitcherReadme from "../../../packages/components/modeswitcher/README.md?raw";
import pricingcardReadme from "../../../packages/components/pricingcard/README.md?raw";
import productReadme from "../../../packages/components/product/README.md?raw";
import ratingReadme from "../../../packages/components/rating/README.md?raw";
import sectionReadme from "../../../packages/components/section/README.md?raw";
import skeletonReadme from "../../../packages/components/skeleton/README.md?raw";
import tabReadme from "../../../packages/components/tab/README.md?raw";
import tableReadme from "../../../packages/components/table/README.md?raw";

/** The five headings every package README must carry, in this order. */
export const README_REQUIRED = ["Payload", "Config", "Nodes", "Tokens", "Wiring checklist"] as const;

/** The only other H2s a README may carry (see `COMPONENT-CONVENTIONS.md` §1c). */
export const README_OPTIONAL = ["Supported syntax", "Methods", "Appendix"] as const;

/** Packages whose markup is hand-built rather than produced by a `Builder`. */
export const PLUGIN_PACKAGES = ["id-address"] as const;

const README_TEXT: Record<string, string> = {
  accordion: accordionReadme,
  article: articleReadme,
  badge: badgeReadme,
  carousel: carouselReadme,
  "code-block": codeBlockReadme,
  fabmenu: fabmenuReadme,
  footer: footerReadme,
  form: formReadme,
  "id-address": idAddressReadme,
  input: inputReadme,
  markdown: markdownReadme,
  masonry: masonryReadme,
  menu: menuReadme,
  message: messageReadme,
  modal: modalReadme,
  modeswitcher: modeswitcherReadme,
  pricingcard: pricingcardReadme,
  product: productReadme,
  rating: ratingReadme,
  section: sectionReadme,
  skeleton: skeletonReadme,
  tab: tabReadme,
  table: tableReadme,
};

export interface iReadmeSection {
  /** Heading text with the `##` marker and surrounding space removed. */
  heading: string;
  /** Everything under the heading, up to the next H2. Empty string is valid. */
  body: string;
}

export interface iReadmeDoc {
  /** The H1 text, package id included: `Accordion (\`@aio-ui/accordion\`)`. */
  title: string;
  /** Text between the H1 and the first H2 — the purpose paragraph. */
  lead: string;
  /** H2 sections in document order. */
  sections: iReadmeSection[];
  /** The whole file, for the "render everything" fallback. */
  text: string;
}

/** `true` while inside a ``` fence, flipped by the fence lines themselves. */
function isFence(line: string): boolean {
  return /^\s*(```|~~~)/.test(line);
}

/**
 * Split a README into lead + H2 sections.
 *
 * Fence-aware on purpose: `markdown/README.md` and `code-block/README.md` print headings as
 * example source, and splitting on those would cut a section in half.
 */
export function parseReadme(text: string): iReadmeDoc {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const collected: { heading: string; lines: string[] }[] = [];
  const lead: string[] = [];

  let title = "";
  let current: { heading: string; lines: string[] } | null = null;
  let inFence = false;

  for (const line of lines) {
    if (isFence(line)) {
      inFence = !inFence;
      (current ? current.lines : lead).push(line);
      continue;
    }

    if (!inFence) {
      if (!title && /^#\s+/.test(line)) {
        title = line.replace(/^#\s+/, "").trim();
        continue;
      }
      if (/^##\s+/.test(line)) {
        current = { heading: line.replace(/^##\s+/, "").trim(), lines: [] };
        collected.push(current);
        continue;
      }
    }

    (current ? current.lines : lead).push(line);
  }

  return {
    title,
    lead: lead.join("\n").trim(),
    sections: collected.map((section) => ({ heading: section.heading, body: section.lines.join("\n").trim() })),
    text,
  };
}

/** The section named `heading` (case-insensitive), or `null` when the README has no such H2. */
export function sectionOf(doc: iReadmeDoc, heading: string): iReadmeSection | null {
  const wanted = heading.trim().toLowerCase();
  return doc.sections.find((section) => section.heading.toLowerCase() === wanted) ?? null;
}

/** The README for a package id (`@aio-ui/accordion`) or a bare folder name (`accordion`). */
export function readmeFor(pkg: string): iReadmeDoc | null {
  const folder = pkg.trim().replace(/^@aio-ui\//, "");
  const text = README_TEXT[folder];
  return text === undefined ? null : parseReadme(text);
}

/** Section headings this README is missing from `README_REQUIRED`, in skeleton order. */
export function missingSections(doc: iReadmeDoc): string[] {
  return README_REQUIRED.filter((heading) => !sectionOf(doc, heading));
}
