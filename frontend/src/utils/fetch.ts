const promiseCache = new Map<string, Promise<unknown>>();

/**
 * Caches promises based on a key for fetching with `use` using a stable promise in React components.
 * Cache is in-memory only, resets on page reload, and lasts for the lifetime of the application.
 *
 * @param key Unique key to identify the cached promise.
 * @param fetchFunction Function that returns a promise to be cached.
 * @returns The cached promise if it exists; otherwise, calls `fetchFunction`, caches its promise, and returns it.
 */
export function getCachedPromise<T>(key: string, fetchFunction: () => Promise<T>): Promise<T> {
    if (promiseCache.has(key)) {
        return promiseCache.get(key) as Promise<T>;
    }

    const promise = fetchFunction();
    promiseCache.set(key, promise);
    return promise;
}

// For testing purposes only
export function _resetPromiseCacheForTesting(): void {
    promiseCache.clear();
}
