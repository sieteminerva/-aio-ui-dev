// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { FooterBuilder } from "../Footer";

/**
 * Footer renders two rows: columns (`useInfo`) and a copyright line (`useCopyright`).
 * Anything absent from a column is not rendered at all — no empty paragraph, no empty list.
 */

function build(payload: any, config: Record<string, any> = {}): HTMLElement {
  return new FooterBuilder(config).create(payload) as HTMLElement;
}

describe("footer", () => {
  it("renders one column per record with header, description and links", () => {
    const root = build({
      columns: [{ title: "Kontak", description: "Hubungi kami", actions: [{ label: "Email", value: "halo@example.com" }] }],
    });

    expect(root.tagName).toBe("FOOTER");
    expect(root.querySelectorAll(".row .column")).toHaveLength(1);
    expect(root.querySelector(".column .header")?.textContent).toBe("Kontak");
    expect(root.querySelector(".column .desc")?.textContent).toBe("Hubungi kami");

    const item = root.querySelector("ul.unstyled-list li.item a") as HTMLAnchorElement;
    expect(item.href).toContain("mailto:halo@example.com");
    expect(item.textContent).toContain("Email");
  });

  it("infers mailto and tel instead of asking the author for a scheme", () => {
    const root = build({ columns: [{ actions: [{ label: "Call", value: "+62 812-3456-789" }] }] });
    const href = (root.querySelector("li.item a") as HTMLAnchorElement).getAttribute("href");

    expect(href).toBe("tel:+628123456789");
  });

  it("keeps an unaddressable value visible but inert", () => {
    const root = build({ columns: [{ actions: [{ label: "Alamat", value: "Jl. Merdeka 1" }] }] });
    const link = root.querySelector("li.item a") as HTMLAnchorElement;

    expect(link.getAttribute("href")).toBe("#");
    expect(link.textContent).toContain("Jl. Merdeka 1");
  });

  it("wraps the copyright with the current year and the company", () => {
    const root = build({ columns: [], company: "AIO" });
    const copy = root.querySelector(".row.bottom p")?.textContent ?? "";

    expect(copy).toContain(String(new Date().getFullYear()));
    expect(copy).toContain("AIO");
  });

  it("honours useInfo and useCopyright", () => {
    const root = build({ columns: [{ title: "X" }] }, { useInfo: false, useCopyright: false });

    expect(root.querySelector(".column")).toBeNull();
    expect(root.querySelector(".row.bottom")).toBeNull();
  });
});
