import { describe, expect, it } from "vitest";

import {
  INPUT_MODULE_DEFINITION_IDS,
  INPUT_MODULE_DEFINITIONS,
  INPUT_MODULE_IDS,
  INPUT_MODULE_MANIFEST,
} from "../InputRegistry";

/**
 * The input layer declares its adapters twice on purpose: definitions (loaded through a
 * `ModuleLoader`) and manifest refs (resolved lazily by `ComponentRegistry`). A drift
 * between them is invisible at runtime — a manifest that names a module the definitions
 * do not have simply loads a second, unreferenced instance.
 */

describe("input module registry", () => {
  it("declares exactly the adapters the definitions provide", () => {
    const manifestIds = INPUT_MODULE_MANIFEST.map((ref) => ref.id);

    expect(manifestIds).toEqual(INPUT_MODULE_DEFINITION_IDS);
    expect(new Set(manifestIds).size).toBe(manifestIds.length);
  });

  it("covers every documented module id", () => {
    expect(INPUT_MODULE_DEFINITION_IDS.sort()).toEqual(Object.values(INPUT_MODULE_IDS).sort());
    expect(INPUT_MODULE_DEFINITIONS).toHaveLength(Object.values(INPUT_MODULE_IDS).length);
  });

  it("points each ref at this package's `*/module` entry, exporting one named binding", () => {
    for (const ref of INPUT_MODULE_MANIFEST) {
      expect(ref.path, `${ref.id} → ${ref.path}`).toMatch(/^@aio-ui\/input\/[a-z-]+\/module$/);
      expect(ref.export, `${ref.id} has no named export`).toBeTruthy();
    }
  });
});
