// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";

import { MessageBuilder } from "../Message";

/**
 * Message prepends itself into a container and closes on a timer. Tests run with `duration: 0`
 * (persist until dismissed) so no timer decides the outcome, and clean `document.body` after each.
 */

function build(payload: any, config: Record<string, any> = {}): HTMLElement {
  return new MessageBuilder({ duration: 0, ...config }).create(payload) as HTMLElement;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("message", () => {
  it("renders a toast with header, body and type class", () => {
    const toast = build({ header: "Berhasil", message: "Pesanan dikirim", type: "success" });

    expect(toast.classList.contains("toast")).toBe(true);
    expect(toast.classList.contains("success")).toBe(true);
    expect(toast.querySelector(".content .header")?.textContent).toBe("Berhasil");
    expect(toast.querySelector(".content .message")?.textContent).toBe("Pesanan dikirim");
    // The icon is a sibling of `.content`, not a child of it.
    expect(toast.querySelector("i.bell")?.className).toContain("icon");
  });

  it("falls back to the default header and type", () => {
    const toast = build({ message: "Halo" });

    expect(toast.querySelector(".content .header")?.textContent).toBe("Congrats!");
    expect(toast.classList.contains("info")).toBe(true);
  });

  it("prepends the toast into the page", () => {
    build({ message: "Satu" });
    build({ message: "Dua" }, { id: "second" });

    const texts = Array.from(document.querySelectorAll(".toast .message")).map((el) => el.textContent);
    expect(texts).toEqual(["Dua", "Satu"]);
  });

  it("replaces an existing toast with the same id instead of stacking", () => {
    build({ message: "Lama" });
    build({ message: "Baru" });

    expect(document.querySelectorAll(".toast")).toHaveLength(1);
    expect(document.querySelector(".toast .message")?.textContent).toBe("Baru");
  });
});
