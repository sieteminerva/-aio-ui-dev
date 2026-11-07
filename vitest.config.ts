import { defineConfig } from "vitest/config";
import { workspaceAliases } from "./aliases.ts";

/**
 * Dedicated Vitest configuration.
 *
 * Kept separate from `vite.config.ts` because the application config carries a
 * `base` path, Lightning CSS targets, and Rolldown chunk-splitting rules that
 * are irrelevant — and partly unsupported — in a Node test run. The workspace
 * aliases are shared so package imports resolve in both toolchains.
 */
export default defineConfig({
  resolve: {
    alias: workspaceAliases,
  },
  test: {
    include: ["src/**/*.test.ts", "packages/**/*.test.ts"],
    environment: "node",
  },
});
