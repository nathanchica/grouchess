const promiseCache = new Map<string, Promise<Response>>();

export function getCachedPromise(key: string, fetchFunction: () => Promise<Response>): Promise<Response> {
    if (promiseCache.has(key)) {
        return promiseCache.get(key) as Promise<Response>;
    }

    const promise = fetchFunction();
    promiseCache.set(key, promise);
    return promise;
}

// For testing purposes only
export function _resetPromiseCacheForTesting(): void {
    promiseCache.clear();
}
