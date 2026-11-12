// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";

import { ModalBuilder, type iModalControls } from "../Modal";

/**
 * A modal renders hidden and is opened through the handles `onReady` delivers — `build()`
 * returns the element, so that callback is the only way in.
 */

function build(config: Record<string, any> = {}): { root: HTMLElement; controls: iModalControls } {
  let controls: iModalControls | null = null;
  const root = new ModalBuilder({
    id: "modal-test",
    title: "Hi",
    destroyOnClose: false,
    onReady: (value) => (controls = value),
    ...config,
  }).create(Object.assign(document.createElement("p"), { textContent: "Isi" })) as HTMLElement;

  return { root, controls: controls as unknown as iModalControls };
}

afterEach(() => {
  document.body.innerHTML = "";
  document.body.style.overflow = "";
});

describe("modal", () => {
  it("renders a hidden overlay with a titled header and the compiled body", () => {
    const { root } = build();

    expect(root.classList.contains("dialog")).toBe(true);
    expect(root.classList.contains("hidden")).toBe(true);
    expect(root.querySelector(".modal .header h2.title")?.textContent).toBe("Hi");
    expect(root.querySelector(".body")?.textContent).toBe("Isi");
    expect(root.querySelector(".header .close")).not.toBeNull();
  });

  it("hands the caller controls through onReady and opens on demand", () => {
    const { root, controls } = build();

    controls.open();

    expect(root.classList.contains("hidden")).toBe(false);
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("hides instead of destroying when destroyOnClose is false", () => {
    const { root, controls } = build();
    document.body.appendChild(root);

    controls.open();
    controls.close();

    expect(root.isConnected).toBe(true);
    expect(root.classList.contains("hidden")).toBe(true);
  });

  it("removes the overlay on unmount", () => {
    const { root, controls } = build();
    document.body.appendChild(root);

    controls.unmount();

    expect(root.isConnected).toBe(false);
  });
});
