// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ensureStylesheet, useStylesheetAssets } from "@aio-ui/core/Stylesheets";

import { InputBuilder } from "../Input";
import { DropdownBuilder } from "../Dropdown/Dropdown";
import { FILE_UPLOADER_STYLESHEET } from "../FileUploader/FileUploader";
import { InputControlsBuilder } from "../InputControls/InputControls";

/**
 * The input package ships four sheets and none of them is imported by the component:
 * each declares a specifier and the host keys the map. Resolution falls back to the
 * file name, so a declaration written in the "source file" spelling
 * (`"./FileUploader.css"`) silently missed a host key written in the package's export
 * spelling (`@aio-ui/input/file-uploader.css`) — the sheet was never injected and the
 * component rendered unstyled with no error. This pins the two spellings together.
 */

/** The host's key layout, as `examples/demo/src/registry.assets.ts` declares it. */
const HOST_KEYS = [
  "@aio-ui/input/input.css",
  "@aio-ui/input/dropdown.css",
  "@aio-ui/input/file-uploader.css",
  "@aio-ui/input/controls.css",
];

const CSS = "@media all { .field { color: gold } }";

beforeEach(() => {
  document.head.replaceChildren();
  useStylesheetAssets({});
});

describe("input stylesheets", () => {
  it("resolves every builder's declared sheet against the host key layout", async () => {
    const loaders = Object.fromEntries(HOST_KEYS.map((key) => [key, vi.fn(async () => ({ default: CSS }))]));
    useStylesheetAssets(loaders as any);

    const declarations = [
      new InputBuilder({} as any).stylesheet,
      new DropdownBuilder({} as any).stylesheet,
      new InputControlsBuilder({} as any).stylesheet,
      FILE_UPLOADER_STYLESHEET,
    ];

    for (const specifier of declarations) {
      await ensureStylesheet(specifier);
    }

    for (const key of HOST_KEYS) {
      expect(loaders[key], `${key} was never requested`).toHaveBeenCalledTimes(1);
    }
    expect(document.querySelectorAll('style[id^="rajutan-lazy-css"]')).toHaveLength(HOST_KEYS.length);
  });
});
