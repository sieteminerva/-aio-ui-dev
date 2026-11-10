import { typewriterBehaviour } from './typewriter.js';
import { staggerFadeBehaviour } from './stagger-fade.js';
import { fadeInBehaviour } from './fade-in.js';
import { scrambleBehaviour } from './scramble.js';
import { countUpBehaviour } from './count-up.js';
import { loadingPlaceholderBehaviour } from './loading-placeholder.js';
/**
 * Built-in behaviours, in declaration order. Add a behaviour here only when it
 * belongs to the framework itself; project-specific effects register at runtime.
 */
export const ANIMATION_BEHAVIOURS = [
    typewriterBehaviour,
    staggerFadeBehaviour,
    fadeInBehaviour,
    scrambleBehaviour,
    countUpBehaviour,
    loadingPlaceholderBehaviour,
];
/** The `animation` attribute values the engine understands out of the box. */
export const ANIMATION_TYPES = ANIMATION_BEHAVIOURS.map((b) => b.type);
/**
 * Indexes a behaviour list by `type`.
 *
 * @throws {Error} On a duplicate type — silently keeping the last one hides a
 *   real configuration mistake (two packages claiming `animation="fade-in"`).
 */
export function indexBehaviours(behaviours) {
    const index = new Map();
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
//# sourceMappingURL=registry.js.map