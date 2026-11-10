export interface iHttpServiceConfig {
    url?: string;
    /**
     * Builds the request URL for a query.
     *
     * The mock transport uses it to point at static JSON (`/mock/blog.json`) without
     * changing a single controller: switching to a real backend means removing this
     * hook and setting `url`.
     */
    endpoint?: (query: Record<string, any>) => string;
    timeout?: number;
    delay?: number;
    cacheEnabled?: boolean;
    cachePrefix?: string;
    cacheTtlDays?: number;
    /** Print request/response diagnostics. Off by default: a data module should not own the console. */
    debug?: boolean;
}
export declare class HttpService {
    /** Slot this class fills when registered as an app module. */
    static readonly slot: "http";
    /**
     * @property {boolean} _destroyed
     * @description Whether this instance has been destroyed and should ignore async work.
     */
    _destroyed: boolean;
    /**
     * @property {Set<AbortController>} _abortControllers
     * @description Active request controllers used to cancel pending API calls.
     */
    _abortControllers: Set<AbortController>;
    /**
     * @property {iHttpServiceConfig} _config
     * @description Merged runtime configuration for API, cache, text, container, and adapter behavior.
     */
    config: iHttpServiceConfig & Required<Pick<iHttpServiceConfig, "url" | "timeout" | "delay" | "cacheEnabled" | "cachePrefix" | "cacheTtlDays">>;
    constructor(config?: iHttpServiceConfig);
    /**
     * Releases in-flight requests and stops accepting new ones.
     *
     * The app contract calls `port.destroy?.()` on every module, and a consumer that built
     * its own service (the address picker does) needs the same door to close it.
     */
    destroy(): void;
    /**
     * Retrieves administrative regional data either from the local cache or by calling the remote API.
     *
     * @param {Object} [query={}] - The query parameters for the data request.
     * @returns {Promise<Array|Object>} A promise that resolves to the requested regional data.
     * @throws {Error} If the API request fails or cache retrieval encounters a critical error.
     *
     * @example
     * const cities = await service.get({ level: 'kota', parentId: 11 });
     *
     * @description
     * This method acts as a data proxy. It generates a unique cache key based on the query parameters,
     * checks if valid data exists in `localStorage`, and if not, performs a network fetch.
     * To ensure a consistent UI experience, it introduces a configurable artificial delay
     * when serving data from the cache.
     */
    get(query: any): Promise<any>;
    /**
     * Submits data to the remote API using a POST request and caches the successful response.
     *
     * @param {Object} query - Configuration parameter to determine the cache structural key.
     * @param {Object} payload - The JavaScript object containing the body data to be sent as JSON.
     * @returns {Promise<Array|Object>} A promise that resolves to the processed data returned by the API.
     * @throws {Error} If the API request fails.
     */
    post(query: any, payload: any): Promise<any>;
    /**
     * Constructing key for storing data in `localStorage` cache
     * @param query
     * @param suffix
     * @returns Cache Key for `localStorage`
     */
    private _constructCacheKey;
    /**
     * Default URL builder: the configured base plus every defined query parameter.
     *
     * Kept separate so `config.endpoint` can replace it without duplicating the
     * parameter sanitising.
     */
    private _buildUrl;
    /**
     * Performs a network request to the configured API endpoint with automatic timeout and abort handling.
     *
     * @param {Object} [query={}] - Key-value pairs to be appended as URL search parameters.
     * @param {RequestInit} [options={}] - Standard fetch options (method, headers, etc.).
     * @param {number} [timeout=10000] - Maximum time in milliseconds to wait before aborting the request.
     * @returns {Promise<any>} A promise that resolves to the 'data' property of the successful JSON response.
     * @throws {Error} If the request times out, returns a non-2xx status, or the JSON payload indicates failure.
     *
     * @example
     * const data = await service._fetchAPI({ level: 'propinsi' });
     *
     * @description
     * This method wraps the native `fetch` API with a lifecycle management system. It creates an
     * `AbortController` for every request, registers it in an internal set for cleanup during
     * instance destruction, and sets a timer to trigger an abort if the server doesn't respond
     * within the specified window. It also normalizes the API response format.
     */
    _fetchAPI(query?: {}, options?: RequestInit, timeout?: number): Promise<any>;
    /**
     * Checks whether the builder cache is still valid and clears expired entries when needed.
     *
     * @param {boolean} [clearNow=false] - Forces cache clearing even when the stored expiration is still valid.
     * @returns {void} Does not return a value; it updates `localStorage` cache metadata as a side effect.
     * @throws {void} Storage errors are caught and logged instead of being thrown.
     *
     * @example
     * const service = new HttpService({ url: '/api/address', cacheEnabled: true });
     * service._validateCache(true); // Force all HttpService cache entries to be refreshed.
     *
     * @description
     * How it works: the method reads the cache expiration marker, exits early when the marker
     * is still in the future, otherwise removes every `localStorage` item using the configured
     * cache prefix and writes a new expiration timestamp based on `cache.ttlDays`.
     */
    _validateCache(clearNow?: boolean): void;
    /**
     * Writes one API response payload into the configured `localStorage` cache namespace.
     *
     * @param {string} key - Cache key suffix, without the configured prefix.
     * @param {*} data - Serializable data to store in the cache entry.
     * @returns {void} Does not return a value; it persists the cache entry in `localStorage`.
     * @throws {Error} Throws `Cache write failed` when serialization or storage fails.
     *
     * @example
     * service._writeCache('propinsi-root', [{ propinsi_id: 31, propinsi_name: 'DKI Jakarta' }]);
     *
     * @description
     * How it works: the method computes an absolute expiration time from `cache.ttlDays`,
     * wraps the payload and expiration in a cache entry object, serializes it to JSON,
     * and stores it under `<prefix>:<key>`.
     */
    _writeCache(key: string, data: any): void;
    /**
     * Reads one cached API response payload from the configured `localStorage` cache namespace.
     *
     * @param {string} key - Cache key suffix, without the configured prefix.
     * @returns {*|null} Returns cached data when present, otherwise `null`.
     * @throws {void} Read and parse errors are caught and logged instead of being thrown.
     *
     * @example
     * const cachedCities = service._loadCache('propinsi-31');
     * if (cachedCities) {
     *   console.log(cachedCities.length);
     * }
     *
     * @description
     * How it works: the method builds the namespaced cache key, reads the raw JSON string
     * from `localStorage`, parses it into a cache entry, removes stale or invalid entries,
     * and returns only the stored `data` payload.
     */
    _loadCache(key: string): any;
    /**
    * Helper utility to safely clean out stale data when space runs tight
    * without destroying freshly cached items.
    */
    private _purgeExpiredKeysOnly;
}
//# sourceMappingURL=HttpService.d.ts.map