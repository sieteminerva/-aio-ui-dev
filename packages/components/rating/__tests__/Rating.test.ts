// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { RatingBuilder } from "../Rating";

/**
 * Rating is headless (no stylesheet) and polymorphic: `config.type` decides which subtree is
 * built. Animation is off in every test so no frame has to run for the assertion to hold.
 */

function build(type: string, value: any, max = 5): HTMLElement {
  return new RatingBuilder({ type: type as any, max, animate: false }).create(value) as HTMLElement;
}

describe("rating", () => {
  it("renders max stars and marks each one full, half or empty", () => {
    const root = build("star", 4);
    const stars = root.querySelectorAll(".stars-row .star-icon");

    // Regression: the root class list used to repeat `rating-widget-wrapper`.
    expect(root.className).toBe("rating-widget-wrapper type-star");
    expect(stars).toHaveLength(5);
    expect(root.querySelectorAll(".star-icon.star-full")).toHaveLength(4);
    expect(root.querySelectorAll(".star-icon.star-empty")).toHaveLength(1);
    expect(root.querySelector(".rating-numerical-label")?.textContent).toBe("4 / 5");
  });

  it("renders a track and fill for the bar types and labels the percentage", () => {
    const root = build("line-bar", 4);

    expect(root.querySelector(".bar-track .bar-fill")).not.toBeNull();
    expect((root.querySelector(".bar-fill") as HTMLElement).style.width).toBe("80%");
    expect(root.querySelector(".rating-numerical-label")?.textContent).toBe("80%");
  });

  it("accepts a { value } record as well as a bare number", () => {
    const root = build("count-up", { value: 3 });

    expect(root.querySelector(".rating-numerical-label")?.textContent).toBe("60%");
    expect(root.querySelector(".stars-row")).toBeNull();
  });

  it("treats a missing value as zero instead of throwing", () => {
    const root = build("star", {});

    expect(root.querySelectorAll(".star-icon.star-full")).toHaveLength(0);
    expect(root.querySelector(".rating-numerical-label")?.textContent).toBe("0 / 5");
  });
});
