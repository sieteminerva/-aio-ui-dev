/**
 * Small synchronous event bus.
 *
 * Two kinds of event travel through it: component-level ones (`elementAdded`, …) that a
 * builder reports through `config.emit`, and page-level ones the shell emits around a
 * render pass. The registry receives this emitter's `emit` once
 * (`registry.useEmitter(emitter.emit)`) and injects it into every builder config, so a
 * component never has to be told that the application has a bus.
 *
 * Unknown event names are accepted on purpose: a component may name its own
 * (`formValidation`, `tabs:content-loaded`) without registering anything first.
 */
export class EventEmitter {
    /** Slot this class fills when registered as an app module. */
    static slot = "events";
    listeners = {};
    /**
     * Subscribes to an event.
     *
     * @param event - Known page/component event, or any custom component event name.
     * @param callback - Receives the payload; known events are typed, custom ones are not.
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }
    /**
     * Publishes an event.
     *
     * A throwing listener cannot stop the others: its error is logged and the loop
     * continues, because an event bus is reporting, not control flow.
     */
    emit = (event, data) => {
        const callbacks = this.listeners[event];
        if (!callbacks)
            return;
        for (const callback of callbacks) {
            try {
                callback(data);
            }
            catch (err) {
                console.error(`[EventEmitter] Error executing callback for event "${event}":`, err);
            }
        }
    };
    off(event, callback) {
        if (!this.listeners[event])
            return;
        this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
    }
    clear() {
        this.listeners = {};
    }
    /**
     * Releases every listener.
     *
     * Named `destroy` so a host that releases its modules generically
     * (`port.destroy?.()`) does not need a special case for this class.
     */
    destroy() {
        this.clear();
    }
}
//# sourceMappingURL=EventEmitter.js.map