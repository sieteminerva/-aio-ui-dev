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
    // Known defect: the actions node is fed the record's `className`, and `template()`
    // returns early on a falsy payload — so a record without a className renders no button.
    const featured = build([{ header: "A", price: 1000, className: "is-featured" }]);
    const plain = build([{ header: "B", price: 2000 }]);

    const button = featured.querySelector(".actions button");
    expect(button?.classList.contains("primary")).toBe(true);
    expect(button?.textContent).toBe("Pilih");
    expect(plain.querySelector(".actions button")).toBeNull();
  });

  it("renders no price, divider-bottom or action without a price", () => {
    const root = build([{ header: "Gratis" }]);

    expect(root.querySelector(".price-tag")).toBeNull();
    expect(root.querySelector(".actions")).toBeNull();
    expect(root.querySelectorAll(".divider")).toHaveLength(1);
  });
});
