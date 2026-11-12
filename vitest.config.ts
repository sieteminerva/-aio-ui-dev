import { defineConfig } from "vitest/config";

/**
 * Dedicated Vitest configuration.
 *
 * Package imports resolve through npm workspace links, so no alias map is
 * needed here.
 */
export default defineConfig({
  test: {
    // `orchestrator/` holds the generator engine (not a package yet).
    // It is tested from day one so it can move later without re-proving itself.
    // `examples/` is included because the demo owns the README parser and the README contract test.
    include: ["packages/**/*.test.ts", "orchestrator/**/*.test.ts", "examples/**/*.test.ts"],
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
