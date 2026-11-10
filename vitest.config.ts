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
    // Generated copies (extracted tarballs, smoke sites, release artefacts) may
    // contain the packages' own test files; they are not part of this suite.
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      ".draft/cdn-tree/**",
      ".draft/cdn-worktree/**",
      ".draft/cdn-smoke/**",
      ".draft/smoke/**",
      ".draft/release/**",
      ".draft/results/**",
    ],
    environment: "node",
  },
});
