/**
 * Ports the application shell needs from its adapters.
 *
 * The shell owns orchestration only: routing, preload, render, mount and teardown.
 * Every adapter is injected, so the shell can be pointed at a different
 * renderer, router or animation implementation without knowing how they work.
 *
 * These interfaces are also the requirement list handed to Phase 2
 * (`ComponentRegistry` rewrite): whatever is declared here is what the registry
 * must be able to do.
 */
export {};
//# sourceMappingURL=ports.js.map