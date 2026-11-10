/**
 * MODUL: ANIMATION BEHAVIOUR REGISTRY
 *
 * Maps the `animation="…"` attribute value to the definition that runs it.
 * The engine no longer knows any concrete behaviour: it asks this registry,
 * so a host can ship its own without patching the service (see
 * `AnimationsService.use()`).
 */
import type { AnimationBehaviour } from './types';
import { typewriterBehaviour } from './typewriter';
import { staggerFadeBehaviour } from './stagger-fade';
import { fadeInBehaviour } from './fade-in';
import { scrambleBehaviour } from './scramble';
import { countUpBehaviour } from './count-up';
import { loadingPlaceholderBehaviour } from './loading-placeholder';

/**
 * Built-in behaviours, in declaration order. Add a behaviour here only when it
 * belongs to the framework itself; project-specific effects register at runtime.
 */
export const ANIMATION_BEHAVIOURS: readonly AnimationBehaviour<any>[] = [
  typewriterBehaviour,
  staggerFadeBehaviour,
  fadeInBehaviour,
  scrambleBehaviour,
  countUpBehaviour,
  loadingPlaceholderBehaviour,
];

/** The `animation` attribute values the engine understands out of the box. */
export const ANIMATION_TYPES: readonly string[] = ANIMATION_BEHAVIOURS.map((b) => b.type);

/**
 * Indexes a behaviour list by `type`.
 *
 * @throws {Error} On a duplicate type — silently keeping the last one hides a
 *   real configuration mistake (two packages claiming `animation="fade-in"`).
 */
export function indexBehaviours(
  behaviours: readonly AnimationBehaviour<any>[]
): Map<string, AnimationBehaviour<any>> {
  const index = new Map<string, AnimationBehaviour<any>>();

  for (const behaviour of behaviours) {
    if (!behaviour?.type) {
      throw new Error('[animations] A behaviour definition is missing its `type`.');
    }
    if (index.has(behaviour.type)) {
      throw new Error(`[animations] Duplicate animation behaviour: "${behaviour.type}".`);
    }
    index.set(behaviour.type, behaviour);
  }

  return index;
}
