/**
 * Utility functions for window operations.
 */

export function getLocationOrigin(): string {
    if (typeof window === 'undefined') {
        return '';
    }
    return window.location.origin;
}

export function setTimeout(callback: () => void, delay: number): number {
    if (typeof window === 'undefined') {
        return -1;
    }
    return window.setTimeout(callback, delay);
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
