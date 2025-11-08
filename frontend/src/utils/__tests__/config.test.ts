import { NotConfiguredError } from '@grouchess/errors';

// Unmock the config module for these tests
vi.unmock('../config');

import { getEnv, _resetCachedEnvForTests } from '../config';

/**
 * Helper to set import.meta.env values
 * vi.stubEnv only accepts strings, but import.meta.env can have other types
 */
function setImportMetaEnv(key: string, value: unknown) {
    (import.meta.env as Record<string, unknown>)[key] = value;
}

/**
 * Helper to delete import.meta.env values
 */
function deleteImportMetaEnv(key: string) {
    delete (import.meta.env as Record<string, unknown>)[key];
}

describe('getEnv', () => {
    beforeEach(() => {
        _resetCachedEnvForTests();
        // Clear all env vars
        const envKeys = Object.keys(import.meta.env);
        envKeys.forEach((key) => {
            if (key.startsWith('VITE_') || ['MODE', 'BASE_URL', 'DEV', 'PROD', 'SSR'].includes(key)) {
                deleteImportMetaEnv(key);
            }
        });
    });

    afterEach(() => {
        _resetCachedEnvForTests();
    });

    describe('valid parsing', () => {
        it('parses all valid environment variables with proper types', () => {
            setImportMetaEnv('VITE_API_BASE_URL', 'https://api.example.com');
            setImportMetaEnv('VITE_WEBSOCKET_URL', 'wss://ws.example.com');
            setImportMetaEnv('VITE_SENTRY_DSN', 'https://sentry.example.com/123');
            setImportMetaEnv('MODE', 'production');
            setImportMetaEnv('BASE_URL', '/app/');

            const env = getEnv();

            expect(env.VITE_API_BASE_URL).toBe('https://api.example.com');
            expect(env.VITE_WEBSOCKET_URL).toBe('wss://ws.example.com');
            expect(env.VITE_SENTRY_DSN).toBe('https://sentry.example.com/123');
            expect(env.MODE).toBe('production');
            expect(env.BASE_URL).toBe('/app/');
            expect(env.DEV).toBe(false);
            expect(env.PROD).toBe(false);
            expect(env.SSR).toBe(false);
            expect(env.VITE_SENTRY_TRACES_SAMPLE_RATE).toBe(0.1);
        });
    });

    describe('defaults', () => {
        it.each([
            { field: 'VITE_API_BASE_URL', expected: 'http://localhost:4000' },
            { field: 'VITE_WEBSOCKET_URL', expected: 'http://localhost:4000' },
            { field: 'MODE', expected: 'development' },
            { field: 'BASE_URL', expected: '/' },
            { field: 'DEV', expected: false },
            { field: 'PROD', expected: false },
            { field: 'SSR', expected: false },
            { field: 'VITE_SENTRY_TRACES_SAMPLE_RATE', expected: 0.1 },
        ])('uses default for $field when not provided', ({ field, expected }) => {
            const env = getEnv();
            expect(env[field as keyof typeof env]).toBe(expected);
        });
    });

    describe('optional fields', () => {
        it('allows VITE_SENTRY_DSN to be undefined', () => {
            const env = getEnv();
            expect(env.VITE_SENTRY_DSN).toBeUndefined();
        });

        it('accepts valid VITE_SENTRY_DSN when provided', () => {
            setImportMetaEnv('VITE_SENTRY_DSN', 'https://key@sentry.io/project');
            const env = getEnv();
            expect(env.VITE_SENTRY_DSN).toBe('https://key@sentry.io/project');
        });

        it('allows VITE_SENTRY_TRACES_SAMPLE_RATE to be undefined when explicitly set', () => {
            const env = getEnv();
            // When undefined, it should use the default value
            expect(env.VITE_SENTRY_TRACES_SAMPLE_RATE).toBe(0.1);
        });
    });

    describe('URL validation', () => {
        it('throws NotConfiguredError for VITE_API_BASE_URL with invalid URL', () => {
            setImportMetaEnv('VITE_API_BASE_URL', 'not-a-url');
            expect(() => getEnv()).toThrow(NotConfiguredError);
        });

        it('throws NotConfiguredError for VITE_WEBSOCKET_URL with invalid URL', () => {
            setImportMetaEnv('VITE_WEBSOCKET_URL', 'not a valid url');
            expect(() => getEnv()).toThrow(NotConfiguredError);
        });

        it('throws NotConfiguredError for VITE_SENTRY_DSN with invalid URL', () => {
            setImportMetaEnv('VITE_SENTRY_DSN', 'just-a-string');
            expect(() => getEnv()).toThrow(NotConfiguredError);
        });

        it.each([
            {
                scenario: 'VITE_API_BASE_URL with http URL',
                envVar: 'VITE_API_BASE_URL',
                value: 'http://localhost:3000',
            },
            {
                scenario: 'VITE_API_BASE_URL with https URL',
                envVar: 'VITE_API_BASE_URL',
                value: 'https://api.production.com',
            },
            {
                scenario: 'VITE_WEBSOCKET_URL with ws URL',
                envVar: 'VITE_WEBSOCKET_URL',
                value: 'ws://localhost:4000',
            },
            {
                scenario: 'VITE_WEBSOCKET_URL with wss URL',
                envVar: 'VITE_WEBSOCKET_URL',
                value: 'wss://ws.production.com',
            },
        ])('accepts valid URL for $scenario', ({ envVar, value }) => {
            setImportMetaEnv(envVar, value);
            const env = getEnv();
            expect(env[envVar as keyof typeof env]).toBe(value);
        });
    });

    describe('number validation', () => {
        it('uses default value when VITE_SENTRY_TRACES_SAMPLE_RATE is not set', () => {
            const env = getEnv();
            expect(env.VITE_SENTRY_TRACES_SAMPLE_RATE).toBe(0.1);
        });

        it.each([
            {
                scenario: 'negative value',
                value: -0.1,
            },
            {
                scenario: 'value greater than 1',
                value: 1.5,
            },
            {
                scenario: 'value much greater than 1',
                value: 100,
            },
        ])('throws NotConfiguredError for VITE_SENTRY_TRACES_SAMPLE_RATE $scenario', ({ value }) => {
            setImportMetaEnv('VITE_SENTRY_TRACES_SAMPLE_RATE', value);

            expect(() => getEnv()).toThrow(NotConfiguredError);
        });
    });

    describe('enum validation', () => {
        it.each([
            {
                scenario: 'development',
                value: 'development',
            },
            {
                scenario: 'production',
                value: 'production',
            },
            {
                scenario: 'test',
                value: 'test',
            },
        ])('accepts MODE $scenario', ({ value }) => {
            setImportMetaEnv('MODE', value);
            const env = getEnv();
            expect(env.MODE).toBe(value);
        });

        it('throws NotConfiguredError for invalid MODE value', () => {
            setImportMetaEnv('MODE', 'invalid-mode');

            expect(() => getEnv()).toThrow(NotConfiguredError);
        });
    });

    describe('caching', () => {
        it('returns the same object on subsequent calls', () => {
            const env1 = getEnv();
            const env2 = getEnv();

            expect(env1).toBe(env2);
        });

        it('does not re-parse on second call', () => {
            // Spy on the envSchema.parse method by mocking import.meta.env access
            let parseCount = 0;
            const originalEnv = import.meta.env;

            // Create a proxy to track accesses
            Object.defineProperty(import.meta, 'env', {
                get() {
                    parseCount++;
                    return originalEnv;
                },
                configurable: true,
            });

            getEnv();
            const callCount1 = parseCount;

            getEnv();
            const callCount2 = parseCount;

            // Second call should not increase the parse count
            expect(callCount2).toBe(callCount1);

            // Restore original
            Object.defineProperty(import.meta, 'env', {
                value: originalEnv,
                configurable: true,
            });
        });
    });

    describe('error formatting', () => {
        it('formats single validation error with field path and message', () => {
            setImportMetaEnv('VITE_API_BASE_URL', 'invalid-url');

            try {
                getEnv();
                expect.fail('Should have thrown NotConfiguredError');
            } catch (error) {
                expect(error).toBeInstanceOf(NotConfiguredError);
                expect((error as Error).message).toContain('Not configured:');
                expect((error as Error).message).toContain('❌');
                expect((error as Error).message).toContain('VITE_API_BASE_URL');
            }
        });

        it('formats multiple validation errors', () => {
            setImportMetaEnv('VITE_API_BASE_URL', 'invalid-url');
            setImportMetaEnv('VITE_WEBSOCKET_URL', 'also-invalid');
            setImportMetaEnv('MODE', 'not-a-valid-mode');

            try {
                getEnv();
                expect.fail('Should have thrown NotConfiguredError');
            } catch (error) {
                expect(error).toBeInstanceOf(NotConfiguredError);
                const message = (error as Error).message;
                expect(message).toContain('Not configured:');
                expect(message).toContain('VITE_API_BASE_URL');
                expect(message).toContain('VITE_WEBSOCKET_URL');
                expect(message).toContain('MODE');
            }
        });
    });
});
