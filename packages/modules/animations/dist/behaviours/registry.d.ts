/**
 * MODUL: ANIMATION BEHAVIOUR REGISTRY
 *
 * Maps the `animation="…"` attribute value to the definition that runs it.
 * The engine no longer knows any concrete behaviour: it asks this registry,
 * so a host can ship its own without patching the service (see
 * `AnimationsService.use()`).
 */
import type { AnimationBehaviour } from './types';
/**
 * Built-in behaviours, in declaration order. Add a behaviour here only when it
 * belongs to the framework itself; project-specific effects register at runtime.
 */
export declare const ANIMATION_BEHAVIOURS: readonly AnimationBehaviour<any>[];
/** The `animation` attribute values the engine understands out of the box. */
export declare const ANIMATION_TYPES: readonly string[];
/**
 * Indexes a behaviour list by `type`.
 *
 * @throws {Error} On a duplicate type — silently keeping the last one hides a
 *   real configuration mistake (two packages claiming `animation="fade-in"`).
 */
export declare function indexBehaviours(behaviours: readonly AnimationBehaviour<any>[]): Map<string, AnimationBehaviour<any>>;
//# sourceMappingURL=registry.d.ts.map