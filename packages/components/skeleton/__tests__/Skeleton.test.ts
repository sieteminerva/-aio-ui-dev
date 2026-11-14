// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { Skeleton, SkeletonBuilder } from "../Skeleton";

/**
 * The primitive itself. The point of these cases is that a mockup is a *picture*: shapes,
 * sizes and repetition — no lifecycle, no node records, no payload traversal.
 */
describe("Skeleton.create", () => {
  it("draws one bone by default, with the class and the marker that name its shape", () => {
    const bone = Skeleton.create({ height: "2rem" });

    expect(bone.classList.contains("skeleton")).toBe(true);
    expect(bone.classList.contains("bone")).toBe(true);
    expect(bone.getAttribute("data-skeleton")).toBe("bone");
    expect(bone.style.height).toBe("2rem");
  });

  it("composes a stack and repeats a counted node", () => {
    const tree = Skeleton.create({
      shape: "stack",
      children: [{ shape: "line", count: 3 }, { shape: "row", children: [{ shape: "circle" }] }],
    });

    expect(tree.classList.contains("skeleton")).toBe(true);
    expect(tree.classList.contains("stack")).toBe(true);
    expect(tree.querySelectorAll(".skeleton.line")).toHaveLength(3);
    expect(tree.querySelector(".skeleton.row .skeleton.circle")).not.toBeNull();
  });

  it("reserves media space with an aspect ratio instead of a height", () => {
    const bone = Skeleton.create({ aspect: "1 / 1" });

    expect(bone.style.aspectRatio).toBe("1 / 1");
    expect(bone.style.height).toBe("");
  });

  it("keeps the counted children out of the repeat — the count belongs to the node", () => {
    const tree = Skeleton.create({
      shape: "stack",
      children: [{ shape: "row", count: 2, children: [{ shape: "circle" }] }],
    });

    expect(tree.querySelectorAll(".skeleton.row")).toHaveLength(2);
    expect(tree.querySelectorAll(".skeleton.circle")).toHaveLength(2);
  });

  it("writes no lifetime marker for the default `auto`", () => {
    const bone = Skeleton.create({ duration: "auto" });

    expect(bone.hasAttribute("data-skeleton-duration")).toBe(false);
  });

  it("publishes a numeric duration as a floor the hold can read", () => {
    const bone = Skeleton.create({ duration: 600 });

    expect(bone.getAttribute("data-skeleton-duration")).toBe("600");
  });

  it("ignores a duration that could never be a floor", () => {
    expect(Skeleton.create({ duration: 0 }).hasAttribute("data-skeleton-duration")).toBe(false);
    expect(Skeleton.create({ duration: -5 }).hasAttribute("data-skeleton-duration")).toBe(false);
    expect(Skeleton.create({ duration: Number.NaN }).hasAttribute("data-skeleton-duration")).toBe(false);
  });

  it("adds a host class to the mockup root only", () => {
    const tree = Skeleton.create({
      shape: "stack",
      className: "is-brand",
      children: [{ shape: "line" }],
    });

    expect(tree.classList.contains("is-brand")).toBe(true);
    expect(tree.classList.contains("stack")).toBe(true);
    expect(tree.querySelector(".skeleton.line")?.classList.contains("is-brand")).toBe(false);
  });
});

describe("SkeletonBuilder", () => {
  it("draws the spec a manifest configured", () => {
    const builder = new SkeletonBuilder({ spec: { shape: "line", width: "50%" } });

    const element = builder.prepare({});

    expect(element.classList.contains("skeleton")).toBe(true);
    expect(element.classList.contains("line")).toBe(true);
    expect(element.style.width).toBe("50%");
  });

  it("lets the node payload win over the configured spec", () => {
    const builder = new SkeletonBuilder({ spec: { shape: "line", width: "50%" } });

    const element = builder.prepare({ shape: "circle" });

    expect(element.classList.contains("circle")).toBe(true);
  });

  it("carries the configured duration and className onto the mockup", () => {
    const builder = new SkeletonBuilder({ duration: 800, className: "is-brand" });

    const element = builder.prepare({ shape: "line" });

    expect(element.getAttribute("data-skeleton-duration")).toBe("800");
    expect(element.classList.contains("is-brand")).toBe(true);
  });

  it("lets the spec override the configured defaults", () => {
    const builder = new SkeletonBuilder({
      duration: 800,
      spec: { duration: "auto", className: "is-spec" },
    });

    const element = builder.prepare({});

    expect(element.hasAttribute("data-skeleton-duration")).toBe(false);
    expect(element.classList.contains("is-spec")).toBe(true);
  });
});
