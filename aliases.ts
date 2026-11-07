import { fileURLToPath } from "node:url";

/**
 * Workspace package aliases.
 *
 * Shared by `vite.config.ts` and `vitest.config.ts` so a package can be imported
 * by name (`@aio-ui/core/...`) before npm workspaces create the node_modules
 * symlinks, and so both toolchains resolve them identically.
 */
export const workspaceAliases: Record<string, string> = {
  "@aio-ui/styles": fileURLToPath(new URL("./packages/styles/src", import.meta.url)),
  "@aio-ui/core": fileURLToPath(new URL("./packages/core/src", import.meta.url)),
  "@aio-ui/base": fileURLToPath(new URL("./packages/base/src", import.meta.url)),
  "@aio-ui/utilities": fileURLToPath(new URL("./packages/utilities/src", import.meta.url)),
  "@aio-ui/modules": fileURLToPath(new URL("./packages/modules/src", import.meta.url)),
};
