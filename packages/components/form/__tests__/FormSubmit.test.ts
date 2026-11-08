// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { FormBuilder } from "../Form";

/**
 * End to end through the builder: the payload a consumer actually receives on
 * `formSubmit`. This is where "checkbox group / radio group / unchecked" either survives
 * the trip or quietly disappears.
 */
const schema = [
  {
    id: "order",
    title: "Order",
    group: [
      { type: "text", id: "name", title: "Nama" },
      { type: "checkbox", id: "agree", title: "Setuju" },
      { type: "radio", id: "pickup", name: "delivery", value: "pickup", title: "Ambil", config: { style: "toggle" } },
      { type: "radio", id: "courier", name: "delivery", value: "courier", title: "Kirim", checked: true, config: { style: "toggle" } },
    ],
  },
];

async function submit(configure: (form: HTMLFormElement) => void): Promise<Record<string, any>> {
  const form = new FormBuilder().create(schema as any) as HTMLFormElement;
  document.body.appendChild(form);

  let payload: Record<string, any> | null = null;
  form.addEventListener("formSubmit", (event: any) => {
    payload = event.detail.data;
  });

  configure(form);
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));

  expect(payload).not.toBeNull();
  form.remove();
  return payload!;
}

describe("formSubmit payload", () => {
  it("carries the typed values", async () => {
    const data = await submit((form) => {
      (form.querySelector("#name") as HTMLInputElement).value = "Budi";
    });

    expect(data.name).toBe("Budi");
  });

  it("reports an unticked checkbox instead of dropping it", async () => {
    const data = await submit(() => undefined);

    expect(data.agree).toBe(false);
  });

  it("reports a ticked checkbox as true", async () => {
    const data = await submit((form) => {
      (form.querySelector("#agree") as HTMLInputElement).checked = true;
    });

    expect(data.agree).toBe(true);
  });

  it("keeps radio group semantics: one value, the checked option", async () => {
    const data = await submit(() => undefined);

    expect(data.delivery).toBe("courier");
  });

  it("follows the visitor when they pick the other option", async () => {
    const data = await submit((form) => {
      (form.querySelector("#pickup") as HTMLInputElement).checked = true;
    });

    expect(data.delivery).toBe("pickup");
  });
});

describe("submit hooks", () => {
  it("calls config.onSubmit with the completed payload", async () => {
    const seen: any[] = [];
    const form = new FormBuilder().create(schema as any, { onSubmit: (data: any) => seen.push(data) } as any) as HTMLFormElement;
    document.body.appendChild(form);

    (form.querySelector("#name") as HTMLInputElement).value = "Budi";
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(seen).toHaveLength(1);
    expect(seen[0].name).toBe("Budi");
    expect(seen[0].delivery).toBe("courier");
    form.remove();
  });

  it("keeps dispatching formSubmit when onSubmit throws", async () => {
    const form = new FormBuilder().create(schema as any, {
      onSubmit: () => { throw new Error("boom"); },
    } as any) as HTMLFormElement;
    document.body.appendChild(form);

    let received = false;
    form.addEventListener("formSubmit", () => { received = true; });

    const consoleError = console.error;
    console.error = () => undefined;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    console.error = consoleError;

    expect(received).toBe(true);
    form.remove();
  });

  it("clears the controls before answering when resetOnSubmit is on", async () => {
    const form = new FormBuilder().create(schema as any, { resetOnSubmit: true } as any) as HTMLFormElement;
    document.body.appendChild(form);

    let nameAtDispatch: string | null = null;
    form.addEventListener("formSubmit", (event: any) => {
      nameAtDispatch = event.detail.data.name;
    });

    (form.querySelector("#name") as HTMLInputElement).value = "Budi";
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(nameAtDispatch).toBe("Budi");                                    // payload captured
    expect((form.querySelector("#name") as HTMLInputElement).value).toBe(""); // controls cleared
    form.remove();
  });
});
