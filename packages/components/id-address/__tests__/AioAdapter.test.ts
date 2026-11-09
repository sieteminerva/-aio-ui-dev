// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IdAddressAdapterAio } from "../id-address-adapter.aio";

/**
 * The `aio` adapter exists because the picker must drive *this framework's* markup, not
 * the platform's: a select's prompt is an `option.placeholder` (that is what `input.css`
 * styles), a custom dropdown carries its answer in a hidden input and its rows in either a
 * `<datalist>` or `.menu > .item`, and a component listens for `change` rather than for a
 * private callback.
 *
 * Each case below is a place where `native` would quietly do the wrong thing.
 */

/** A field the way `InputBuilder` renders it: label + control + a `.field` state host. */
function field(markup: string): HTMLElement {
  const holder = document.createElement("div");
  holder.className = "field";
  holder.innerHTML = markup;
  document.body.appendChild(holder);
  return holder;
}

beforeEach(() => {
  document.body.replaceChildren();
});

describe("aio adapter — select flavour", () => {
  it("uses a real option.placeholder as the prompt, not a renamed first option", () => {
    const holder = field(`<select id="prov" data-level="propinsi"><option value="99">Bekas</option></select>`);
    const select = holder.querySelector("select") as HTMLSelectElement;

    IdAddressAdapterAio.setOptions(select, {
      options: [{ propinsi_id: 12, propinsi_name: "JAWA BARAT" }, { propinsi_id: 31, propinsi_name: "DKI" }],
      state: "complete",
    });

    const prompt = select.querySelector("option.placeholder");
    expect(prompt).not.toBeNull();
    expect((prompt as HTMLOptionElement).value).toBe("");
    expect(select.value).toBe("");
    expect(select.options).toHaveLength(3);
    expect(select.options[1].textContent).toBe("JAWA BARAT");
    // The stale row from before the load is gone.
    expect(select.querySelector('option[value="99"]')).toBeNull();
  });

  it("marks the answer with [selected] and reports it through a change event", () => {
    const holder = field(`<select data-level="kota"><option class="placeholder" value=""></option></select>`);
    const select = holder.querySelector("select") as HTMLSelectElement;
    IdAddressAdapterAio.setOptions(select, { options: [{ kota_id: 161, kota_name: "BANDUNG" }] });

    const seen = vi.fn();
    select.addEventListener("change", seen);

    IdAddressAdapterAio.setSelectedOption(select, "161");

    expect(select.value).toBe("161");
    expect(select.selectedOptions[0].getAttribute("selected")).toBe("");
    // `select:has(option[selected])` in input.css keys off the attribute, not the property.
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it("clears back to the prompt and announces it", () => {
    const holder = field(`<select data-level="provinsi"><option class="placeholder" value=""></option><option value="12">JAWA BARAT</option></select>`);
    const select = holder.querySelector("select") as HTMLSelectElement;
    select.value = "12";

    IdAddressAdapterAio.clear(select);

    expect(select.value).toBe("");
    expect(select.options).toHaveLength(1);
    expect(select.querySelectorAll("option.placeholder")).toHaveLength(1);
  });

  it("does not answer its own announcement", () => {
    // The element that announces an answer is the one `onLevelChange` listens to, so an
    // unguarded dispatch recursed: write → change → "level changed" → load → write …
    const holder = field(`<select data-level="kota"><option class="placeholder" value=""></option></select>`);
    const select = holder.querySelector("select") as HTMLSelectElement;

    const levelChanged = vi.fn();
    IdAddressAdapterAio.setOptions(select, {
      options: [{ kota_id: 161, kota_name: "BANDUNG" }],
      onLevelChange: levelChanged,
    });
    IdAddressAdapterAio.onLevelChange?.(select);

    // Outward: the page still hears the answer.
    const pageSaw = vi.fn();
    select.addEventListener("change", pageSaw);
    IdAddressAdapterAio.setSelectedOption(select, "161");
    expect(pageSaw).toHaveBeenCalledTimes(1);

    // Inward: the picker must not treat its own write as the visitor picking a level.
    expect(levelChanged).not.toHaveBeenCalled();

    // A real change still reports it.
    select.value = "";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    expect(levelChanged).toHaveBeenCalledTimes(1);
  });
});

describe("aio adapter — dropdown flavours", () => {
  it("fills a datalist and keeps the id in the hidden carrier", () => {
    const holder = field(`
      <div class="dropdown" data-style="datalist">
        <div class="tags"></div>
        <input class="dropdown" type="text" list="dl-1" data-level="kota" />
        <input type="hidden" data-level="kota" name="kota" />
        <datalist id="dl-1"></datalist>
      </div>`);
    const box = holder.querySelector(".dropdown") as HTMLElement;
    const visible = box.querySelector<HTMLInputElement>("input.dropdown")!;
    const hidden = box.querySelector<HTMLInputElement>("input[type='hidden']")!;

    IdAddressAdapterAio.setOptions(hidden, { options: [{ kota_id: 161, kota_name: "BANDUNG" }] });
    const datalist = box.querySelector("datalist")!;
    expect(datalist.querySelectorAll("option")).toHaveLength(1);
    expect(datalist.querySelector("option")?.dataset.id).toBe("161");

    IdAddressAdapterAio.setSelectedOption(hidden, "161");
    expect(visible.value).toBe("BANDUNG");
    expect(hidden.value).toBe("161");
    expect(IdAddressAdapterAio.getValue?.(hidden)).toBe("161");
  });

  it("fills the menu of a style=select dropdown, which native ignores", () => {
    const holder = field(`
      <div class="dropdown" data-style="select">
        <input class="dropdown" type="text" data-level="kecamatan" />
        <input type="hidden" data-level="kecamatan" name="kecamatan" />
        <div class="menu"></div>
      </div>`);
    const box = holder.querySelector(".dropdown") as HTMLElement;
    const hidden = box.querySelector<HTMLInputElement>("input[type='hidden']")!;
    const menu = box.querySelector(".menu") as HTMLElement;

    IdAddressAdapterAio.setOptions(hidden, {
      options: [{ kecamatan_id: 1, kecamatan_name: "COBLONG" }, { kecamatan_id: 2, kecamatan_name: "SUKAJADI" }],
    });

    expect(menu.querySelectorAll(".item")).toHaveLength(2);
    expect(menu.querySelector(".item")?.getAttribute("data-id")).toBe("1");

    IdAddressAdapterAio.setSelectedOption(hidden, "2");
    expect(menu.querySelector(".item.selected")?.textContent).toBe("SUKAJADI");
    expect(hidden.value).toBe("2");
    expect(box.querySelector<HTMLInputElement>("input.dropdown")?.value).toBe("SUKAJADI");
  });

  it("draws the loading spinner once: the box owns it for a dropdown", () => {
    // `input.css` paints `.field.loading::after` *and* `.dropdown[data-style].loading::after`;
    // setting both put two spinners on the same spot.
    const holder = field(`
      <div class="dropdown" data-style="datalist">
        <input type="text" list="dl-2" data-level="kodepos" />
        <input type="hidden" data-level="kodepos" />
        <datalist id="dl-2"></datalist>
      </div>`);
    const box = holder.querySelector(".dropdown") as HTMLElement;
    const hidden = holder.querySelector<HTMLInputElement>("input[type='hidden']")!;

    IdAddressAdapterAio.setOptions(hidden, { options: [], state: "start" });
    expect(box.classList.contains("loading")).toBe(true);
    expect(holder.classList.contains("loading")).toBe(false);

    IdAddressAdapterAio.setOptions(hidden, { options: [], state: "complete" });
    expect(box.classList.contains("loading")).toBe(false);
    expect(holder.classList.contains("loading")).toBe(false);

    IdAddressAdapterAio.onError?.(hidden, "boom");
    expect(holder.classList.contains("error")).toBe(true);
    expect(box.classList.contains("error")).toBe(true);

    IdAddressAdapterAio.clear(hidden);
    expect(holder.classList.contains("error")).toBe(false);
  });

  it("writes the single row into a plain input — the postal code has no list", () => {
    const holder = field(`<input type="text" data-level="kodepos" placeholder="kodepos" />`);
    const input = holder.querySelector("input") as HTMLInputElement;

    IdAddressAdapterAio.setOptions(input, { options: [], state: "start" });
    expect(input.value).toBe("");

    IdAddressAdapterAio.setOptions(input, {
      options: [{ kodepos_id: 40123, kodepos_name: "40123" }],
      state: "complete",
    });

    // Without a datalist and without a menu, the row *is* the value.
    expect(input.value).toBe("40123");
    expect(IdAddressAdapterAio.getValue?.(input)).toBe("40123");
  });

  it("draws the loading spinner once: a select owns it itself", () => {
    const holder = field(`<select data-level="kota"><option class="placeholder" value=""></option></select>`);
    const select = holder.querySelector("select") as HTMLSelectElement;

    IdAddressAdapterAio.setOptions(select, { options: [], state: "start" });

    // A select's spinner is its picker icon (`select:is(.loading)::picker-icon`); the
    // field-level one would be the second.
    expect(select.classList.contains("loading")).toBe(true);
    expect(holder.classList.contains("loading")).toBe(false);
  });
});
