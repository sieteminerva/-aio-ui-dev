import { describe, expect, it } from "vitest";
import type { iFormMessageCompose } from "../FormMessages";
import { composeMessage, DEFAULT_FORM_MESSAGES, messageDraft, resolveStyle } from "../FormMessages";

/** Draft for a single invalid field, the most common case. */
function fieldDraft(overrides: Partial<iFormMessageCompose> = {}): iFormMessageCompose {
  return messageDraft({
    category: "validation",
    slot: "field",
    code: "VALUE_MISSING",
    formId: "profile",
    fallback: "Please fill out this field.",
    field: { id: "name", name: "name", label: "Nama", type: "text" },
    ...overrides,
  });
}

describe("composeMessage", () => {
  it("keeps the legacy sentence when nothing is configured", () => {
    // The old hard-coded string was: `"Label" — <browser message>`.
    expect(composeMessage(undefined, fieldDraft())).toBe('"Nama" — Please fill out this field.');
  });

  it("prefers a codes entry over the slot, so one slot can answer many reasons", () => {
    const messages = {
      validation: {
        field: "{label}: {fallback}",
        codes: {
          RANGE_OVERFLOW: "{label} maksimal {max}.",
          VALUE_MISSING: "{label} wajib diisi.",
        },
      },
    };

    expect(composeMessage(messages, fieldDraft())).toBe("Nama wajib diisi.");
    expect(
      composeMessage(messages, fieldDraft({ code: "RANGE_OVERFLOW", params: { max: 10 } })),
    ).toBe("Nama maksimal 10.");
  });

  it("hands the composer the metadata it needs and nothing more", () => {
    const messages = {
      validation: {
        field: ({ field, code, params }: iFormMessageCompose) =>
          `${code}:${field?.name}:${params.max ?? "-"}`,
      },
    };

    expect(
      composeMessage(messages, fieldDraft({ code: "RANGE_OVERFLOW", params: { max: 5 } })),
    ).toBe("RANGE_OVERFLOW:name:5");
  });

  it("collapses unknown tokens instead of leaking them to the interface", () => {
    const messages = { validation: { field: "[{nope}] {label}" } };
    expect(composeMessage(messages, fieldDraft())).toBe("[] Nama");
  });

  it("falls back to the producer text when a group has no entry for the slot", () => {
    expect(composeMessage({}, fieldDraft())).toBe('"Nama" — Please fill out this field.');
  });
});

describe("resolveStyle", () => {
  it("uses the per-slot title for submit, not one title for both outcomes", () => {
    const success = messageDraft({
      category: "submit",
      slot: "success",
      code: "SUBMIT_SUCCESS",
      formId: "profile",
      fallback: "",
    });
    const failure = { ...success, slot: "error", code: "SUBMIT_FAILED" };

    expect(resolveStyle(undefined, success).title).toBe("Operasi Sukses!");
    expect(resolveStyle(undefined, failure).title).toBe("Terjadi Kendala");
  });

  it("lets config override both the base style and the slot override", () => {
    const messages = { cascade: { type: "info", types: { gate: "error" } } };
    const compose = messageDraft({
      category: "cascade",
      slot: "gate",
      code: "GATE_BLOCKED",
      formId: "profile",
      fallback: "",
    });

    // Slot override wins over the group-level value.
    expect(resolveStyle(messages, compose).type).toBe("error");
    // Untouched properties still come from the defaults.
    expect(resolveStyle(messages, compose).icon).toBe(DEFAULT_FORM_MESSAGES.cascade.icon);
  });

  it("exposes the submit toast durations so a host can tune them", () => {
    const compose = messageDraft({
      category: "submit",
      slot: "error",
      code: "SUBMIT_FAILED",
      formId: "profile",
      fallback: "",
    });

    expect(resolveStyle(undefined, compose).duration).toBe(6000);
    expect(resolveStyle({ submit: { duration: 1234 } }, compose).duration).toBe(1234);
  });
});
