import { defineConfig } from "vitest/config";

/**
 * Dedicated Vitest configuration.
 *
 * Kept separate from `vite.config.ts` because the application config carries a
 * `base` path, Lightning CSS targets, and Rolldown chunk-splitting rules that
 * are irrelevant — and partly unsupported — in a Node test run.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
