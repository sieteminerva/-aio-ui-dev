// @vitest-environment happy-dom
/**
 * Mockup contract — the census of `Builder.loading()`.
 *
 * The skeleton package owns the primitive, so it also owns the rule: *a mockup is a picture
 * of the box, drawn with `Skeleton.create`, and nothing else*. This file keeps that rule
 * true across the component band in one place instead of scattering a near-identical case
 * into twenty test files.
 *
 * Two lists, both deliberate:
 *
 * - `MOCKUPS` — every builder that opts into the hook. Each must return a skeleton subtree:
 *   no text, no listener, at least a root and one shape.
 * - `OVERLAYS` — the builders that must *not* opt in. Their placement (fixed, off-canvas,
 *   viewport-anchored) is owned by the very sheet that is still missing, so a mockup in the
 *   document flow would be a lie; they keep the generic shimmer skin.
 *
 * Importing sibling packages from here is fine: `__tests__` is outside the build graph and
 * outside `scripts/bounds.mjs`.
 */
import { describe, expect, it } from "vitest";

import { AccordionBuilder } from "@aio-ui/accordion";
import { ArticleBuilder } from "@aio-ui/article";
import { BadgeBuilder } from "@aio-ui/badge";
import { CarouselBuilder } from "@aio-ui/carousel";
import { CodeBlockBuilder } from "@aio-ui/code-block";
import { FabMenuBuilder } from "@aio-ui/fabmenu";
import { FooterBuilder } from "@aio-ui/footer";
import { FormBuilder } from "@aio-ui/form";
import { InputBuilder } from "@aio-ui/input";
import { MarkdownBuilder } from "@aio-ui/markdown";
import { MasonryBuilder } from "@aio-ui/masonry";
import { MenuBuilder } from "@aio-ui/menu";
import { MessageBuilder } from "@aio-ui/message";
import { ModalBuilder } from "@aio-ui/modal";
import { ModeSwitcherBuilder } from "@aio-ui/modeswitcher";
import { PricingCardBuilder } from "@aio-ui/pricingcard";
import { ProductCardBuilder, ProductDetailBuilder, ProductGridBuilder } from "@aio-ui/product";
import { RatingBuilder } from "@aio-ui/rating";
import { SectionBuilder } from "@aio-ui/section";
import { TabBuilder } from "@aio-ui/tab";
import { TableBuilder } from "@aio-ui/table";

/** A builder that opted in. `loading()` is protected, hence the structural cast below. */
interface iLoadingBuilder {
  loading?: () => HTMLElement | null | undefined;
}

const MOCKUPS: [name: string, make: () => unknown][] = [
  ["accordion", () => new AccordionBuilder()],
  ["article", () => new ArticleBuilder()],
  ["badge", () => new BadgeBuilder()],
  ["carousel", () => new CarouselBuilder()],
  ["code-block", () => new CodeBlockBuilder()],
  ["footer", () => new FooterBuilder()],
  ["form", () => new FormBuilder()],
  ["input", () => new InputBuilder()],
  ["markdown", () => new MarkdownBuilder()],
  ["masonry", () => new MasonryBuilder()],
  ["menu", () => new MenuBuilder()],
  ["mode-switcher", () => new ModeSwitcherBuilder()],
  ["pricing-card", () => new PricingCardBuilder()],
  ["product-card", () => new ProductCardBuilder()],
  ["product-card-grid", () => new ProductGridBuilder()],
  ["product-detail", () => new ProductDetailBuilder()],
  ["rating", () => new RatingBuilder()],
  ["section", () => new SectionBuilder()],
  ["tab", () => new TabBuilder()],
  ["table", () => new TableBuilder()],
];

const OVERLAYS: [name: string, make: () => unknown][] = [
  ["fab-menu", () => new FabMenuBuilder()],
  ["message", () => new MessageBuilder()],
  ["modal", () => new ModalBuilder()],
];

describe("loading() mockups", () => {
  it.each(MOCKUPS)("%s draws a skeleton silhouette", (_name, make) => {
    const builder = make() as iLoadingBuilder;

    expect(typeof builder.loading).toBe("function");

    const mockup = builder.loading!();
    expect(mockup).toBeInstanceOf(HTMLElement);

    // The root itself is a `data-skeleton` node, and a mockup needs at least one shape.
    expect(mockup!.getAttribute("data-skeleton")).toBeTruthy();
    expect(mockup!.querySelectorAll("[data-skeleton]").length).toBeGreaterThanOrEqual(2);

    // A picture, not a render: no payload text, no ids, no handlers.
    expect(mockup!.textContent).toBe("");
    expect(mockup!.id).toBe("");
    expect(mockup!.querySelectorAll("button, a, input, img").length).toBe(0);
  });
});

describe("overlays stay on the shimmer", () => {
  it.each(OVERLAYS)("%s has no mockup", (_name, make) => {
    const builder = make() as iLoadingBuilder;
    expect(builder.loading).toBeUndefined();
  });
});
