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

// Overload signatures
export function getStoredValue<T>(storage: Storage, key: string, defaultValue: T): T;
// eslint-disable-next-line no-redeclare
export function getStoredValue<T>(storage: Storage, key: string): T | null;

/**
 * Gets a value from the specified storage (localStorage or sessionStorage).
 * If the value does not exist or cannot be parsed, returns the default value or null.
 */
// eslint-disable-next-line no-redeclare
export function getStoredValue<T>(storage: Storage, key: string, defaultValue?: T | null): T | null {
    const defaultValueToUse = defaultValue ?? null;

    if (typeof window === 'undefined') {
        return defaultValueToUse;
    }

    try {
        const storedValue = window[storage].getItem(key);
        if (storedValue === null) {
            return defaultValueToUse;
        }
        return JSON.parse(storedValue) as T;
    } catch {
        return defaultValueToUse;
    }
}

/**
 * Sets a value in the specified storage (localStorage or sessionStorage).
 * The value is serialized to JSON before storing.
 */
export function setStoredValue<T>(storage: Storage, key: string, value: T): void {
    if (typeof window === 'undefined') {
        return;
    }
    window[storage].setItem(key, JSON.stringify(value));
}

/**
 * Navigates the window to the main menu (root URL).
 */
export function returnToMainMenu(): void {
    if (typeof window === 'undefined') {
        return;
    }
    window.location.href = '/';
}

/**
 * Adds an event listener to the window object.
 */
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

/**
 * Removes an event listener from the window object.
 */
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
