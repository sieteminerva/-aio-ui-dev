// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { ProductBuilder } from "../ProductBuilder";

describe("ProductBuilder declarative contract and view swap (P8)", () => {
  const sampleProducts = [
    { uid: "p1", title: "Shoes", price: 100000 },
    { uid: "p2", title: "Shirt", price: 50000 },
  ];

  it("renders grid view by default and swaps to detail and back internally", () => {
    const cartSpy = vi.fn();

    const builder = new ProductBuilder({
      onAddToCart: cartSpy,
    });

    const root = builder.create({ items: sampleProducts });
    expect(root).toBeTruthy();
    expect(root.querySelector(".grid") || root.querySelector(".row")).not.toBeNull();

    // Trigger open on card
    const cardEl = root.querySelector('[data-uid="p1"], .product') as HTMLElement;
    expect(cardEl).not.toBeNull();
    cardEl.click();

    // Detail view should now be displayed
    expect(root.querySelector(".product-detail")).not.toBeNull();
    expect(root.querySelector(".grid")).toBeNull();

    // Click back button in detail
    const backBtn = root.querySelector("button.product-detail-back, button.back") as HTMLElement;
    expect(backBtn).not.toBeNull();
    backBtn.click();

    // Grid view restored
    expect(root.querySelector(".grid") || root.querySelector(".row")).not.toBeNull();
    expect(root.querySelector(".product-detail")).toBeNull();
  });

  it("renders detail view directly when configured with view: detail", () => {
    const builder = new ProductBuilder({
      view: "detail",
    });

    const root = builder.create({ items: sampleProducts, record: sampleProducts[0] });
    expect(root.querySelector(".product-detail")).not.toBeNull();
  });
});
