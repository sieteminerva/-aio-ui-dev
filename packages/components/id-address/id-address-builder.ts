import type { IAddressAdapter } from "./id-address-adapter";
import { HttpService, type iHttpServiceConfig } from "@aio-ui/http-service";
import { ensureStylesheet } from "@aio-ui/core";
import { IdAddressAdapterNative } from "./id-address-adapter.native";
import { IdAddressAdapterBase } from "./id-address-adapter.base";
import { IdAddressAdapterAio } from "./id-address-adapter.aio";

const ADDRESS_LEVELS = ["propinsi", "kota", "kecamatan", "kelurahan", "kodepos"];
export const ADDRESS_DETAIL_KEYS = [
  "propinsi", "propinsi_id", "propinsi_name",
  "kota", "kota_id", "kota_name",
  "kecamatan", "kecamatan_id", "kecamatan_name",
  "kelurahan", "kelurahan_id", "kelurahan_name",
  "kodepos", "kodepos_id", "kodepos_name",
  "latitude", "longitude", "formatted_address"
] as const;

// Definisikan tipe otomatis dari array agar sinkron dan tidak menulis ulang dua kali
export type IdAddressDetailKey = typeof ADDRESS_DETAIL_KEYS[number];

type IdAddressLevel = "propinsi" | "kota" | "kecamatan" | "kelurahan" | "kodepos";

export type IdAddressDetail = {
  [key in IdAddressDetailKey]?: string | number | undefined | null;
}

interface IdAddressQuery {
  // The query parameters for the data request.
  level: IdAddressLevel | "detail" | "geocode" // The administrative level to fetch (e.g., 'propinsi', 'kota', 'detail').
  parentId?: string | number  // The ID of the parent region to filter results.
  kodepos?: string  // Postal code for specific detail lookups.
  location?: boolean  // Flag to include geocode data in detail lookups.
}

export interface IdAddressConfig {
  /** Endpoint used by the built-in fetch path. Ignored when `loader` is set. */
  url: string | null;
  /**
   * Data source override — preferred over `url`.
   *
   * Receives exactly the query the endpoint would have received (`{ level, parentId }`,
   * `{ level: "kodepos", parentId }`, …) and resolves to the rows of that level, in the
   * `{ <level>_id, <level>_name }` shape. This is the seam that lets an application route
   * the picker through its own HTTP service, a cache, or a mock — which is also why the
   * builder no longer has to own a transport at all.
   */
  loader?: ((query: IdAddressQuery) => Promise<any>) | null;
  /**
   * HTTP service that owns transport, timeout and cache.
   *
   * When omitted, the builder builds one from `url` + `cache` (same package, same
   * behaviour as every other data consumer in the framework). Inject it to share an
   * app-wide service, point at a different host, or stub it in tests.
   */
  service?: HttpService | null;
  geocode?: boolean;
  cache?: IdAddressCacheConfig;
  container: HTMLElement | string | null;
  useAdapter?: 'native' | 'semantic-ui' | string | null; // Menggunakan string literal union untuk kejelasan
  headless?: boolean;
  textContent?: IdAddressTextContentConfig;
}

const DEFAULT_CONFIG: IdAddressConfig = {
  url: null,
  geocode: false,
  cache: {
    enabled: true,
    ttlDays: 1,
    prefix: "IdAddressBuilder",
    delay: 0, // artificial pause (ms) applied to cached responses ("network feel"); 0 = instant
    timeout: 10000,
  },
  container: null,
  useAdapter: null,
  headless: false,
  textContent: {
    loading: "Loading #{level}  ",
    placeholder: "Pilih #{level}",
    notFound: "Tidak menemukan hasil",
    error: "Terjadi kesalahan",
  },
};

export type IdAddressEventHandler = (
  schema: Record<string, any> | null,
  data: Record<string, any> | any[],
  complete: () => "ready" | "error" | "complete" | "loading" | "start" | "empty" | undefined,
  ...rest: any[] // Menggunakan rest parameter untuk variabel 'rest' tambahan
) => void;

export interface IdAddressEventArgs {
  schema?: Record<string, any> | null;
  data?: Record<string, any> | any[];
  state?: string;
  complete?: () => "ready" | "error" | "complete" | "loading" | "start" | "empty" | undefined;
  onLevelChange?: () => void | Promise<void>;
}

export interface IdAddressCacheEntry {
  data: any; // Mewakili '*' (any tipe data) dari JSDoc
  expire: number;
}

export interface IdAddressTextContentConfig {
  loading?: string;
  placeholder?: string;
  notFound?: string;
  error?: string;
}

export interface IdAddressCacheConfig {
  enabled?: boolean;
  ttlDays?: number;
  prefix?: string;
  delay?: number;
  timeout?: number;
}


export interface IdAddressSchemaRef {
  el: HTMLInputElement | HTMLSelectElement;
  name: IdAddressDetailKey;
  adapterName: string | null | undefined;
  adapter: IAddressAdapter;
  isDropdown: boolean;
  index: number;
  load: (parentId: string, selectedValue: any) => Promise<any>;
  getDetail: (kodepos?: string) => Partial<IdAddressDetail>;
  next: null | IdAddressSchemaRef;
  // load: (level: Partial<IdAddressDetail> | undefined) => Promise<void>;
  select: (value: Partial<IdAddressDetail>) => void | Promise<void>;
}

/**
 * Indonesian administrative address cascade builder.
 *
 * @classdesc
 * Creates a province-to-postal-code address picker backed by a public API. The
 * builder can render native controls, delegate rendering to a registered UI
 * adapter, or run in headless mode for frameworks and server-shaped workflows
 * that only need the data cascade. It supports response caching, reverse lookup
 * by kodepos, optional geocode loading, and lifecycle cleanup through destroy().
 *
 * @example
 * // Native browser controls with geocode enabled.
 * const picker = new IdAddressBuilder({
 *   url: "https://script.google.com/macros/s/example/exec",
 *   container: "#address-form",
 *   useAdapter: "native",
 *   geocode: true,
 * });
 *
 * picker.onLevelChanged((schema, data, complete) => {
 *   if (complete() === "complete") console.log(schema.name, data, picker.detail);
 * });
 *
 * picker.onGeocodeLoaded((schema, data) => {
 *   console.log("Coordinates:", data);
 * });
 *
 * picker.init();
 *
 * @example
 * // Cache tuning or disabling.
 * const fastCache = new IdAddressBuilder({
 *   url: API_URL,
 *   container: document.querySelector("#address-form"),
 *   cache: {
 *     enabled: true,
 *     ttlDays: 7,
 *     prefix: "checkout-address",
 *     delay: 0,
 *     timeout: 8000,
 *   },
 * });
 *
 * fastCache.init();
 *
 * const noCache = new IdAddressBuilder({
 *   url: API_URL,
 *   container: "#address-form",
 *   cache: { enabled: false },
 * });
 *
 * noCache.init();
 *
 * @example
 * // Register and switch to a custom adapter.
 * import { IAddressAdapterSemanticUi } from "./id-address-adapter.semantic-ui.js";
 *
 * const picker = new IdAddressBuilder({
 *   url: API_URL,
 *   container: "#semantic-address-form",
 *   useAdapter: "semantic-ui",
 * });
 *
 * picker.registerAdapter("semantic-ui", IAddressAdapterSemanticUi);
 * picker.init();
 *
 * @example
 * // Use the public data API without waiting for UI interaction.
 * const picker = new IdAddressBuilder({ url: API_URL, container: "#address-form" });
 * picker.init();
 *
 * const cities = await picker.getRegionalData({ level: "kota", parentId: 11 });
 * const detail = await picker.getDetailByKodepos("10110", true);
 * const geocode = await picker.getGeocodeLocation(detail[0]);
 *
 * console.log({ cities, detail, geocode });
 *
 * @example
 * // Headless cascade for framework-managed rendering.
 * const picker = new IdAddressBuilder({
 *   url: API_URL,
 *   container: document.createElement("div"),
 *   headless: true,
 *   cache: { delay: 0 },
 * });
 *
 * picker.onLevelLoaded(async (schema, data, complete) => {
 *   if (complete() !== "complete" || !data.length) return;
 *   if (schema.next) await schema.next.load(data[0][`${schema.name}_id`]);
 * });
 *
 * picker.init();
 * const districts = await picker.loadNextLevel("kecamatan", "3171");
 *
 * @todo Document the expected public API response shape once the endpoint contract is finalized.
 */
export class IdAddressBuilder {

  /**
   * @property {IdAddressConfig} _config
   * @description Merged runtime configuration for API, cache, text, container, and adapter behavior.
   */
  _config: IdAddressConfig;

  /**
   * @property {Object<string, import("./id-address-adapter").IAddressAdapter>} adapters
   * @description Registry of available UI adapters by adapter name.
   */
  adapters: Record<string, IAddressAdapter>;

  /**
   * @property {boolean} _destroyed
   * @description Whether this instance has been destroyed and should ignore async work.
   */
  _destroyed: boolean;

  /**
   * @property {boolean} _initialized
   * @description Whether this instance has already completed initialization.
   */
  _initialized: boolean;

  /** HTTP service in use; built on first request when none was injected. */
  #http: HttpService | null = null;

  /** Whether this picker created the service (and may therefore destroy it). */
  #ownsHttp = false;

  /**
   * @property {HTMLElement|null} containerEl
   * @description Resolved container element that hosts the address controls.
   */
  containerEl: HTMLElement | null;

  /**
   * @property {Object} _detail
   * @description Current accumulated address detail selected or resolved by the builder.
   */
  _detail: Partial<IdAddressDetail>;

  /**
   * @property {Array<IdAddressSchemaRef>} schema
   * @description Runtime schema entries for each configured address level.
   */
  schema: IdAddressSchemaRef[];

  /**
   * @property {Object<string, Array<IdAddressEventHandler>>} _listeners
   * @description Event listeners grouped by event name.
   */
  _listeners: Record<string, IdAddressEventHandler[]>;

  /**
   * @property {boolean} _skipChangeListener
   * @description Guard flag used while programmatically updating selected values.
   */
  _skipChangeListener: boolean;;

  /**
   * @property {number} _kodeposRunId
   * @description Monotonic token for kodepos reverse-lookup runs; a newer lookup
   * supersedes an in-flight older one so rapid retyping cannot interleave results.
   */
  _kodeposRunId: number = 0;

  /**
   * @property {Set<string>} _loadedLevels
   * @description Levels that actually rendered rows in the current cascade run.
   * `_settleLevels` uses it to tell "filled" apart from "asked but came back empty" —
   * an empty level still has an id in the detail, so the id alone cannot decide.
   */
  _loadedLevels: Set<string> = new Set();

  /**
   * @property {Array<string>} _levelOrder
   * @description Ordered administrative levels used to build and traverse the cascade.
   */
  _levelOrder;

  /**
   * Initializes a new instance of IdAddressBuilder with the provided configuration.
   *
   * @param {IdAddressConfig} [config={}] - Configuration object for the builder.
   * @throws {Error} If the container is not provided in the configuration.
   *
   * @example
   * const picker = new IdAddressBuilder({ url: 'https://api.example.com', container: '#address-form' });
   *
   * @description
   * How it works: The constructor merges user configuration with defaults, registers the built-in
   * adapters (base and native), initializes internal state tracking (detail, schema, listeners),
   * and triggers an immediate cache validation check to ensure stored data is fresh.
   */
  constructor(config: IdAddressConfig) {
    // Step 1: Merge user-provided configuration with default settings.
    this._config = {
      ...DEFAULT_CONFIG,
      ...config,
      cache: { ...DEFAULT_CONFIG.cache, ...config?.cache },
      textContent: { ...DEFAULT_CONFIG.textContent, ...config?.textContent },
    };

    // Step 2: Register default UI adapters.
    this.adapters = {
      // `base` is headless, `native` drives platform controls, `aio` drives this
      // framework's own markup (`option.placeholder`, `.menu > .item`, hidden value).
      base: IdAddressAdapterBase,
      native: IdAddressAdapterNative,
      aio: IdAddressAdapterAio,
    };

    // Step 3: Initialize lifecycle and request management flags.
    this._destroyed = false;
    this._initialized = false;
    this.containerEl = null;

    // Step 4: Initialize internal data structures for state and event handling.
    this._detail = {};
    this.schema = [];
    this._listeners = {};
    this._skipChangeListener = false;

    // Step 5: Validate that a container is specified (required for both UI and Headless logic).
    if (!this.config.container) {
      throw new Error("[IdAddressBuilder] container is required");
    }

    // Step 6: Set the administrative hierarchy order. Cache lifetime belongs to the HTTP
    // service now, which validates its own entries on construction.
    this._levelOrder = [...ADDRESS_LEVELS];
  }

  /**
   * Registers a new UI adapter to handle element manipulation and event binding.
   *
   * @param {string} name - The unique identifier for the adapter (e.g., 'semantic-ui').
   * @param {IAddressAdapter} adapter - An object implementing the adapter interface.
   * @returns {void}
   * @throws {TypeError} If the name is invalid, adapter is not an object, or required methods are missing.
   *
   * @example
   * picker.registerAdapter('my-theme', {
   *   setOptions: (el, config) => { ... },
   *   setSelectedOption: (el, val) => { ... },
   *   onLevelChange: (el) => { ... },
   *   clear: (el) => { ... }
   * });
   *
   * @description
   * This method validates the provided adapter object against a set of required methods
   * defined in the `IAddressAdapter` interface. If valid, it stores the adapter in the
   * `adapters` registry, making it available for use during initialization via the `useAdapter` config.
   */
  registerAdapter(name: string, adapter: IAddressAdapter) {
    const requiredMethods = ["setOptions", "setSelectedOption", "onLevelChange", "clear"];

    // Step 1: Validate that the adapter name is a valid string.
    if (!name || typeof name !== "string") {
      throw new TypeError("[IdAddressBuilder] adapter name must be a non-empty string");
    }

    // Step 2: Ensure the adapter provided is an object.
    if (!adapter || typeof adapter !== "object") {
      throw new TypeError(`[IdAddressBuilder] adapter '${name}' must be an object`);
    }

    // Step 3: Check for the existence of all required interface methods.
    const missingMethods = requiredMethods.filter((method) => typeof (adapter as any)[method] !== "function");
    if (missingMethods.length) {
      throw new TypeError(
        `[IdAddressBuilder] adapter '${name}' is missing required method(s): ${missingMethods.join(", ")}`
      );
    }

    // Step 4: Store the validated adapter in the internal registry.
    this.adapters[name] = adapter;
  }

  /**
   * Retrieves the current configuration object for the builder.
   *
   * @returns {IdAddressConfig} The merged configuration settings.
   *
   * @example
   * const currentUrl = picker.config.url;
   *
   * @description
   * This getter provides access to the internal `_config` object, which contains
   * API settings, cache parameters, and UI preferences.
   */
  get config(): IdAddressConfig {
    // Step 1: Return the internal configuration object.
    return this._config;
  }

  /**
   * Updates the builder configuration by merging new settings with the existing ones.
   *
   * @param {IdAddressConfig} _config - An object containing configuration overrides.
   *
   * @example
   * picker.config = { geocode: true };
   *
   * @description
   * This setter merges the provided object into the internal `_config` state while
   * preserving nested defaults for cache and text content settings.
   */
  set config(_config: Partial<IdAddressConfig>) {
    // Step 1: Merge the new configuration properties into the existing internal state.
    this._config = {
      ...this._config,
      ..._config,
      cache: { ...this._config.cache, ..._config?.cache },
      textContent: { ...this._config.textContent, ..._config?.textContent },
    };
  }

  /**
   * The elements that actually carry a level's value.
   *
   * @param container - Element holding the `[data-level]` markup.
   * @returns One node per level, in document order.
   *
   * @summary `[data-level]` is not unique to the value carrier: a custom dropdown marks
   * its wrapper *and* its hidden input (the same attribute list is applied to both), so a
   * naive `querySelectorAll` returned two nodes per level — the wrapper took the level's
   * slot and the real carrier became a duplicate that never received its rows. Only
   * controls are levels; everything else that mentions the level is decoration.
   */
  private _levelNodes(container: Element): any[] {
    const carriers = [...container.querySelectorAll<HTMLElement>("[data-level]")].filter(
      (el) => el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement
    );

    // A level declared twice (visible box + hidden value) belongs to its carrier only;
    // keep the first one so the document order of the levels is preserved.
    const seen = new Set<string>();
    return carriers.filter((el) => {
      const level = el.dataset.level ?? "";
      if (seen.has(level)) return false;
      seen.add(level);
      return true;
    });
  }

  /**
   * Initializes the address builder by mapping DOM elements to the internal schema,
   * setting up adapters, and triggering the initial data load.
   *
   * @returns {void}
   * @throws {Error} If the API URL is missing, container is invalid, or a specified adapter is not found.
   *
   * @example
   * const picker = new IdAddressBuilder({ url: '...', container: '#form' });
   * picker.init();
   *
   * @description
   * This method performs the core setup: it validates configuration, identifies target
   * DOM nodes (or creates virtual ones for headless mode), initializes UI adapters
   * for each level, links levels into a cascade chain, and starts the root data fetch.
   */
  init(): void {
    // Step 1: Prevent multiple initializations.
    if (this._initialized) {
      console.warn("IdAddressBuilder already initialized.");
      return;
    }

    // The package ships its own state sheet (loading/error on the controls it decorates).
    // A host that declares no loader simply gets the unstyled states — never a crash.
    void ensureStylesheet("./id-address.css").catch(() => null);

    this._initialized = true;
    this._destroyed = false;

    // Step 2: Validate required configuration and resolve container element.
    // console.log("IdAddressBuilder initialized.");
    let containerEl = null;

    // A data source is required; a URL is only one of the three ways to provide one.
    if (!this.config.url && !this.config.service && typeof this.config.loader !== "function") {
      throw new Error("[IdAddressBuilder] a loader, service or url is required");
    }

    if (typeof this.config.container === "string") {
      containerEl = document.querySelector(this.config.container);
    } else if (this.config.container instanceof HTMLElement) {
      containerEl = this.config.container;
    } else {
      throw new Error("Invalid Type Container");
    }

    if (!containerEl) {
      throw new Error("[IdAddressBuilder] container not found");
    }

    this.containerEl = containerEl as HTMLElement;

    // Step 3: Identify input nodes based on headless or UI mode.
    let nodes = [];

    if (!this.config.headless) {
      nodes = this._levelNodes(containerEl);
    } else {
      this.config.useAdapter = "base";
      nodes = this._levelOrder.map((level) => ({
        dataset: {
          level,
        },
        __virtual: true,
      }));
    }

    // Step 4: Map nodes to schema objects and initialize adapters.
    this.schema = nodes.map((el: any, index: number) => {
      const adapterName = this.config.useAdapter;
      const adapter = this.adapters[adapterName as string] ?? (this.config.headless ? this.adapters.base : this.adapters.native);

      if (!adapter) throw new Error(`[Adapter '${adapterName}' not found]`);
      // @ts-ignore
      const name = el.dataset.level;
      const isDropdown = name === "kodepos" ? false : true;
      // expose flag for adapters if needed
      //@ts-ignore
      el.__isDropdown = isDropdown;

      adapter.init?.(el/* , name */);

      // Allow adapter to bind its per-element change listener once (it should call el.__onLevelChange stored later)
      adapter.onLevelChange?.(el);

      const schemaRef = {
        el,
        name,
        adapterName,
        adapter,
        isDropdown,
        getDetail: () => this.detail,
        next: null,
        index,
        load: (parentId: string | undefined = undefined, selectedValue = null) => {
          return this._loadLevel(schemaRef, parentId, selectedValue);
        },
        select: async () => { },
      };

      return schemaRef;
    });

    // console.log("Schema:", this.schema);
    // console.log("Nodes:", nodes);

    // Step 5: Link schema levels sequentially to enable cascading updates.
    this.schema.forEach((schema, i) => {
      schema.next = this.schema[i + 1] ?? null;
    });

    // Step 6: Wire internal event listeners for cross-adapter communication.
    this._bindInternalEvents();

    // Step 7: Trigger the initial data load for the root level (Propinsi).
    this._loadLevel(this.schema[0], undefined, null).catch((e) => {
      this._throwError(this.schema[0], "Error loading root level:", e);
    });

    // Step 8: Attach specific input listeners for the postal code (kodepos) field.
    const kodeposSchema = this.schema.find((s) => s.name === "kodepos");
    if (kodeposSchema) this._bindKodeposInputListener(kodeposSchema);
  }

  /**
   * Tears down the instance by aborting network requests, removing event listeners,
   * and cleaning up DOM references to prevent memory leaks.
   *
   * @returns {void}
   *
   * @example
   * const picker = new IdAddressBuilder({ ... });
   * picker.init();
   * // later...
   * picker.destroy();
   *
   * @description
   * This method performs a comprehensive cleanup: it flags the instance as destroyed,
   * aborts all pending fetch requests via AbortControllers, iterates through the
   * schema to remove DOM event listeners (including custom kodepos handlers),
   * invokes adapter-specific destroy logic, and resets internal state variables.
   */
  destroy(): void {
    // Step 1: Prevent redundant destruction calls.
    if (this._destroyed) return;

    console.log("Destroying IdAddressBuilder...");
    this._destroyed = true;
    this._initialized = false;


    // Only close what we opened: a shared service belongs to the application.
    if (this.#ownsHttp) this.#http?.destroy();
    this.#http = null;

    // Step 3: Iterate through schema levels to clean up DOM and adapters.
    for (const schema of this.schema) {
      try {
        const { el, adapter } = schema;

        // Step 4: Remove specific kodepos change listener if attached.
        if (el?.__kodeposHandler) {
          el.removeEventListener("change", el.__kodeposHandler);
          el.removeEventListener("input", el.__kodeposHandler);
          delete (el as any).__kodeposHandler;
        }

        // Step 5: Delete internal reference flags and trigger adapter-level cleanup.
        delete (el as any).__onLevelChange;
        delete (el as any).__isDropdown;
        adapter?.destroy?.(el/* , schema */);
      } catch (err) {
        console.error(`Destroy failed for schema '${schema?.name}':`, err);
      }
    }

    // Step 6: Reset internal state and references to free memory.
    this.schema = [];
    this._listeners = {};
    this._detail = {};
    this.containerEl = null;

    console.log("IdAddressBuilder destroyed.");
  }

  /**
   * Binds a change listener to the postal code (kodepos) input field to handle
   * manual entry and trigger reverse-lookup of administrative levels.
   *
   * @param {Object} schema - The schema reference object for the 'kodepos' level.
   * @returns {void}
   *
   * @example
   * const kodeposSchema = picker.schema.find(s => s.name === 'kodepos');
   * picker._bindKodeposInputListener(kodeposSchema);
   *
   * @description
   * This method attaches an asynchronous listener to the kodepos element on both
   * `change` (commit via blur/Enter, any format) and `input` (live typing — fires
   * as soon as the code looks complete, i.e. 5 digits, without waiting for blur).
   * When a user enters a postal code, it clears previous errors, updates the internal
   * detail state, fetches the full administrative hierarchy (Propinsi to Kelurahan)
   * associated with that code, and triggers a cascading update of all UI dropdowns.
   * Each distinct code is processed once, and a newer lookup supersedes an
   * in-flight older one (staleness token) so rapid retyping cannot interleave.
   */
  _bindKodeposInputListener(schema: IdAddressSchemaRef): void {
    const { el, name: level } = schema;

    // Step 1: Ensure we are not in headless mode before attaching DOM listeners.
    if (!this.config.headless) {
      // Step 2: Remove existing handlers to prevent duplicate event execution.
      el.removeEventListener("change", el.__kodeposHandler);
      el.removeEventListener("input", el.__kodeposHandler);

      // Dedupe memory: `input` and `change` (blur/Enter) both commit the same
      // value — each distinct kodepos is processed exactly once.
      let lastProcessed: string | null = null;

      el.__kodeposHandler = async (e: any) => {
        // Step 3: Guard against programmatic changes or empty values.
        if (this._skipChangeListener) return;

        const inputHasError = el.parentElement?.querySelector(".error");
        if (inputHasError) inputHasError.classList.remove("error");

        const kodeposValue = String(e.target?.value ?? "").trim();
        if (!kodeposValue) return;

        // Step 4: React instantly while typing — no need to wait for blur.
        // Fire on `input` as soon as the code looks complete (5 digits);
        // `change` remains the fallback for any other format on commit.
        if (e.type === "input" && !/^\d{5}$/.test(kodeposValue)) return;

        // Step 5: Skip when this exact code was already processed.
        if (kodeposValue === lastProcessed) return;
        lastProcessed = kodeposValue;

        // Step 6: Stamp this run so a newer lookup can supersede an in-flight one.
        const runId = ++this._kodeposRunId;

        // Step 7: Update internal state with the raw input value and notify listeners.
        const kodepos = { [`${level}_name`]: Number(kodeposValue) } as IdAddressDetail;
        this._setDetail(kodepos, true);
        this.__emitChange("onLevelChanged", {
          schema,
          data: kodepos,
          state: "complete",
        });

        // Step 7b: Retire the visible chain before the round trip. The address on
        // screen belongs to the previous code, so it is cleared and flagged as
        // loading now; `_updateLevelsByKodepos` refills it top-down afterwards.
        this._setLevelsState("loading");

        try {
          // Step 8: Fetch full administrative details based on the postal code.
          const detail = await this.getDetailByKodepos(kodeposValue, this.config.geocode);

          // Step 9: Drop stale results when a newer lookup superseded this run.
          if (runId !== this._kodeposRunId || this._destroyed) return;

          if (!detail || !detail[0]) {
            throw new Error("Kodepos not found");
          }

          // Step 10: Sync the internal ID for the postal code.
          this._setDetail({ [`${level}_id`]: detail[0][`${level}_id`] } as IdAddressDetail);

          // Step 11: Emit geocode data if the feature is enabled in config.
          if (this.config.geocode) {
            this.__emitChange("onGeocodeLoaded", { schema, data: detail[0], state: "complete" });
          }

          // Step 12: Trigger recursive UI updates for all parent levels (reverse-fill).
          await this._updateLevelsByKodepos(detail[0], runId);
        } catch (error) {
          // Step 13: Handle lookup failures via the error reporting system.
          if (runId !== this._kodeposRunId) return; // stale run — keep the newest error state
          lastProcessed = null; // allow retrying the same code after a failed lookup
          // Nothing will be filled: hand the levels back instead of leaving them spinning.
          this._settleLevels(runId);
          this._throwError(
            schema,
            "Failed lookup detail from kodepos",
            error instanceof Error ? error : new Error(String(error))
          );
        }
      };

      // Step 14: Attach the prepared handler — `change` for commit, `input` for live typing.
      el.addEventListener("change", el.__kodeposHandler);
      el.addEventListener("input", el.__kodeposHandler);
    }
  }

  /**
   * Recursively loads administrative data for a specific level, handles UI state transitions,
   * and manages cascading updates between parent and child levels.
   *
   * @param {IdAddressSchemaRef} levelSchema - The schema reference object for the level to be loaded.
   * @param {number|string|null} [parentId=null] - The ID of the parent level used to filter results.
   * @param {number|null} [selectedValue=null] - An optional ID to automatically select after loading.
   * @returns {Promise<void>} A promise that resolves when the level and its immediate UI state are updated.
   * @throws {Error} If data fetching fails or if a required parent ID is missing for non-root levels.
   *
   * @example
   * const kotaSchema = picker.schema.find(s => s.name === 'kota');
   * await picker._loadLevel(kotaSchema, 11); // Loads cities for Propinsi ID 11
   *
   * @description
   * This method manages the lifecycle of a level load: it triggers "start" events for UI loaders,
   * fetches data from the API or cache, handles empty states, and defines the `onLevelChange`
   * logic that allows child levels to react when this level's value changes.
   */
  async _loadLevel(levelSchema: IdAddressSchemaRef, parentId: string | number | undefined = undefined, selectedValue = null): Promise<void> {
    // Step 1: Exit early if the instance has been destroyed.
    if (this._destroyed) return;

    if (!levelSchema) return;

    const level = levelSchema.name;

    // Step 2: Validate that non-root levels have a parentId or a programmatic selection.
    if (level !== "propinsi" && !parentId && selectedValue == null) {
      return;
    }

    // Step 3: Notify listeners that loading has started to trigger UI spinners.
    this.__emitChange("onLevelLoaded", {
      schema: levelSchema,
      data: [],
      state: "start",
      complete: (s: any = "start") => s,
    });

    let options = [];
    try {
      // Step 4: Fetch regional data from cache or remote API.
      options = await this.getRegionalData({ level, parentId } as IdAddressQuery);
      if (this._destroyed) return;
      if (!options) throw new Error(`Failed to fetch ${level}`);

      // Step 5: Special handling for kodepos to sync detail state immediately.
      if (level === "kodepos") {
        this.__emitChange("onLevelChanged", {
          schema: levelSchema,
          data: { ...options[0] },
          state: "complete",
          complete: () => "complete",
        });
      }
    } catch (error) {
      this._throwError(levelSchema, `Failed to fetch ${level}:`, error instanceof Error ? error : new Error(String(error)));
      return;
    }

    // Step 6: Handle cases where no data is returned for the given parent.
    if (!options || options.length === 0) {
      this.__emitChange("onLevelLoaded", {
        schema: levelSchema,
        data: [],
        state: "empty",
        complete: () => "empty",
        onLevelChange: undefined,
      });
      return;
    }

    // Step 7: Define the callback for when a user selects an item in this level.
    const onLevelChangeFn = async (selectedParent: Partial<IdAddressDetail>) => {
      try {
        if (!selectedParent) {
          // Step 8: If selection is cleared, reset all descendant levels.
          this.clearNextLevel(level, true);
          this.__emitChange("onLevelChanged", {
            schema: levelSchema,
            data: {},
            state: "complete",
            complete: () => "complete",
          });
          return;
        }

        // Step 9: Update internal state and trigger the next level load if not in silent mode.
        if (!this._skipChangeListener) {
          this.clearNextLevel(level);
          this.__emitChange("onLevelChanged", {
            schema: levelSchema,
            data: { ...selectedParent },
            state: "complete",
            complete: () => "complete",
          });

          await this._loadLevel(levelSchema.next!, (selectedParent)[level + "_id" as IdAddressDetailKey] as any);

          // Step 10: Perform geocode lookup if the next level is kodepos and feature is enabled.
          if (levelSchema.next?.name === "kodepos" && this.config.geocode) {
            const geo = await this.getGeocodeLocation(levelSchema.getDetail());
            if (this._destroyed) return;
            this.__emitChange("onGeocodeLoaded", { schema: levelSchema, data: geo, state: "complete" });
          }
        }
      } catch (error) {
        this._throwError(
          levelSchema,
          "Error during cascade onChange",
          error instanceof Error ? error : new Error(String(error))
        );
      }
    };

    levelSchema.select = onLevelChangeFn;

    // Step 11: Notify listeners that data is ready and provide the change handler.
    this._loadedLevels.add(level);
    this.__emitChange("onLevelLoaded", {
      schema: levelSchema,
      data: options,
      state: "complete",
      complete: () => "complete",
      onLevelChange: onLevelChangeFn as () => void | Promise<void>,
    });

    // Step 12: If a specific value was requested programmatically, trigger the selection event.
    if (selectedValue != null) {
      this.__emitChange("onLevelChanged", {
        schema: levelSchema,
        data: { [`${level}_id`]: selectedValue },
        state: "complete",
        complete: () => "complete",
      });
    }
  }

  /**
   * Synchronizes all administrative dropdowns based on a provided detail object,
   * typically used for reverse-filling the form from a postal code lookup.
   *
   * @param {Object} detail - An object containing the full administrative hierarchy (IDs and names).
   * @returns {Promise<void>} A promise that resolves when all levels have been updated.
   *
   * @example
   * const detail = await picker.getDetailByKodepos('12345');
   * await picker._updateLevelsByKodepos(detail[0]);
   *
   * @description
   * This method iterates through the schema levels, identifies the correct parent IDs
   * from the detail object, and triggers a silent load for each level. It uses a
   * `_skipChangeListener` flag to prevent the standard cascading logic from
   * interfering with the manual synchronization process. A `runId` staleness token
   * lets a newer kodepos lookup abandon the remainder of an older, still-running fill.
   * @param {Object} [detail={}] - The full address detail resolved from the kodepos lookup.
   * @param {number} [runId] - Token of the lookup run that triggered this fill; omit
   *   for programmatic calls to keep the unconditional `_skipChangeListener` release.
   */
  async _updateLevelsByKodepos(detail = {}, runId?: number) {
    // Step 1: Enable silent mode to prevent recursive change listeners from firing.
    this._skipChangeListener = true;
    try {
      // Step 2: Iterate through each level defined in the schema.
      for (const schemaItem of this.schema) {
        // Step 2a: A newer kodepos lookup superseded this run — abandon the stale fill.
        if (runId !== undefined && runId !== this._kodeposRunId) return;

        const level = schemaItem.name;
        let selectedValue = (detail as IdAddressDetailKey)[level + "_id" as any] as any;

        // Step 3: Skip levels that do not have corresponding data in the detail object.
        if (!selectedValue) continue;

        // Step 4: Only process dropdown levels (Propinsi to Kelurahan).
        if (schemaItem.isDropdown) {
          // Step 5: Identify the parent level and its ID to fetch the correct options list.
          const parentLevel = this._getRelatedLevel(level, false);
          const parentId = (detail as IdAddressDetailKey)[`${parentLevel}_id` as any];

          try {
            // Step 6: Update the internal state with the specific level's data.
            this._setDetail({
              [level + "_id"]: (detail as IdAddressDetail)[level + "_id" as IdAddressDetailKey],
              [level + "_name"]: (detail as IdAddressDetail)[level + "_name" as IdAddressDetailKey],
            } as IdAddressDetail);
            // Step 7: Load the options for this level and programmatically set the selected value.
            await this._loadLevel(schemaItem, parentId, selectedValue);
          } catch (error) {
            // Step 8: Log and handle errors specific to this level's update.
            this._throwError(
              schemaItem,
              "Error during reverse-fill by kodepos",
              error instanceof Error ? error : new Error(String(error))
            );
          } finally {
            // Step 9: Reset the local selectedValue reference.
            selectedValue = null;
          }
        }
      }
    } finally {
      // Step 10: Restore normal event listener behavior — but only when this is
      // still the newest run; an older fill must not flip the flag back while a
      // newer kodepos lookup is mid-fill (shared-flag race protection).
      if (runId === undefined || runId === this._kodeposRunId) {
        this._skipChangeListener = false;
        // Step 11: Levels the detail object had no id for are still flagged as
        // loading from `_setLevelsState`; release them once the fill is done.
        this._settleLevels(runId);
      }
    }
  }

  /**
   * Handles error reporting by logging to the console and delegating UI state
   * updates to the appropriate adapter.
   *
   * @param {Object} schema - The schema reference object for the level where the error occurred.
   * @param {string} message - A descriptive error message.
   * @param {Error|null} [error=null] - The original error object, if available.
   * @returns {void}
   *
   * @example
   * picker._throwError(kotaSchema, "Failed to load cities", new Error("Network Timeout"));
   *
   * @description
   * This method centralizes error handling. It logs a formatted error to the console,
   * then attempts to call the `onError` method of the level's UI adapter to show
   * visual feedback. If the adapter fails or doesn't implement the method, it
   * applies a fallback CSS class to the element.
   */
  _throwError(schema: IdAddressSchemaRef, message: string, error: Error | null = null) {
    // Step 1: Log the error details to the console for debugging.
    console.error(`[${schema?.name ?? "unknown"}] ❌`, message, error);

    // Step 2: Exit if no schema is provided to identify the target element.
    if (!schema) return;

    const { el, adapter } = schema;

    // Step 3: Attempt to delegate the error UI state to the registered adapter.
    if (adapter?.onError) {
      try {
        adapter.onError(el, message);
        return;
      } catch (err) {
        // Step 4: Log a warning if the adapter's error handler fails.
        console.warn("adapter.onError failed:", err);
      }
    }

    // Step 5: Apply a fallback 'error' class to the element if the adapter was unavailable.
    el.classList.add("error");
  }

  /**
   * Clears the values and UI states of all administrative levels following a specified level.
   *
   * @param {IdAddressLevel} level - The name of the level from which to start clearing (e.g., 'propinsi').
   * @param {boolean} [refresh=false] - If true, also clears the data for the current level itself.
   * @returns {void}
   *
   * @example
   * // Clears Kota, Kecamatan, Kelurahan, and Kodepos when Propinsi changes
   * picker.clearNextLevel('propinsi');
   *
   * @description
   * This method manages the reset logic for the cascading dropdowns. It identifies the starting
   * point in the schema, optionally nullifies the current level's data, and then iterates
   * through all subsequent levels to reset their internal state and trigger the UI
   * adapter's `clear` method to update the DOM.
   */
  clearNextLevel(level: IdAddressDetailKey, refresh = false): void {
    // Step 1: Locate the schema definition for the starting level.
    const schema = this.schema.find((s) => s.name === level);

    // Step 2: If refresh is requested, nullify the current level's data in the detail object.
    if (refresh) this._setDetail({ [`${level}_id`]: null, [`${level}_name`]: null } as IdAddressDetail);

    let nextLevelSchema = schema?.next;

    // Step 3: Prevent clearing if the builder is currently in a silent update state.
    if (this._skipChangeListener) return;

    // Step 4: Iterate through the linked list of schema levels.
    while (nextLevelSchema) {
      // Step 5: Reset the data for the next level in the internal state.
      this._setDetail({ [`${nextLevelSchema.name}_id`]: null, [`${nextLevelSchema.name}_name`]: null } as IdAddressDetail);

      // Step 6: Invoke the UI adapter's clear method to reset the DOM element (e.g., empty dropdown).
      nextLevelSchema.adapter.clear?.(nextLevelSchema.el);

      // Step 7: Move to the next level in the chain.
      nextLevelSchema = nextLevelSchema.next;
    }
  }

  /**
   * Puts every dropdown level into, or out of, the loading state without touching
   * which level is loading next.
   *
   * @param state - `"loading"` clears the current rows and flags the level busy;
   *   `"idle"` only drops the busy marker so the level shows its placeholder again.
   *
   * @example
   * picker._setLevelsState("loading"); // kodepos typed — old address must go
   *
   * @description
   * A kodepos change invalidates the entire chain above it, but resolving the new
   * hierarchy costs a round trip. Without this step the previous province, city and
   * district stay on screen looking valid while the new ones are being fetched — the
   * user reads a complete address that does not belong to the code they just typed.
   * Clearing them up front (and saying "loading" while doing it) makes that gap
   * honest; `_updateLevelsByKodepos` then refills the chain top-down, so each level
   * swaps its spinner for real rows in the order the user reads them.
   */
  _setLevelsState(state: "loading" | "idle"): void {
    for (const item of this.schema) {
      // Step 1: The kodepos input itself holds the value being typed — never touch it.
      if (!item.isDropdown) continue;

      // Step 2: Drop the stale selection from the internal detail state and from
      // the "what has rendered" tally this run.
      this._setDetail({ [`${item.name}_id`]: null, [`${item.name}_name`]: null } as IdAddressDetail);
      this._loadedLevels.delete(item.name);

      if (state === "loading") {
        // Step 3a: Reuse the normal load event, so whichever adapter is installed
        // renders its own spinner; a leftover handler must not fire from a dying row.
        this.__emitChange("onLevelLoaded", {
          schema: item,
          data: [],
          state: "start",
          complete: () => "start",
        });
        delete (item.el as any).__onLevelChange;
      } else {
        // Step 3b: Back to the plain placeholder, no options, no spinner.
        item.adapter.clear?.(item.el);
      }
    }
  }

  /**
   * Releases the dropdown levels a kodepos fill never got to.
   *
   * @param runId - Token of the fill that asked, so an older run cannot un-load
   *   levels a newer one is still filling (omit for programmatic calls).
   *
   * @example
   * picker._settleLevels(runId); // after _updateLevelsByKodepos finished
   *
   * @description
   * The endpoint answers with the hierarchy it knows; a parent without districts
   * leaves `kecamatan` — and everything under it — with no rows. Those levels were
   * flagged loading by `_setLevelsState("loading")` and would otherwise keep the
   * "Loading …" placeholder forever, so anything that did not actually render goes
   * back to its idle placeholder. Membership is decided by `_loadedLevels`, not by
   * the detail object: an empty level is still recorded in the detail.
   */
  _settleLevels(runId?: number): void {
    if (runId !== undefined && runId !== this._kodeposRunId) return;

    for (const item of this.schema) {
      if (!item.isDropdown) continue;
      if (this._loadedLevels.has(item.name)) continue;
      item.adapter.clear?.(item.el);
    }
  }

  // Public access API especially for headless usage
  async loadNextLevel(level: IdAddressLevel, parentId: string | number | undefined, selectedValue = null) {
    const schema = this.schema.find((s) => s.name === level);
    if (!schema) {
      throw new Error(`Level '${level}' not found`);
    }
    return this._loadLevel(schema, parentId, selectedValue);
  }

  // ============================
  // 📬 DATA FETCHERS
  // ============================

  /**
   * Retrieves administrative regional data either from the local cache or by calling the remote API.
   *
   * @param {IdAddressQuery} [query={}] - The query parameters for the data request.
   * @returns {Promise<Array|Object>} A promise that resolves to the requested regional data.
   * @throws {Error} If the API request fails or cache retrieval encounters a critical error.
   *
   * @example
   * const cities = await picker.getRegionalData({ level: 'kota', parentId: 11 });
   *
   * @description
   * This method acts as a data proxy. It generates a unique cache key based on the query parameters,
   * checks if valid data exists in `localStorage`, and if not, performs a network fetch.
   * To ensure a consistent UI experience, it introduces a configurable artificial delay
   * when serving data from the cache.
   */
  async getRegionalData(query: IdAddressQuery): Promise<any> {
    // A caller-supplied loader is a dry data source: no transport, no cache, no URL.
    if (typeof this.config.loader === "function") {
      return this.config.loader(query);
    }

    return this._fetchAPI(query);
  }

  /**
   * Fetches comprehensive administrative details and optional geolocation data
   * based on a specific postal code.
   *
   * @param {string|number} kodepos - The postal code to look up.
   * @param {boolean} [location=false] - Whether to include latitude and longitude in the response.
   * @returns {Promise<Array<Object>>} A promise that resolves to an array containing the address hierarchy.
   * @throws {Error} If the network request fails or the postal code is not found.
   *
   * @example
   * const details = await picker.getDetailByKodepos('12345', true);
   * console.log(details[0].propinsi_name); // "DKI Jakarta"
   *
   * @description
   * This method serves as a high-level wrapper around `getRegionalData`. It specifically
   * requests the 'detail' level, which triggers the API to return the full
   * administrative chain (Province down to Kelurahan) associated with the provided
   * postal code, rather than just a list of options for a single level.
   */
  async getDetailByKodepos(kodepos: string, location: boolean = false): Promise<any> {
    // Step 1: Delegate the request to the central regional data fetcher with specific detail parameters.
    const data = await this.getRegionalData({ level: "detail", kodepos: String(kodepos), location });

    // Step 2: Return the resulting data array (usually containing one match).
    return data;
  }

  /**
   * Fetches geographic coordinates (latitude and longitude) for a specific address hierarchy.
   *
   * @param {Object} [detail={}] - An object containing administrative names (propinsi_name, kota_name, etc.).
   * @returns {Promise<Object>} A promise that resolves to an object containing geocode data.
   * @throws {Error} If the API request fails or the network times out.
   *
   * @example
   * const detail = picker.detail;
   * const geo = await picker.getGeocodeLocation(detail);
   * console.log(geo.latitude, geo.longitude);
   *
   * @description
   * This method maps the internal address detail state to a set of query parameters
   * required by the geocoding service. It performs a network fetch via the central
   * `_fetchAPI` method using the 'geocode' level, which triggers the backend to
   * resolve the text-based address into spatial coordinates.
   */
  async getGeocodeLocation(detail: IdAddressDetail): Promise<Partial<IdAddressDetail>> {
    // Step 1: Map the administrative detail names to the API parameter schema.
    const params = {
      kodepos: detail.kodepos_name,
      kelurahan: detail.kelurahan_name,
      kecamatan: detail.kecamatan_name,
      kota: detail.kota_name,
      propinsi: detail.propinsi_name,
    };

    // Step 2: Execute the API request with the geocode level and mapped parameters.
    const data = await this._fetchAPI({ level: "geocode", ...params } as IdAddressQuery);

    // Step 3: Return the resulting coordinate data.
    return data;
  }

  /**
   * Retrieves the current administrative detail state, filtering out null values.
   *
   * @returns {Object} An object containing the current address details (IDs and names).
   *
   * @example
   * const currentAddress = picker.detail;
   * console.log(currentAddress.propinsi_name);
   *
   * @description
   * How it works: The getter iterates through the internal `_detail` object. It uses
   * `Object.hasOwn` to ensure only instance properties are processed, and it
   * deletes any keys that have a value of `null` to provide a clean, active state
   * representation of the selected address.
   */
  get detail(): Partial<IdAddressDetail> {
    // Step 1: Iterate through all keys in the internal detail storage.
    for (const key in this._detail) {
      // Step 2: Ensure the property belongs to the object itself, not the prototype.
      if (!Object.hasOwn(this._detail, key)) continue;
      // Step 3: Remove keys with null values to keep the returned object clean.
      if (this._detail[key as IdAddressDetailKey] === null) {
        delete this._detail[key as IdAddressDetailKey];
      }
    }
    // Step 4: Return the sanitized detail object.
    return this._detail;
  }

  /**
   * Updates the internal address detail state with new values, optionally resetting the state first.
   *
   * @param {Object} value - An object containing address detail keys (e.g., propinsi_id, kota_name).
   * @param {boolean} [refresh=false] - If true, clears the existing detail state before merging the new value.
   * @returns {void}
   * @throws {TypeError} If the provided value fails the `_isIAddressDetail` validation.
   *
   * @example
   * builder._setDetail({ propinsi_id: 31, propinsi_name: 'DKI Jakarta' });
   * builder._setDetail({ kodepos_name: 12345 }, true); // Resets other fields
   *
   * @description
   * This method serves as the central state manager for the selected address. It validates the
   * input against a strict schema of allowed keys and types, handles the merging of new data
   * into the existing `_detail` object, and supports a "refresh" mode to start with a clean slate.
   */
  _setDetail(value: Partial<IdAddressDetail>, refresh: boolean = false): void {
    // Step 1: Validate the input object structure and data types.
    if (!_isIAddressDetail(value)) {
      throw new TypeError("Invalid value: expected an IAddressDetail-like object");
    }

    // Step 2: If refresh is requested, wipe the current internal state.
    if (refresh) {
      this._detail = {};
    }

    // Step 3: Merge the validated values into the current detail state.
    this._detail = { ...this.detail, ...value };
  }

  /**
   * Performs a network request to the configured API endpoint with automatic timeout and abort handling.
   *
   * @param {IdAddressQuery} [query={}] - Key-value pairs to be appended as URL search parameters.
   * @param {RequestInit} [options={}] - Standard fetch options (method, headers, etc.).
   * @param {number} [timeout=10000] - Maximum time in milliseconds to wait before aborting the request.
   * @returns {Promise<any>} A promise that resolves to the 'data' property of the successful JSON response.
   * @throws {Error} If the request times out, returns a non-2xx status, or the JSON payload indicates failure.
   *
   * @example
   * const data = await picker._fetchAPI({ level: 'propinsi' });
   *
   * @description
   * This method wraps the native `fetch` API with a lifecycle management system. It creates an
   * `AbortController` for every request, registers it in an internal set for cleanup during
   * instance destruction, and sets a timer to trigger an abort if the server doesn't respond
   * within the specified window. It also normalizes the API response format.
   */
  /**
   * Requests one level through the HTTP service.
   *
   * The builder used to own a transport (fetch + AbortController + timeout + its own
   * localStorage cache), which meant a second, slightly different HTTP stack inside a
   * form component. `HttpService` already does all of it, so this is a thin adapter: it
   * forwards the query and unwraps the response envelope the registry returns
   * (`{ success, data, meta }` → `data`).
   *
   * @param query - Level query (`{ level, parentId }`, `{ level: "kodepos" }`, …).
   * @returns The rows of that level, or `undefined` when the instance is destroyed.
   */
  async _fetchAPI(query: IdAddressQuery): Promise<any> {
    if (this._destroyed) return;

    // Fail loudly and locally: an empty `url` would otherwise send a request to "" and
    // surface as a mysterious network error.
    if (!this.config.service && !this.config.url) {
      throw new Error(
        "[IdAddress] No data source configured. Pass a `loader` (preferred), a `service`, " +
        "or a `url` when constructing the picker."
      );
    }

    const envelope = await this.#httpService().get(query as Record<string, any>);
    return envelope && typeof envelope === "object" && "data" in envelope ? envelope.data : envelope;
  }

  /**
   * The HTTP service this picker talks through.
   *
   * Built once from `config.service`, or from `url` + `cache` when none was injected.
   *
   * @returns The service instance.
   */
  #httpService(): HttpService {
    if (!this.#http) {
      this.#ownsHttp = !this.config.service;
      this.#http = this.config.service ?? new HttpService({
        url: this.config.url ?? "",
        cacheEnabled: this.config.cache?.enabled ?? true,
        cacheTtlDays: this.config.cache?.ttlDays ?? 1,
        cachePrefix: this.config.cache?.prefix ?? "IdAddressBuilder",
        delay: this.config.cache?.delay ?? 0,
        timeout: this.config.cache?.timeout ?? 10000,
      } as iHttpServiceConfig);
    }
    return this.#http;
  }

  /**
   * Retrieves the name of the administrative level immediately preceding or following a given level.
   *
   * @param {IdAddressLevel} level - The reference level name (e.g., 'kota').
   * @param {boolean} [next=true] - If true, returns the child level; if false, returns the parent level.
   * @returns {string|null} The name of the related level, or null if the boundary is reached or level is invalid.
   *
   * @example
   * const parent = builder._getRelatedLevel('kota', false); // returns 'propinsi'
   * const child = builder._getRelatedLevel('kota', true);   // returns 'kecamatan'
   *
   * @description
   * How it works: The method looks up the index of the provided level within the `_levelOrder` array.
   * It then calculates the target index by adding or subtracting 1 based on the `next` flag.
   * Finally, it returns the value at that index if it falls within the array bounds.
   */
  _getRelatedLevel(level: IdAddressDetailKey, next: boolean = true): string | null {
    // Step 1: Find the current position of the level in the hierarchy array.
    const index = this._levelOrder.indexOf(level);

    // Step 2: Calculate the target index based on the direction (next or previous).
    const targetIndex = index + (next ? 1 : -1);

    // Step 3: Verify the level exists and the target index is within valid array boundaries.
    const isValid = index >= 0 && targetIndex >= 0 && targetIndex < this._levelOrder.length;

    // Step 4: Return the related level name or null if out of bounds.
    return isValid ? this._levelOrder[targetIndex] : null;
  }

  // ============================
  // ⚡ EVENT SYSTEM
  // ============================

  /**
   * Binds internal event listeners to the builder's event system to coordinate
   * communication between the data logic and UI adapters.
   *
   * @returns {void}
   *
   * @example
   * this._bindInternalEvents();
   *
   * @description
   * This method sets up the core reactive loop of the builder. It listens for
   * `onLevelLoaded` to trigger UI updates (populating dropdowns) and
   * `onLevelChanged` to synchronize the internal state and handle programmatic
   * selection updates across different adapters.
   */
  _bindInternalEvents(): void {
    // Step 1: Register the internal listener for the 'onLevelLoaded' event.
    this.__on("onLevelLoaded", (schema, data, complete, rest) => {
      // Step 2: Guard against execution if the instance is destroyed.
      if (this._destroyed) return;

      try {
        // Step 3: Extract the element and adapter from the schema.
        const { el, adapter } = schema as IdAddressSchemaRef;
        const onLevelChange = rest?.onLevelChange;

        // Step 4: Delegate the UI update to the adapter's setOptions method.
        adapter.setOptions?.(el, {
          options: data as any,
          state: complete(),
          onLevelChange,
        });
      } catch (err) {
        console.error("onLevelLoaded handler failed:", err);
      }
    });

    // Step 5: Register the internal listener for the 'onLevelChanged' event.
    this.__on("onLevelChanged", (schema, data) => {
      // Step 6: Guard against execution if the instance is destroyed.
      if (this._destroyed) return;

      try {
        // Step 7: Extract element, adapter, and level name from the schema.
        const { el, adapter, name: level } = schema as IdAddressSchemaRef;

        // Step 8: Update the internal detail object unless in silent mode.
        if (!this._skipChangeListener) {
          this._setDetail(data as IdAddressDetail);
        }

        // Step 9: If data contains an ID and it's a dropdown, sync the UI selection.
        if ((data as IdAddressDetail)?.[`${level}_id` as IdAddressDetailKey] && el.__isDropdown) {
          adapter.setSelectedOption?.(el, (data as IdAddressDetail)[`${level}_id` as IdAddressDetailKey] as string);
        }
      } catch (err) {
        console.error("onLevelChanged handler failed:", err);
      }
    });
  }

  /**
   * Registers an event handler in the builder's internal listener registry.
   *
   * @param {string} event - Internal event name to subscribe to.
   * @param {IdAddressEventHandler} handler - Callback invoked when the event is emitted.
   * @returns {void} Does not return a value; it stores the handler in `_listeners`.
   * @throws {void} This method does not throw; invalid handlers will fail later when emitted.
   *
   * @example
   * builder.__on('onLevelLoaded', (schema, data, complete) => {
   *   console.log(schema.name, complete(), data);
   * });
   *
   * @description
   * How it works: the method creates an array for the event name if one does not exist,
   * then appends the callback so `__emitChange` can call it later.
   */
  __on(event: string, handler: IdAddressEventHandler) {
    // Step 1: Create the listener bucket for this event if it has not been registered before.
    if (!this._listeners[event]) this._listeners[event] = [];

    // Step 2: Store the handler in registration order for future emits.
    this._listeners[event].push(handler);
  }

  /**
   * Emits one internal builder event to all registered listeners.
   *
   * @param {string} event - Internal event name to emit.
   * @param {IdAddressEventArgs} [args={}] - Event payload and lifecycle metadata.
   * @returns {void} Does not return a value; listeners receive the normalized event arguments.
   * @throws {void} Listener errors are caught and logged so one failing callback does not stop the rest.
   *
   * @example
   * builder.__emitChange('onLevelChanged', {
   *   schema: builder.schema[0],
   *   data: { propinsi_id: 31 },
   *   state: 'complete',
   * });
   *
   * @description
   * How it works: the method normalizes event arguments, looks up all registered
   * listeners for the event, and invokes each listener with protected error handling.
   */
  __emitChange(event: string, args: IdAddressEventArgs = {}) {
    // Step 1: Normalize event arguments and preserve any extra metadata in `rest`.
    const { schema = null, data = {}, state = "start", complete = (status: "ready" | "error" | "complete" | "loading" | "start" | "empty" | undefined = state) => status, ...rest } = args || {};

    // Step 2: Resolve the listeners registered for this event.
    const listeners = this._listeners?.[event];

    // Step 3: Exit when no listener has been registered.
    if (!listeners || !listeners.length) return;

    // Step 4: Invoke each listener while isolating listener-specific failures.
    for (const fn of listeners) {
      try {
        fn(schema, data, complete, rest);
      } catch (err) {
        console.error(`[IdAddressBuilder:_emit] Listener error on '${event}':`, err);
      }
    }
  }

  /**
   * Emits both a level-specific change event and the shared `onLevelChanged` event.
   *
   * @param {IdAddressLevel} level - Administrative level name used to build the level-specific event.
   * @param {IdAddressEventArgs} fn - Event payload used for both emitted change events.
   * @returns {void} Does not return a value; it emits events and synchronizes detail state.
   * @throws {TypeError} May throw if `fn.data` is not a valid address detail object.
   *
   * @example
   * builder.__emitLevelChange('propinsi', {
   *   schema: builder.schema[0],
   *   data: { propinsi_id: 31, propinsi_name: 'DKI Jakarta' },
   *   state: 'complete',
   * });
   *
   * @description
   * How it works: the method first emits `<level>Changed` for targeted subscribers,
   * then emits the generic `onLevelChanged` event, and finally merges the payload
   * data into the builder detail state.
   */
  __emitLevelChange(level: IdAddressLevel, fn: IdAddressEventArgs): void {
    // Step 1: Notify listeners subscribed to this specific administrative level.
    this.__emitChange(`${level}Changed`, fn);

    // Step 2: Notify listeners subscribed to all level changes.
    this.__emitChange(`onLevelChanged`, fn);

    // Step 3: Synchronize the internal detail object with the emitted payload.
    this._setDetail(fn?.data as Partial<IdAddressDetail>);
  }

  // Public registration methods
  /**
   * Registers a callback that runs when a level finishes loading options or enters a loading state.
   *
   * @param {IdAddressEventHandler} fn - Listener invoked with the loaded level schema, data, state resolver, and metadata.
   * @returns {void} Does not return a value; it registers the listener.
   *
   * @example
   * builder.onLevelLoaded((schema, data, complete) => {
   *   console.log(`${schema.name}: ${complete()}`, data);
   * });
   *
   * @description
   * This is the public subscription helper for the internal `onLevelLoaded` event.
   */
  onLevelLoaded(fn: IdAddressEventHandler) {
    // Step 1: Register the callback under the shared level-loaded event name.
    this.__on("onLevelLoaded", fn);
  }

  /**
   * Registers a callback that runs after an administrative level selection changes.
   *
   * @param {IdAddressEventHandler} fn - Listener invoked with the changed level schema and selected data.
   * @returns {void} Does not return a value; it registers the listener.
   *
   * @example
   * builder.onLevelChanged((schema, data) => {
   *   console.log(schema.name, data);
   * });
   *
   * @description
   * This is the public subscription helper for the internal `onLevelChanged` event.
   */
  onLevelChanged(fn: IdAddressEventHandler) {
    // Step 1: Register the callback under the shared level-changed event name.
    this.__on("onLevelChanged", fn);
  }

  /**
   * Registers a callback that runs when geocode data has been loaded.
   *
   * @param {IdAddressEventHandler} fn - Listener invoked with the active schema and geocode payload.
   * @returns {void} Does not return a value; it registers the listener.
   *
   * @example
   * builder.onGeocodeLoaded((schema, data) => {
   *   console.log(data.latitude, data.longitude);
   * });
   *
   * @description
   * This is the public subscription helper for the internal `onGeocodeLoaded` event.
   */
  onGeocodeLoaded(fn: IdAddressEventHandler) {
    // Step 1: Register the callback under the geocode-loaded event name.
    this.__on("onGeocodeLoaded", fn);
  }

}

/**
 * Runtime type guard for IAddressDetail
 * @param {IAddressDetail} obj
 * @returns {boolean}
 */
export function _isIAddressDetail(obj: unknown): obj is IdAddressDetail {
  // 1. Validasi dasar tipe objek
  if (typeof obj !== "object" || obj === null) return false;

  // 2. Ambil semua entri kunci dan nilai objek
  const entries = Object.entries(obj);

  for (const [key, value] of entries) {
    // 3. Validasi apakah kunci terdaftar di ADDRESS_DETAIL_KEYS
    if (!ADDRESS_DETAIL_KEYS.includes(key as any)) {
      console.error(`Invalid key: "${key}" is not a valid IdAddressDetailKey.`);
      return false;
    }

    // 4. Validasi tipe nilai dari kunci tersebut
    if (!isValidAddressDetailValue(key as IdAddressDetailKey, value)) {
      console.error(`Invalid value type for key "${key}":`, value);
      return false;
    }
  }

  return true;
}

/**
 * Validates the data type of a specific address detail field based on its key name.
 *
 * @param {IdAddressDetailKey} key - The property name to validate (e.g., 'propinsi_id', 'latitude').
 * @param {any} value - The value to check against the expected type for the given key.
 * @returns {boolean} True if the value matches the expected type or is nullable; otherwise false.
 *
 * @example
 * isValidAddressDetailValue('propinsi_id', 31); // true
 * isValidAddressDetailValue('latitude', ' -6.2000'); // true
 * isValidAddressDetailValue('formatted_address', 123); // false
 *
 * @description
 * How it works: The function uses a series of conditional checks based on key suffixes or
 * exact matches. It allows null/undefined for all keys, ensures IDs and coordinates are
 * numeric (or numeric strings), and verifies that names and addresses are strings.
 */
function isValidAddressDetailValue(key: IdAddressDetailKey, value: any): boolean {
  // Step 1: Allow null or undefined values as they represent empty states.
  if (value === null || value === undefined) return true;

  // Step 2: Validate ID fields. Must be a number or a non-empty numeric string.
  if (key.endsWith("_id")) {
    return typeof value === "number" || (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value)));
  }

  // Step 3: Validate Name fields. Usually strings, but kodepos_name can be a number.
  if (key.endsWith("_name")) {
    return typeof value === "string" || (key === "kodepos_name" && typeof value === "number");
  }

  // Step 4: Validate Coordinates. Must be a number or a non-empty numeric string.
  if (key === "latitude" || key === "longitude") {
    return typeof value === "number" || (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value)));
  }

  // Step 5: Validate formatted address. Must be a string.
  if (key === "formatted_address") {
    return typeof value === "string";
  }

  // Step 6: Return false if the key does not match any known validation rules.
  return false;
}


