// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { PricingCardBuilder } from "../PricingCard";

/**
 * PricingCard is a card group: the root is a row, each record becomes a column wrapping one
 * card. Everything is payload-driven — the builder takes no config options.
 */

function build(data: any): HTMLElement {
  return new PricingCardBuilder().create(data) as HTMLElement;
}

describe("pricing card", () => {
  it("renders one card per record", () => {
    const root = build([{ header: "Basic" }, { header: "Pro" }]);
    const cards = root.querySelectorAll(".row > .column > .card.pricing");

    expect(cards).toHaveLength(2);
    expect(cards[0].querySelector(".header span")?.textContent).toBe("Basic");
  });

  it("renders the feature list and formats the price as IDR", () => {
    const root = build([{ header: "Basic", price: 250000, body: [{ title: "Satu" }, { title: "Dua" }] }]);

    expect(root.querySelectorAll(".features li.item")).toHaveLength(2);
    const price = root.querySelector(".price-tag")?.textContent ?? "";
    expect(price).toContain("Rp");
    expect(price).toContain("250.000");
  });

  it("accepts title/content as aliases for header/body", () => {
    const root = build([{ title: "Alias", content: [{ title: "Fitur" }] }]);

    expect(root.querySelector(".header span")?.textContent).toBe("Alias");
    expect(root.querySelector(".features li.item")?.textContent).toBe("Fitur");
  });

  it("gives the action a primary accent only for an is-featured record", () => {
    const featured = build([{ header: "A", price: 1000, className: "is-featured" }]);
    const plain = build([{ header: "B", price: 2000 }]);

    const button = featured.querySelector(".actions button");
    expect(button?.classList.contains("primary")).toBe(true);
    expect(button?.textContent).toBe("Pilih");
    // Regression: the action node used to be fed the record's `className`, so a record with a
    // price but no className rendered an empty `.actions` box.
    expect(plain.querySelector(".actions button")?.classList.contains("primary")).toBe(false);
  });

  it("gives every card in a group its own action button", () => {
    const root = build([
      { header: "A", price: 1000 },
      { header: "B", price: 2000 },
    ]);
    const cards = root.querySelectorAll(".card.pricing");

    expect(cards).toHaveLength(2);
    expect(cards[0].querySelector(".actions button")).not.toBeNull();
    expect(cards[1].querySelector(".actions button")).not.toBeNull();
    expect(cards[0].querySelector(".actions button")).not.toBe(cards[1].querySelector(".actions button"));
  });

  it("accepts a featured flag and a click handler on a record", () => {
    let clicked = 0;
    const root = build([{ header: "A", price: 1000, featured: true, onClick: () => clicked++ }]);
    const button = root.querySelector(".actions button") as HTMLButtonElement;

    expect(button.classList.contains("primary")).toBe(true);
    button.click();
    expect(clicked).toBe(1);
  });

  it("honours an action label instead of ignoring it", () => {
    const root = build([{ header: "A", price: 1000, action: { label: "Ambil" } }]);

    expect(root.querySelector(".actions button")?.textContent).toBe("Ambil");
  });

  it("treats price 0 as a price rather than an absent one", () => {
    const root = build([{ header: "Free", price: 0 }]);

    expect(root.querySelector(".price-tag")?.textContent).toContain("Rp");
    expect(root.querySelector(".actions button")).not.toBeNull();
  });

  it("renders no price, divider-bottom or action without a price", () => {
    const root = build([{ header: "Gratis" }]);

    expect(root.querySelector(".price-tag")).toBeNull();
    expect(root.querySelector(".actions")).toBeNull();
    expect(root.querySelectorAll(".divider")).toHaveLength(1);
  });
});
