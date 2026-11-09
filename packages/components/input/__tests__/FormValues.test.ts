// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { collectFormValues } from "../FormValues";

/**
 * The payload contract, away from the builder: a form element in, a plain object out.
 * Every case here is something `Object.fromEntries(new FormData(form))` got wrong.
 */
function formWith(markup: string): HTMLFormElement {
  const form = document.createElement("form");
  form.innerHTML = markup;
  return form;
}

describe("collectFormValues", () => {
  it("keeps typed values as strings", () => {
    const form = formWith(`
      <input name="name" value="Budi">
      <input name="qty" type="number" value="3">
      <textarea name="notes">navy</textarea>
    `);

    expect(collectFormValues(form)).toEqual({ name: "Budi", qty: "3", notes: "navy" });
  });

  it("reports a lone checkbox as a boolean, ticked or not", () => {
    const form = formWith(`
      <input name="agree" type="checkbox" checked>
      <input name="news" type="checkbox">
    `);

    expect(collectFormValues(form)).toEqual({ agree: true, news: false });
  });

  it("collects every ticked value when checkboxes share a name", () => {
    const form = formWith(`
      <input name="topping" type="checkbox" value="cheese" checked>
      <input name="topping" type="checkbox" value="basil">
      <input name="topping" type="checkbox" value="olive" checked>
    `);

    expect(collectFormValues(form)).toEqual({ topping: ["cheese", "olive"] });
  });

  it("reports the checked option of a radio group and omits the name when none is checked", () => {
    const picked = formWith(`
      <input name="delivery" type="radio" value="pickup">
      <input name="delivery" type="radio" value="courier" checked>
    `);
    const empty = formWith(`<input name="delivery" type="radio" value="pickup">`);

    expect(collectFormValues(picked)).toEqual({ delivery: "courier" });
    expect(collectFormValues(empty)).toEqual({});
  });

  it("keeps every selected option of a multi-select", () => {
    const form = formWith(`
      <select name="size" multiple>
        <option value="S">S</option>
        <option value="M" selected>M</option>
        <option value="L" selected>L</option>
      </select>
    `);

    expect(collectFormValues(form)).toEqual({ size: ["M", "L"] });
  });

  it("keeps a single select as a string", () => {
    const form = formWith(`
      <select name="size">
        <option value="S">S</option>
        <option value="M" selected>M</option>
      </select>
    `);

    expect(collectFormValues(form)).toEqual({ size: "M" });
  });

  it("skips files, buttons and disabled controls, like a real submission", () => {
    const form = formWith(`
      <input name="upload" type="file">
      <input name="secret" value="x" disabled>
      <button name="go" value="1">Go</button>
      <input name="name" value="Budi">
    `);

    expect(collectFormValues(form)).toEqual({ name: "Budi" });
  });

  it("falls back to the id-free value when a control has no name", () => {
    const form = formWith(`<input value="orphan"><input name="name" value="Budi">`);

    expect(collectFormValues(form)).toEqual({ name: "Budi" });
  });

  it("lets the typed value win when a field shares its name with a toggle", () => {
    const form = formWith(`
      <input name="dup" value="typed">
      <input name="dup" type="checkbox" checked>
    `);

    expect(collectFormValues(form)).toEqual({ dup: "typed" });
  });
});

describe("collectFormValues excludeEmpty", () => {
  const markup = `
    <input name="name" value="">
    <input name="qty" value="2">
    <input name="agree" type="checkbox">
    <input name="topping" type="checkbox" value="cheese">
  `;

  it("keeps empty and false values by default", () => {
    expect(collectFormValues(formWith(markup))).toEqual({
      name: "",
      qty: "2",
      agree: false,
      topping: false,
    });
  });

  it("drops them when asked", () => {
    expect(collectFormValues(formWith(markup), { excludeEmpty: true })).toEqual({ qty: "2" });
  });

  it("keeps a ticked checkbox that happens to hold a value", () => {
    const form = formWith(`<input name="topping" type="checkbox" value="cheese" checked>`);

    expect(collectFormValues(form, { excludeEmpty: true })).toEqual({ topping: "cheese" });
  });
});
