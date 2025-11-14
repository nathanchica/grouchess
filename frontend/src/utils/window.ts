/**
 * Utility functions for window operations.
 */

export function getLocationOrigin(): string {
    if (typeof window === 'undefined') {
        return '';
    }
    return window.location.origin;
}

export function setTimeout<TArgs extends unknown[]>(
    callback: (...args: TArgs) => void,
    delay: number,
    ...args: TArgs
): number {
    if (typeof window === 'undefined') {
        return -1;
    }
    return window.setTimeout(callback, delay, ...args);
}

export function clearTimeout(timeoutId: number): void {
    if (typeof window === 'undefined') {
        return;
    }
    window.clearTimeout(timeoutId);
}

type Storage = 'localStorage' | 'sessionStorage';

export function getStoredValue<T>(storage: Storage, key: string, defaultValue: T): T {
    if (typeof window === 'undefined') {
        return defaultValue;
    }
    const storedValue = window[storage].getItem(key);
    if (storedValue === null) {
        return defaultValue;
    }
    try {
        return JSON.parse(storedValue) as T;
    } catch {
        return defaultValue;
    }
}

export function setStoredValue<T>(storage: Storage, key: string, value: T): void {
    if (typeof window === 'undefined') {
        return;
    }
    window[storage].setItem(key, JSON.stringify(value));
}

export function returnToMainMenu(): void {
    if (typeof window === 'undefined') {
        return;
    }
    window.location.href = '/';
}

export function addEventListener<K extends keyof WindowEventMap>(
    type: K,
    listener: (this: Window, ev: WindowEventMap[K]) => any, // eslint-disable-line @typescript-eslint/no-explicit-any
    options?: boolean | AddEventListenerOptions
): void {
    if (typeof window === 'undefined') {
        return;
    }
    window.addEventListener(type, listener, options);
}

export function removeEventListener<K extends keyof WindowEventMap>(
    type: K,
    listener: (this: Window, ev: WindowEventMap[K]) => any, // eslint-disable-line @typescript-eslint/no-explicit-any
    options?: boolean | EventListenerOptions
): void {
    if (typeof window === 'undefined') {
        return;
    }
    window.removeEventListener(type, listener, options);
}
