// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnimationsService } from "../Animations";
import { ANIMATION_BEHAVIOURS, ANIMATION_TYPES, indexBehaviours } from "../behaviours/registry";
import type { AnimationBehaviour, AnimationContext } from "../behaviours/types";

/**
 * Happy DOM has no IntersectionObserver; the engine only needs the shape.
 * Callbacks never fire, so tests drive `trigger()` explicitly — which is what we
 * want to assert anyway.
 */
class StubObserver {
  observe(): void { /* no-op */ }
  unobserve(): void { /* no-op */ }
  disconnect(): void { /* no-op */ }
}
(globalThis as any).IntersectionObserver ??= StubObserver;

function node(type: string, attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement("div");
  el.setAttribute("animation", type);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  document.body.appendChild(el);
  return el;
}

function recordsOf(service: AnimationsService): Map<HTMLElement, unknown> {
  return (service as any).records as Map<HTMLElement, unknown>;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("animation behaviour registry", () => {
  it("gives every built-in a type and an animate entry point", () => {
    expect(ANIMATION_BEHAVIOURS.length).toBeGreaterThan(0);
    for (const behaviour of ANIMATION_BEHAVIOURS) {
      expect(typeof behaviour.type).toBe("string");
      expect(behaviour.type.length).toBeGreaterThan(0);
      expect(typeof behaviour.animate).toBe("function");
    }
  });

  it("indexes built-ins by their attribute value", () => {
    expect([...ANIMATION_TYPES].sort()).toEqual(
      ["count-up", "fade-in", "loading-placeholder", "stagger-fade", "text-scramble", "typewriter"]
    );
  });

  it("rejects two definitions claiming the same type", () => {
    const definition: AnimationBehaviour = { type: "clash", animate: () => undefined };
    expect(() => indexBehaviours([definition, definition])).toThrow(/Duplicate animation behaviour/);
  });

  it("rejects a definition without a type", () => {
    expect(() => indexBehaviours([{ animate: () => undefined } as unknown as AnimationBehaviour]))
      .toThrow(/missing its `type`/);
  });

  it("resolves a non-empty config block for every tunable built-in", () => {
    const service = new AnimationsService();

    // `count-up` is a stub with no options by design; every other built-in must
    // find its config block, which is how a typo like `optionKey: 'scamble'`
    // used to reach the behaviour as `{}` and crash at runtime.
    for (const behaviour of ANIMATION_BEHAVIOURS) {
      if (behaviour.type === "count-up") continue;
      const options = (service as any)._optionsOf(behaviour) as Record<string, unknown>;
      expect(Object.keys(options), behaviour.type).not.toHaveLength(0);
    }
  });
});

describe("animation behaviour contract", () => {
  it("passes the resolved options, delay and signal to the behaviour", () => {
    const seen: AnimationContext[] = [];
    const probe: AnimationBehaviour = {
      type: "probe",
      animate: (context) => {
        seen.push(context);
        context.done();
      },
    };

    const service = new AnimationsService({ delay: 123, behaviours: [probe] });
    const el = node("probe", { "data-delay": "250" });

    service.mount(el);
    expect(recordsOf(service).size).toBe(1);

    service.trigger(el);

    expect(seen).toHaveLength(1);
    expect(seen[0].node).toBe(el);
    expect(seen[0].delay).toBe(250);
    expect(seen[0].signal).toBeInstanceOf(AbortSignal);
    expect(seen[0].stopped()).toBe(false);
  });

  it("falls back to the global delay when data-delay is not a number", () => {
    const delays: number[] = [];
    const service = new AnimationsService({
      delay: 500,
      behaviours: [{ type: "probe", animate: ({ delay, done }) => { delays.push(delay); done(); } }],
    });

    const el = node("probe", { "data-delay": "" });
    service.mount(el);
    service.trigger(el);

    expect(delays).toEqual([500]);
  });

  it("aborts the run when the engine stops the node", () => {
    let signal: AbortSignal | null = null;
    const service = new AnimationsService({
      behaviours: [{ type: "probe", animate: ({ signal: s, done }) => { signal = s; done(); } }],
    });

    const el = node("probe");
    service.mount(el);
    service.trigger(el);

    expect(signal!.aborted).toBe(false);
    service.stop(el);
    expect(signal!.aborted).toBe(true);
  });

  it("reports completion once, even if a behaviour calls done twice", () => {
    const service = new AnimationsService({
      behaviours: [{
        type: "probe",
        animate: ({ done }) => {
          done();
          done();
        },
      }],
    });

    const el = node("probe");
    const onDone = vi.fn();
    el.addEventListener("animation:done", onDone);

    service.mount(el);
    service.trigger(el);

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("emits animation:done on the segment a behaviour reports", () => {
    const onChild = vi.fn();
    const service = new AnimationsService({
      behaviours: [{
        type: "probe",
        animate: ({ node: host, done }) => {
          const child = document.createElement("span");
          child.addEventListener("animation:done", onChild);
          host.appendChild(child);
          done(child);
        },
      }],
    });

    const el = node("probe");
    const targets: EventTarget[] = [];
    // `animation:done` bubbles, so the host hears it too — what matters is the target.
    el.addEventListener("animation:done", (event) => targets.push(event.target!));

    service.mount(el);
    service.trigger(el);

    expect(onChild).toHaveBeenCalledTimes(1);
    expect(targets).toHaveLength(1);
    expect(targets[0]).toBe(el.firstElementChild);
  });

  it("ignores an unknown animation type instead of mounting it", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const service = new AnimationsService();
    const el = node("nope");

    service.mount(el);

    expect(recordsOf(service).has(el)).toBe(false);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Unknown animation type: "nope"'));
    warn.mockRestore();
  });

  it("accepts a behaviour registered after construction through use()", () => {
    const service = new AnimationsService();
    const run = vi.fn();
    const el = node("late");

    // Not registered yet → not mounted.
    service.mount(el);
    expect(recordsOf(service).size).toBe(0);

    service.use({ type: "late", animate: ({ done }) => { run(); done(); } });
    service.mount(el);
    service.trigger(el);

    expect(run).toHaveBeenCalledTimes(1);
    expect(service.types).toContain("late");
  });

  it("releases the observed scope once its last chained node unmounts", () => {
    const service = new AnimationsService();
    const scope = document.createElement("section");
    const first = node("fade-in", { "animation-chain": "true" });
    const second = node("fade-in", { "animation-chain": "true" });
    scope.append(first, second);
    document.body.appendChild(scope);

    service.scan(scope);

    const observer = (service as any).viewObserver as IntersectionObserver;
    const unobserve = vi.spyOn(observer, "unobserve");

    service.unmount(first);
    expect(unobserve).not.toHaveBeenCalledWith(scope);

    service.unmount(second);
    expect(unobserve).toHaveBeenCalledWith(scope);
  });

  it("stops every run on destroy()", () => {
    const signals: AbortSignal[] = [];
    const service = new AnimationsService({
      behaviours: [{ type: "probe", animate: ({ signal, done }) => { signals.push(signal); done(); } }],
    });

    const a = node("probe");
    const b = node("probe");
    service.mount(a);
    service.mount(b);
    service.trigger(a);
    service.trigger(b);

    service.destroy();

    expect(signals).toHaveLength(2);
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    expect(recordsOf(service).size).toBe(0);
  });
});
