// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { CarouselBuilder } from "../Carousel";

/**
 * Carousel owns a timer, so every test pins the options that keep it inert (`autoPlay: false`).
 *
 * Payload is a bare array of slides; `prepare()` also accepts `{ content: [...] }`.
 */

const slides = [
  { image: "a.png", title: "First", description: "One" },
  { image: "b.png", title: "Second", description: "Two" },
];

function build(data: any): HTMLElement {
  return new CarouselBuilder({ autoPlay: false, showControl: true, showNavigation: true }).create(data) as HTMLElement;
}

describe("carousel", () => {
  it("renders one slide per record with its caption", () => {
    const root = build(slides);

    expect(root.classList.contains("carousel")).toBe(true);
    const rendered = root.querySelectorAll(".slide");
    expect(rendered).toHaveLength(2);
    expect(rendered[0].querySelector(".title")?.textContent).toBe("First");
    expect(rendered[0].querySelector(".desc")?.textContent).toBe("One");
  });

  it("accepts the wrapped { content } shape as well", () => {
    const root = build({ content: slides });

    expect(root.querySelectorAll(".slide")).toHaveLength(2);
  });

  it("renders controls and navigation dots", () => {
    const root = build(slides);

    expect(root.querySelectorAll(".control-group button")).toHaveLength(2);
    expect(root.querySelectorAll(".navigations .dot")).toHaveLength(2);
  });

  it("marks the carousel as auto-controlled when the default options are kept", () => {
    const root = new CarouselBuilder({ autoPlay: false }).create(slides) as HTMLElement;

    expect(root.className).toContain("auto-controls");
    expect(root.className).toContain("anim-fade");
  });

  it("renders an empty shell instead of throwing when the payload has no slides", () => {
    // Regression: the layout modes read `this.track`, which only exists once a track rendered.
    const root = build({});

    expect(root.classList.contains("carousel")).toBe(true);
    expect(root.querySelector(".track")).toBeNull();
    expect(root.querySelectorAll(".slide")).toHaveLength(0);
  });
});
