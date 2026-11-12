/**
 * The README contract itself.
 *
 * `examples/demo/src/readme.ts` parses package READMEs by heading name, so the headings are an
 * interface: this test fails when a package README stops following `COMPONENT-CONVENTIONS.md` §1c —
 * which is what keeps a newly scaffolded component from shipping unparseable docs.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  PLUGIN_PACKAGES,
  README_OPTIONAL,
  README_REQUIRED,
  missingSections,
  parseReadme,
  sectionOf,
} from "../readme";

const ROOT = process.cwd();
const ALLOWED = new Set<string>([...README_REQUIRED, ...README_OPTIONAL]);

/** Directory names that are packages (every folder in the band has a README). */
function packageFolders(band: string): string[] {
  return readdirSync(join(ROOT, "packages", band), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function read(band: string, folder: string) {
  return parseReadme(readFileSync(join(ROOT, "packages", band, folder, "README.md"), "utf8"));
}

describe("component READMEs", () => {
  const folders = packageFolders("components");

  it("covers every component package", () => {
    expect(folders.length).toBeGreaterThanOrEqual(20);
  });

  for (const folder of folders) {
    it(`${folder} — has the five required H2s, in order`, () => {
      const doc = read("components", folder);
      const headings = doc.sections.map((section) => section.heading);

      expect(missingSections(doc)).toEqual([]);

      const positions = README_REQUIRED.map((heading) => headings.indexOf(heading));
      expect(positions).toEqual([...positions].sort((a, b) => a - b));

      const unexpected = headings.filter((heading) => !ALLOWED.has(heading));
      expect(unexpected).toEqual([]);
    });
  }

  for (const folder of PLUGIN_PACKAGES) {
    it(`${folder} — is a plugin, so it also documents ## Methods and ## Appendix`, () => {
      const doc = read("components", folder);

      expect(sectionOf(doc, "Methods")).not.toBeNull();
      expect(sectionOf(doc, "Appendix")).not.toBeNull();
    });
  }
});

describe("module READMEs", () => {
  for (const folder of packageFolders("modules")) {
    it(`${folder} — has the five required H2s plus ## Methods, in order`, () => {
      const doc = read("modules", folder);
      const headings = doc.sections.map((section) => section.heading);

      expect(missingSections(doc)).toEqual([]);
      expect(headings).toContain("Methods");

      const expectedOrder = [...README_REQUIRED.slice(0, 4), "Methods", "Wiring checklist"];
      expect(headings.filter((heading) => expectedOrder.includes(heading))).toEqual(expectedOrder);
    });
  }
});
