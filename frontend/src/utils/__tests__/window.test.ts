import type { Mock } from 'vitest';

import { getLocationOrigin, setTimeout, clearTimeout, getStoredValue, setStoredValue } from '../window';

describe('getLocationOrigin', () => {
    let originalLocation: Location;

    beforeEach(() => {
        originalLocation = window.location;
    });

    afterEach(() => {
        Object.defineProperty(window, 'location', {
            value: originalLocation,
            configurable: true,
        });
    });

    it('returns window.location.origin when window is available', () => {
        Object.defineProperty(window, 'location', {
            value: { ...originalLocation, origin: 'https://example.com' },
            configurable: true,
        });

        const result = getLocationOrigin();

        expect(result).toBe('https://example.com');
    });

    it('returns empty string when window is undefined', () => {
        const originalWindow = global.window;
        // @ts-expect-error - Testing SSR scenario
        delete global.window;

        const result = getLocationOrigin();

        expect(result).toBe('');

        global.window = originalWindow;
    });
});

describe('setTimeout', () => {
    let setTimeoutSpy: Mock<typeof window.setTimeout>;

    beforeEach(() => {
        setTimeoutSpy = vi.spyOn(window, 'setTimeout');
    });

    afterEach(() => {
        setTimeoutSpy.mockRestore();
    });

    it('calls window.setTimeout with correct callback and delay', () => {
        const callback = vi.fn();
        const delay = 1000;
        setTimeoutSpy.mockReturnValue(123 as unknown as ReturnType<typeof window.setTimeout>);

        setTimeout(callback, delay);

        expect(setTimeoutSpy).toHaveBeenCalledWith(callback, delay);
    });

    it('returns timeout ID from window.setTimeout', () => {
        const callback = vi.fn();
        const expectedId = 456;
        setTimeoutSpy.mockReturnValue(expectedId as unknown as ReturnType<typeof window.setTimeout>);

        const result = setTimeout(callback, 1000);

        expect(result).toBe(expectedId);
    });

    it('returns -1 when window is undefined', () => {
        const originalWindow = global.window;
        // @ts-expect-error - Testing SSR scenario
        delete global.window;

        const result = setTimeout(() => {}, 1000);

        expect(result).toBe(-1);

        global.window = originalWindow;
    });
});

describe('clearTimeout', () => {
    let clearTimeoutSpy: Mock<typeof window.clearTimeout>;

    beforeEach(() => {
        clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    });

    afterEach(() => {
        clearTimeoutSpy.mockRestore();
    });

    it('calls window.clearTimeout with correct timeout ID', () => {
        const timeoutId = 123;

        clearTimeout(timeoutId);

        expect(clearTimeoutSpy).toHaveBeenCalledWith(timeoutId);
    });

    it('does nothing when window is undefined', () => {
        const originalWindow = global.window;
        // @ts-expect-error - Testing SSR scenario
        delete global.window;

        expect(() => clearTimeout(123)).not.toThrow();

        global.window = originalWindow;
    });
});

describe('getStoredValue', () => {
    let getItemSpy: Mock<Storage['getItem']>;

    afterEach(() => {
        getItemSpy?.mockRestore();
    });

    it.each([
        {
            scenario: 'localStorage',
            storage: 'localStorage' as const,
        },
        {
            scenario: 'sessionStorage',
            storage: 'sessionStorage' as const,
        },
    ])('returns parsed stored value from $scenario when key exists', ({ storage }) => {
        getItemSpy = vi.spyOn(window[storage], 'getItem');
        const storedValue = { foo: 'bar', count: 42 };
        getItemSpy.mockReturnValue(JSON.stringify(storedValue));

        const result = getStoredValue(storage, 'test-key', null);

        expect(getItemSpy).toHaveBeenCalledWith('test-key');
        expect(result).toEqual(storedValue);
    });

    it.each([
        {
            scenario: 'string value',
            storedValue: 'hello world',
            defaultValue: '',
            storage: 'localStorage' as const,
        },
        {
            scenario: 'number value',
            storedValue: 123,
            defaultValue: 0,
            storage: 'localStorage' as const,
        },
        {
            scenario: 'boolean value',
            storedValue: true,
            defaultValue: false,
            storage: 'sessionStorage' as const,
        },
        {
            scenario: 'array value',
            storedValue: [1, 2, 3],
            defaultValue: [],
            storage: 'localStorage' as const,
        },
        {
            scenario: 'object value',
            storedValue: { a: 1, b: 2 },
            defaultValue: {},
            storage: 'sessionStorage' as const,
        },
    ])('handles $scenario correctly', ({ storedValue, defaultValue, storage }) => {
        getItemSpy = vi.spyOn(window[storage], 'getItem');
        getItemSpy.mockReturnValue(JSON.stringify(storedValue));

        const result = getStoredValue(storage, 'test-key', defaultValue);

        expect(result).toEqual(storedValue);
    });

    it.each([
        {
            scenario: 'localStorage',
            storage: 'localStorage' as const,
        },
        {
            scenario: 'sessionStorage',
            storage: 'sessionStorage' as const,
        },
    ])('returns default value from $scenario when key does not exist', ({ storage }) => {
        getItemSpy = vi.spyOn(window[storage], 'getItem');
        getItemSpy.mockReturnValue(null);
        const defaultValue = { default: true };

        const result = getStoredValue(storage, 'non-existent-key', defaultValue);

        expect(result).toEqual(defaultValue);
    });

    it.each([
        {
            scenario: 'localStorage',
            storage: 'localStorage' as const,
        },
        {
            scenario: 'sessionStorage',
            storage: 'sessionStorage' as const,
        },
    ])('returns default value from $scenario when JSON.parse fails', ({ storage }) => {
        getItemSpy = vi.spyOn(window[storage], 'getItem');
        getItemSpy.mockReturnValue('invalid json {{{');
        const defaultValue = { fallback: true };

        const result = getStoredValue(storage, 'test-key', defaultValue);

        expect(result).toEqual(defaultValue);
    });

    it.each([
        {
            scenario: 'localStorage',
            storage: 'localStorage' as const,
        },
        {
            scenario: 'sessionStorage',
            storage: 'sessionStorage' as const,
        },
    ])('returns default value from $scenario when window is undefined', ({ storage }) => {
        const originalWindow = global.window;
        // @ts-expect-error - Testing SSR scenario
        delete global.window;
        const defaultValue = { ssr: true };

        const result = getStoredValue(storage, 'test-key', defaultValue);

        expect(result).toEqual(defaultValue);

        global.window = originalWindow;
    });
});

describe('setStoredValue', () => {
    let setItemSpy: Mock<Storage['setItem']>;

    afterEach(() => {
        setItemSpy?.mockRestore();
    });

    it.each([
        {
            scenario: 'localStorage',
            storage: 'localStorage' as const,
        },
        {
            scenario: 'sessionStorage',
            storage: 'sessionStorage' as const,
        },
    ])('sets JSON stringified value to $scenario', ({ storage }) => {
        setItemSpy = vi.spyOn(window[storage], 'setItem');
        const value = { foo: 'bar', count: 42 };

        setStoredValue(storage, 'test-key', value);

        expect(setItemSpy).toHaveBeenCalledWith('test-key', JSON.stringify(value));
    });

    it.each([
        {
            scenario: 'string value',
            value: 'hello world',
            storage: 'localStorage' as const,
        },
        {
            scenario: 'number value',
            value: 123,
            storage: 'sessionStorage' as const,
        },
        {
            scenario: 'boolean value',
            value: false,
            storage: 'localStorage' as const,
        },
        {
            scenario: 'array value',
            value: [1, 2, 3],
            storage: 'sessionStorage' as const,
        },
        {
            scenario: 'object value',
            value: { a: 1, b: 2 },
            storage: 'localStorage' as const,
        },
        {
            scenario: 'null value',
            value: null,
            storage: 'sessionStorage' as const,
        },
    ])('handles $scenario correctly', ({ value, storage }) => {
        setItemSpy = vi.spyOn(window[storage], 'setItem');

        setStoredValue(storage, 'test-key', value);

        expect(setItemSpy).toHaveBeenCalledWith('test-key', JSON.stringify(value));
    });

    it.each([
        {
            scenario: 'localStorage',
            storage: 'localStorage' as const,
        },
        {
            scenario: 'sessionStorage',
            storage: 'sessionStorage' as const,
        },
    ])('does nothing when window is undefined for $scenario', ({ storage }) => {
        const originalWindow = global.window;
        // @ts-expect-error - Testing SSR scenario
        delete global.window;

        expect(() => setStoredValue(storage, 'test-key', { value: 123 })).not.toThrow();

        global.window = originalWindow;
    });
});
