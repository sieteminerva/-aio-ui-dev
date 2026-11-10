import { ReactiveGraph } from "./ReactiveGraph.js";
const IS_PROXY = Symbol("IS_PROXY");
export class BuilderProxy {
    /** Identity cache: raw payload object → its reactive proxy. */
    proxyCache;
    /** 🧲 Per-proxy reactive effect graph (owned, not module-global). */
    reactive = new ReactiveGraph();
    constructor(proxyCache) {
        this.proxyCache = proxyCache;
    }
    makeReactive(key, payload, onUpdateCallback) {
        const self = this;
        function _isProxy(obj) {
            return Boolean(obj && typeof obj === "object" && obj[IS_PROXY] === true);
        }
        function _isPlainObjectOrArray(obj) {
            if (obj === null || typeof obj !== "object")
                return false;
            if (obj instanceof String || obj instanceof Number || obj instanceof Boolean) {
                return false;
            }
            if (Array.isArray(obj))
                return true;
            const proto = Object.getPrototypeOf(obj);
            return proto === Object.prototype || proto === null;
        }
        if (payload == null || typeof payload !== "object")
            return payload;
        if (!_isPlainObjectOrArray(payload))
            return payload;
        if (_isProxy(payload))
            return payload;
        if (payload instanceof Node)
            return payload;
        if (this.proxyCache.has(payload)) {
            return this.proxyCache.get(payload);
        }
        const singleProxyObj = new Proxy(payload, {
            get: (target, prop, receiver) => {
                if (prop === IS_PROXY)
                    return true;
                const value = Reflect.get(target, prop, receiver);
                if (typeof prop !== "symbol")
                    this.reactive.track(target, prop);
                if (value !== null && _isPlainObjectOrArray(value) && !(value instanceof Node)) {
                    if (self.proxyCache.has(value)) {
                        return self.proxyCache.get(value);
                    }
                    return self.makeReactive(key, value, onUpdateCallback);
                }
                return value;
            },
            set: (target, prop, value, receiver) => {
                const isArray = Array.isArray(target);
                if (value !== null && typeof value === "object" && !_isProxy(value) && !(value instanceof Node)) {
                    value = self.makeReactive(key, value, onUpdateCallback);
                }
                const oldValue = target[prop];
                const isValueEqual = oldValue === value;
                const success = Reflect.set(target, prop, value, receiver);
                if (success) {
                    const isArrayLengthChange = isArray && prop === "length";
                    const isArrayMutated = isArray && !isNaN(Number(prop));
                    if (!isValueEqual || isArrayLengthChange || isArrayMutated) {
                        // 🔔 Reactive graph: wake only the effects that read this prop.
                        this.reactive.notify(target, prop);
                        if (typeof onUpdateCallback === "function") {
                            onUpdateCallback(target, prop, value);
                        }
                    }
                }
                return success;
            },
            deleteProperty: (target, prop) => {
                const hasProp = prop in target;
                const success = Reflect.deleteProperty(target, prop);
                if (success && hasProp) {
                    this.reactive.notify(target, prop);
                    if (typeof onUpdateCallback === "function") {
                        onUpdateCallback(target, prop, undefined);
                    }
                }
                return success;
            }
        });
        this.proxyCache.set(payload, singleProxyObj);
        return singleProxyObj;
    }
    getByPath(obj, path) {
        return path.split(".").reduce((acc, key) => acc?.[key], obj);
    }
    setByPath(obj, path, value) {
        const segments = path.split(".");
        const last = segments.pop();
        if (!last)
            return;
        const target = segments.reduce((acc, key) => {
            if (acc[key] == null || typeof acc[key] !== "object") {
                acc[key] = {};
            }
            return acc[key];
        }, obj);
        target[last] = value;
    }
    readValue(el) {
        if (el instanceof HTMLInputElement && el.type === "checkbox") {
            const trueValue = el.dataset.trueValue ?? "true";
            const falseValue = el.dataset.falseValue ?? "false";
            if (el.value && el.value !== "on") {
                return el.checked ? (trueValue ?? el.value) : (falseValue ?? "");
            }
            return el.checked;
        }
        if (el instanceof HTMLSelectElement)
            return el.value;
        return el.value;
    }
    writeValue(el, value) {
        if (el instanceof HTMLInputElement && el.type === "checkbox") {
            const trueValue = el.dataset.trueValue ?? "true";
            // const falseValue = el.dataset.falseValue ?? "false";
            if (el.value && el.value !== "on") {
                el.checked = String(value ?? false) === String(trueValue);
                return;
            }
            el.checked = Boolean(value);
            return;
        }
        if (el instanceof HTMLSelectElement) {
            el.value = String(value ?? "");
            return;
        }
        el.value = value ?? "";
    }
    bind(root, source) {
        if (!(root instanceof HTMLElement))
            return;
        const controls = root.querySelectorAll("[data-bind],[name]");
        controls.forEach((el) => {
            const path = this.getBindingPath(el);
            if (!path)
                return;
            const existing = el.__builderBinding;
            if (existing) {
                existing.syncFromState = () => this.writeValue(el, this.getByPath(source, path));
                existing.syncToState = () => this.setByPath(source, path, this.readValue(el));
                return;
            }
            const syncFromState = () => this.writeValue(el, this.getByPath(source, path));
            const syncToState = () => this.setByPath(source, path, this.readValue(el));
            el.__builderBinding = { path, syncFromState, syncToState };
            el.addEventListener("input", syncToState);
            el.addEventListener("change", syncToState);
            syncFromState();
        });
    }
    sync(root, source) {
        if (!(root instanceof HTMLElement))
            return;
        const controls = root.querySelectorAll("[data-bind],[name]");
        controls.forEach((el) => {
            const path = this.getBindingPath(el);
            if (!path)
                return;
            this.writeValue(el, this.getByPath(source, path));
        });
    }
    /**
     * 🧲 Runs `fn` immediately and re-runs it whenever proxied state read
     * inside it mutates. Delegates to the owned ReactiveGraph.
     */
    watchEffect(fn) {
        return this.reactive.watchEffect(fn);
    }
    /**
     * 🔄 STATE → UI AUTO-SYNC (reactive one-way binding)
     * Watches every `[data-bind]` control under `root` inside one effect:
     * writing to any proxied state path the controls point at re-writes
     * the control values automatically. Returns an unwatch function.
     */
    bindReactive(root, source) {
        if (!(root instanceof HTMLElement))
            return () => { };
        const controls = Array.from(root.querySelectorAll("[data-bind]"));
        return this.reactive.watchEffect(() => {
            for (const el of controls) {
                const path = this.getBindingPath(el);
                if (!path)
                    continue;
                // Reading through the proxy registers (target, prop) deps; a
                // mutation anywhere on those paths re-runs this loop.
                this.writeValue(el, this.getByPath(source, path));
            }
        });
    }
    getBindingPath(el) {
        const bindPath = el.dataset?.bind;
        if (bindPath)
            return bindPath;
        return el.name || null;
    }
}
//# sourceMappingURL=BuilderProxy.js.map