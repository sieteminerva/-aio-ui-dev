import type { IAddressAdapter } from "./id-address-adapter";
import { HttpService } from "@aio-ui/http-service";
import type { IdAddressDetailKey } from "./id-address.kit";
type IdAddressLevel = "propinsi" | "kota" | "kecamatan" | "kelurahan" | "kodepos";
export type IdAddressDetail = {
    [key in IdAddressDetailKey]?: string | number | undefined | null;
};
interface IdAddressQuery {
    level: IdAddressLevel | "detail" | "geocode";
    parentId?: string | number;
    kodepos?: string;
    location?: boolean;
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
    useAdapter?: 'native' | 'semantic-ui' | string | null;
    headless?: boolean;
    textContent?: IdAddressTextContentConfig;
}
export type IdAddressEventHandler = (schema: Record<string, any> | null, data: Record<string, any> | any[], complete: () => "ready" | "error" | "complete" | "loading" | "start" | "empty" | undefined, ...rest: any[]) => void;
export interface IdAddressEventArgs {
    schema?: Record<string, any> | null;
    data?: Record<string, any> | any[];
    state?: string;
    complete?: () => "ready" | "error" | "complete" | "loading" | "start" | "empty" | undefined;
    onLevelChange?: () => void | Promise<void>;
}
export interface IdAddressCacheEntry {
    data: any;
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
export declare class IdAddressBuilder {
    #private;
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
    _skipChangeListener: boolean;
    /**
     * @property {number} _kodeposRunId
     * @description Monotonic token for kodepos reverse-lookup runs; a newer lookup
     * supersedes an in-flight older one so rapid retyping cannot interleave results.
     */
    _kodeposRunId: number;
    /**
     * @property {Set<string>} _loadedLevels
     * @description Levels that actually rendered rows in the current cascade run.
     * `_settleLevels` uses it to tell "filled" apart from "asked but came back empty" —
     * an empty level still has an id in the detail, so the id alone cannot decide.
     */
    _loadedLevels: Set<string>;
    /**
     * @property {Array<string>} _levelOrder
     * @description Ordered administrative levels used to build and traverse the cascade.
     */
    _levelOrder: string[];
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
    constructor(config: IdAddressConfig);
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
    registerAdapter(name: string, adapter: IAddressAdapter): void;
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
    get config(): IdAddressConfig;
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
    set config(_config: Partial<IdAddressConfig>);
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
    private _levelNodes;
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
    init(): void;
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
    destroy(): void;
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
    _bindKodeposInputListener(schema: IdAddressSchemaRef): void;
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
    _loadLevel(levelSchema: IdAddressSchemaRef, parentId?: string | number | undefined, selectedValue?: null): Promise<void>;
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
    _updateLevelsByKodepos(detail?: {}, runId?: number): Promise<void>;
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
    _throwError(schema: IdAddressSchemaRef, message: string, error?: Error | null): void;
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
    clearNextLevel(level: IdAddressDetailKey, refresh?: boolean): void;
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
    _setLevelsState(state: "loading" | "idle"): void;
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
    _settleLevels(runId?: number): void;
    loadNextLevel(level: IdAddressLevel, parentId: string | number | undefined, selectedValue?: null): Promise<void>;
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
    getRegionalData(query: IdAddressQuery): Promise<any>;
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
    getDetailByKodepos(kodepos: string, location?: boolean): Promise<any>;
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
    getGeocodeLocation(detail: IdAddressDetail): Promise<Partial<IdAddressDetail>>;
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
    get detail(): Partial<IdAddressDetail>;
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
    _setDetail(value: Partial<IdAddressDetail>, refresh?: boolean): void;
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
    _fetchAPI(query: IdAddressQuery): Promise<any>;
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
    _getRelatedLevel(level: IdAddressDetailKey, next?: boolean): string | null;
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
    _bindInternalEvents(): void;
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
    __on(event: string, handler: IdAddressEventHandler): void;
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
    __emitChange(event: string, args?: IdAddressEventArgs): void;
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
    __emitLevelChange(level: IdAddressLevel, fn: IdAddressEventArgs): void;
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
    onLevelLoaded(fn: IdAddressEventHandler): void;
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
    onLevelChanged(fn: IdAddressEventHandler): void;
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
    onGeocodeLoaded(fn: IdAddressEventHandler): void;
}
export {};
//# sourceMappingURL=id-address-builder.d.ts.map