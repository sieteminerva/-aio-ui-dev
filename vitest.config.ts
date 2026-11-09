import { defineConfig } from "vitest/config";

/**
 * Dedicated Vitest configuration.
 *
 * Package imports resolve through npm workspace links, so no alias map is
 * needed here.
 */
export default defineConfig({
  test: {
    // `.draft/` holds work that is not a package yet (the preset engine).
    // It is tested from day one so it can move later without re-proving itself.
    include: ["packages/**/*.test.ts", ".draft/**/*.test.ts"],
    environment: "node",
  },
});
