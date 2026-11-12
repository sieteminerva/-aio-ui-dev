/**
 * Modules route — the view-model.
 *
 * One row per module package: where it loads from, which slot it fills, and **the package's
 * own README**, imported as text at build time. The page does not restate the documentation,
 * so there is exactly one place to edit and no way for the page to drift from the package.
 */

import animationsReadme from "../../../packages/modules/animations/README.md?raw";
import eventEmitterReadme from "../../../packages/modules/event-emitter/README.md?raw";
import httpServiceReadme from "../../../packages/modules/http-service/README.md?raw";
import moduleLoaderReadme from "../../../packages/modules/module-loader/README.md?raw";
import routerReadme from "../../../packages/modules/router/README.md?raw";
import themeReadme from "../../../packages/modules/theme/README.md?raw";

export interface iDemoModule {
  /** Sidebar label, fragment and heading. */
  name: string;
  /** npm package that ships it. */
  pkg: string;
  /** App slot the class fills; `null` for a helper an app instantiates itself. */
  slot: string | null;
  /** Exported symbols an app deals with. */
  entry: string;
  /** The package README, verbatim. */
  readme: string;
}

export const MODULES: iDemoModule[] = [
  {
    name: "router",
    pkg: "@aio-ui/router",
    slot: "router",
    entry: "HashRouter",
    readme: routerReadme,
  },
  {
    name: "theme",
    pkg: "@aio-ui/theme",
    slot: "theme",
    entry: "ThemeRenderer",
    readme: themeReadme,
  },
  {
    name: "http-service",
    pkg: "@aio-ui/http-service",
    slot: "http",
    entry: "HttpService",
    readme: httpServiceReadme,
  },
  {
    name: "event-emitter",
    pkg: "@aio-ui/event-emitter",
    slot: "events",
    entry: "EventEmitter",
    readme: eventEmitterReadme,
  },
  {
    name: "animations",
    pkg: "@aio-ui/animations",
    slot: "animation",
    entry: "AnimationsService",
    readme: animationsReadme,
  },
  {
    // The one module that fills no slot: an app or a page instantiates it itself.
    name: "module-loader",
    pkg: "@aio-ui/module-loader",
    slot: null,
    entry: "ModuleLoader",
    readme: moduleLoaderReadme,
  },
];

/** The row for a fragment, or row 0 so `#modules` is never empty. */
export function moduleForFragment(fragment?: string): iDemoModule {
  return MODULES.find((row) => row.name === fragment) ?? MODULES[0];
}

/** `#modules/<name>` — the deep link for one module. */
export function moduleHash(name: string): string {
  return `#modules/${name}`;
}
