// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";

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

  it("stops its autoplay interval when destroyed", () => {
    // Regression: `destroy()` used to be inherited from Base, which unhooks the DOM only —
    // the interval outlived it and kept calling next() on a detached tree.
    vi.useFakeTimers();
    try {
      const start = vi.spyOn(window, "setInterval");
      const stop = vi.spyOn(window, "clearInterval");

      const builder = new CarouselBuilder({ autoPlay: 1000 });
      const root = builder.create(slides) as HTMLElement;
      const track = root.querySelector(".track") as HTMLElement;

      expect(start).toHaveBeenCalledTimes(1);
      const intervalId = start.mock.results[0].value;

      builder.destroy();

      expect(stop).toHaveBeenCalledWith(intervalId);

      // Behaviour, not just the call: one more autoplay window leaves the track alone.
      const transform = track.style.transform;
      vi.advanceTimersByTime(5000);
      expect(track.style.transform).toBe(transform);
    } finally {
      vi.useRealTimers();
      vi.restoreAllMocks();
    }
  });
});

afterEach(() => {
  vi.useRealTimers();
});
