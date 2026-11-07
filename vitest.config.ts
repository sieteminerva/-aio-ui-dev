import { defineConfig } from "vitest/config";

/**
 * Dedicated Vitest configuration.
 *
 * Package imports resolve through npm workspace links, so no alias map is
 * needed here.
 */
export default defineConfig({
  test: {
    include: ["packages/**/*.test.ts"],
    environment: "node",
  },
});
