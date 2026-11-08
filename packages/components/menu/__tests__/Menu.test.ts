import { describe, expect, it } from "vitest";

import { DEFAULT_MENU_SELECTORS, ELEMENT_KEYS, splitMenuContent } from "../Menu";

/**
 * The menu splits one flat navigation list into brand / links / actions. That rule is
 * convention, not structure, so it is the part most likely to rot — hence the tests.
 */

describe("splitMenuContent", () => {
  const flat = [
    { label: "Brand", href: "#home" },
    { label: "Home", href: "#home" },
    { label: "About", href: "#about" },
    { label: "Hubungi", href: "#form", className: "button" },
  ];

  it("takes the first entry as the brand", () => {
    expect(splitMenuContent({ navigations: flat }).brand.label).toBe("Brand");
  });

  it("keeps plain links as navigations", () => {
    expect(splitMenuContent({ navigations: flat }).navigations.map((l) => l.label)).toEqual(["Home", "About"]);
  });

  it("moves a `button` class or a tel: link into actions", () => {
    expect(splitMenuContent({ navigations: flat }).actions.map((l) => l.label)).toEqual(["Hubungi"]);

    const tel = splitMenuContent({
      navigations: [{ label: "Brand" }, { label: "Home" }, { label: "Call", href: "tel:+62812" }],
    });
    expect(tel.actions.map((l) => l.label)).toEqual(["Call"]);
    expect(tel.navigations.map((l) => l.label)).toEqual(["Home"]);
  });

  it("does not add the CTA twice when it is already listed under actions", () => {
    const cta = { label: "Hubungi", href: "#form", className: "button" };
    const split = splitMenuContent({ navigations: [{ label: "Brand" }, cta], actions: [cta] });
    expect(split.actions).toHaveLength(1);
  });

  it("falls back to a default brand and tolerates missing lists", () => {
    const split = splitMenuContent({});
    expect(split.brand).toEqual({ label: "Brand", href: "#home" });
    expect(split.navigations).toEqual([]);
    expect(split.actions).toEqual([]);
  });

  it("accepts a single object instead of an array", () => {
    const split = splitMenuContent({ navigations: { label: "Solo", href: "#home" } });
    expect(split.brand.label).toBe("Solo");
  });
});

describe("menu contract", () => {
  it("declares a selector for every element key", () => {
    expect(Object.keys(DEFAULT_MENU_SELECTORS).sort()).toEqual([...ELEMENT_KEYS].sort());
  });
});
