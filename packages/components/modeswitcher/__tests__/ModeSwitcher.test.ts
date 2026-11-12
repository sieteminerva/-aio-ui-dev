// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";

import { ModeSwitcherBuilder } from "../ModeSwitcher";

/**
 * The switcher reads the document's current mode on construction and writes it back on click.
 * Each test starts from "no mode", so the initial label is deterministic.
 */

function build(): HTMLElement {
  return new ModeSwitcherBuilder().create({}) as HTMLElement;
}

beforeEach(() => {
  delete document.documentElement.dataset.mode;
});

describe("mode switcher", () => {
  it("renders the toggle, track, thumb and a label describing the next mode", () => {
    const root = build();

    expect(root.classList.contains("mode-switcher")).toBe(true);
    expect(root.querySelector(".toggle .track .thumb")).not.toBeNull();
    // Light mode means "click to go dark".
    expect(root.querySelector(".toggle .label")?.textContent).toBe("Dark");
  });

  it("switches the document mode and its own state on click", () => {
    const root = build();
    const toggle = root.querySelector(".toggle") as HTMLElement;

    toggle.click();

    expect(document.documentElement.dataset.mode).toBe("dark");
    expect(toggle.classList.contains("is-dark")).toBe(true);
    expect(root.querySelector(".label")?.textContent).toBe("Light");
  });

  it("starts in dark when the document already is", () => {
    document.documentElement.dataset.mode = "dark";

    const root = build();

    expect(root.querySelector(".toggle")?.classList.contains("is-dark")).toBe(true);
    expect(root.querySelector(".label")?.textContent).toBe("Light");
  });
});
