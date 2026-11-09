// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import type { iMessageContent } from "@aio-ui/message";
import type { iCalculationLineItem } from "@aio-ui/input/CalculationTypes";
import { FormCalculationHandler } from "../adapters/Calculation";

/**
 * Builds a handler over a form whose single formula may be switched between
 * broken and working, so the test can prove the dedupe key reacts to recovery.
 */
function harness() {
  const form = document.createElement("form");
  form.id = "cart";
  document.body.appendChild(form);

  let broken = true;
  const formula = () => {
    if (broken) throw new Error("boom");
    return { id: "line-1", quantity: 1, unitPrice: 10, total: 10 } as iCalculationLineItem;
  };

  const notify = vi.fn<(content: iMessageContent) => void>();
  const handler = new FormCalculationHandler(form, {
    strategies: { formula: [{ id: "line-total", formula }] },
    notify,
  });

  return {
    handler,
    notify,
    repair: () => { broken = false; },
    breakAgain: () => { broken = true; },
  };
}

describe("calculation failure messages", () => {
  it("announces a broken formula once, not once per keystroke", () => {
    const { handler, notify } = harness();

    handler.create();
    handler.recalculate();
    handler.recalculate();
    handler.recalculate();

    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0].message).toContain("line-total");
  });

  it("stays quiet after recovery and speaks again when the same formula breaks", () => {
    const { handler, notify, repair, breakAgain } = harness();
    handler.create();
    expect(notify).toHaveBeenCalledTimes(1);

    repair();
    handler.recalculate();
    expect(notify).toHaveBeenCalledTimes(1);

    breakAgain();
    handler.recalculate();
    expect(notify).toHaveBeenCalledTimes(2);
  });

  it("uses the configured sentence when the host provides one", () => {
    const form = document.createElement("form");
    form.id = "cart";
    const notify = vi.fn<(content: iMessageContent) => void>();
    const handler = new FormCalculationHandler(form, {
      strategies: { formula: [{ id: "line-total", formula: () => { throw new Error("boom"); } }] },
      messages: { calculation: { failed: "Rumus {formula} rusak." } },
      notify,
    });

    handler.recalculate();

    expect(notify.mock.calls[0][0].message).toBe("Rumus line-total rusak.");
  });
});
