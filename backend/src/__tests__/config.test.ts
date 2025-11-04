import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('dotenv', async () => {
    const actual = await vi.importActual<typeof import('dotenv')>('dotenv');
    return {
        ...actual,
        config: vi.fn(() => ({ parsed: {} })),
    };
});

/**
 * Note: We use dynamic imports (await import('../config.js')) instead of importing
 * getEnv at the top of this file because config.ts has internal caching via cachedEnv.
 *
 * By using vi.resetModules() in beforeEach and dynamic imports in each test, we ensure:
 * 1. Each test gets a fresh config module with an empty cache
 * 2. vi.stubEnv() values are properly picked up by each test
 * 3. Tests don't interfere with each other due to cached environment values
 *
 * Without this pattern, the first test would cache the environment, and subsequent
 * tests would get stale values regardless of their stubbed environment variables.
 */

describe('config', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.unstubAllEnvs();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    describe('getEnv with valid configuration', () => {
        it('returns parsed environment variables with all fields provided', async () => {
            vi.stubEnv('PORT', '8080');
            vi.stubEnv('HOST', '127.0.0.1');
            vi.stubEnv('NODE_ENV', 'production');
            vi.stubEnv('CLIENT_URL', 'https://example.com');
            vi.stubEnv('JWT_SECRET', 'my-secret-key');

            const { getEnv } = await import('../config.js');
            const env = getEnv();

            expect(env).toEqual({
                PORT: 8080,
                HOST: '127.0.0.1',
                NODE_ENV: 'production',
                CLIENT_URL: 'https://example.com',
                JWT_SECRET: 'my-secret-key',
            });
        });

        it('coerces PORT string to number', async () => {
            vi.stubEnv('PORT', '3000');
            vi.stubEnv('JWT_SECRET', 'secret');

            const { getEnv } = await import('../config.js');
            const env = getEnv();

            expect(env.PORT).toBe(3000);
            expect(typeof env.PORT).toBe('number');
        });

        it.each([
            { scenario: 'development', value: 'development' as const },
            { scenario: 'test', value: 'test' as const },
            { scenario: 'production', value: 'production' as const },
        ])('accepts valid NODE_ENV value: $scenario', async ({ value }) => {
            vi.stubEnv('NODE_ENV', value);
            vi.stubEnv('JWT_SECRET', 'secret');

            const { getEnv } = await import('../config.js');
            const env = getEnv();

            expect(env.NODE_ENV).toBe(value);
        });
    });

    describe('getEnv with default values', () => {
        it('uses default PORT when not provided', async () => {
            vi.stubEnv('JWT_SECRET', 'secret');

            const { getEnv } = await import('../config.js');
            const env = getEnv();

            expect(env.PORT).toBe(4000);
        });

        it('uses default HOST when not provided', async () => {
            vi.stubEnv('JWT_SECRET', 'secret');

            const { getEnv } = await import('../config.js');
            const env = getEnv();

            expect(env.HOST).toBe('0.0.0.0');
        });

        it('uses default NODE_ENV when not provided', async () => {
            vi.stubEnv('JWT_SECRET', 'secret');
            delete process.env.NODE_ENV;

            const { getEnv } = await import('../config.js');
            const env = getEnv();

            expect(env.NODE_ENV).toBe('development');
        });

        it('uses default CLIENT_URL when not provided', async () => {
            vi.stubEnv('JWT_SECRET', 'secret');

            const { getEnv } = await import('../config.js');
            const env = getEnv();

            expect(env.CLIENT_URL).toBe('http://localhost:5173');
        });

        it('uses all defaults when only JWT_SECRET is provided', async () => {
            vi.stubEnv('JWT_SECRET', 'my-secret');
            delete process.env.NODE_ENV;

            const { getEnv } = await import('../config.js');
            const env = getEnv();

            expect(env).toEqual({
                PORT: 4000,
                HOST: '0.0.0.0',
                NODE_ENV: 'development',
                CLIENT_URL: 'http://localhost:5173',
                JWT_SECRET: 'my-secret',
            });
        });
    });

    describe('getEnv validation errors', () => {
        it('throws error when JWT_SECRET is missing', async () => {
            const { getEnv } = await import('../config.js');

            expect(() => getEnv()).toThrow('Environment validation failed');
            expect(() => getEnv()).toThrow('JWT_SECRET');
        });

        it('throws error when JWT_SECRET is empty string', async () => {
            vi.stubEnv('JWT_SECRET', '');

            const { getEnv } = await import('../config.js');

            expect(() => getEnv()).toThrow('Environment validation failed');
            expect(() => getEnv()).toThrow('JWT_SECRET');
        });

        it.each([
            { scenario: 'PORT below minimum', value: '0', field: 'PORT' },
            { scenario: 'PORT above maximum', value: '65536', field: 'PORT' },
            { scenario: 'PORT negative', value: '-1', field: 'PORT' },
        ])('throws error for $scenario', async ({ value, field }) => {
            vi.stubEnv('PORT', value);
            vi.stubEnv('JWT_SECRET', 'secret');

            const { getEnv } = await import('../config.js');

            expect(() => getEnv()).toThrow('Environment validation failed');
            expect(() => getEnv()).toThrow(field);
        });

        it('throws error when NODE_ENV has invalid value', async () => {
            vi.stubEnv('NODE_ENV', 'invalid-env');
            vi.stubEnv('JWT_SECRET', 'secret');

            const { getEnv } = await import('../config.js');

            expect(() => getEnv()).toThrow('Environment validation failed');
            expect(() => getEnv()).toThrow('NODE_ENV');
        });

        it('throws error when CLIENT_URL is not a valid URL', async () => {
            vi.stubEnv('CLIENT_URL', 'not-a-valid-url');
            vi.stubEnv('JWT_SECRET', 'secret');

            const { getEnv } = await import('../config.js');

            expect(() => getEnv()).toThrow('Environment validation failed');
            expect(() => getEnv()).toThrow('CLIENT_URL');
        });

        it('formats error message with multiple validation failures', async () => {
            vi.stubEnv('PORT', '70000');
            vi.stubEnv('NODE_ENV', 'invalid');

            const { getEnv } = await import('../config.js');

            expect(() => getEnv()).toThrow('Environment validation failed');
            expect(() => getEnv()).toThrow('Please check your .env file');
        });

        it('includes emoji and formatting in error message', async () => {
            const { getEnv } = await import('../config.js');

            expect(() => getEnv()).toThrow('🔥 Environment validation failed');
            expect(() => getEnv()).toThrow('❌');
        });
    });

    describe('getEnv caching behavior', () => {
        it('returns the same cached object on subsequent calls', async () => {
            vi.stubEnv('JWT_SECRET', 'secret');
            vi.stubEnv('PORT', '5000');

            const { getEnv } = await import('../config.js');
            const env1 = getEnv();
            const env2 = getEnv();

            expect(env1).toBe(env2); // Same reference
        });

        it('does not re-parse environment on subsequent calls', async () => {
            vi.stubEnv('JWT_SECRET', 'secret');
            vi.stubEnv('PORT', '5000');

            const { getEnv } = await import('../config.js');
            const env1 = getEnv();

            // Change environment after first call
            vi.stubEnv('PORT', '6000');

            const env2 = getEnv();

            // Should still use cached value
            expect(env2.PORT).toBe(5000);
            expect(env1).toBe(env2);
        });
    });

    describe('edge cases', () => {
        it('accepts PORT at minimum boundary (1)', async () => {
            vi.stubEnv('PORT', '1');
            vi.stubEnv('JWT_SECRET', 'secret');

            const { getEnv } = await import('../config.js');
            const env = getEnv();

            expect(env.PORT).toBe(1);
        });

        it('accepts PORT at maximum boundary (65535)', async () => {
            vi.stubEnv('PORT', '65535');
            vi.stubEnv('JWT_SECRET', 'secret');

            const { getEnv } = await import('../config.js');
            const env = getEnv();

            expect(env.PORT).toBe(65535);
        });

        it('accepts CLIENT_URL with path and query string', async () => {
            vi.stubEnv('CLIENT_URL', 'https://example.com/path?query=value');
            vi.stubEnv('JWT_SECRET', 'secret');

            const { getEnv } = await import('../config.js');
            const env = getEnv();

            expect(env.CLIENT_URL).toBe('https://example.com/path?query=value');
        });

        it('accepts long JWT_SECRET', async () => {
            const longSecret = 'a'.repeat(1000);
            vi.stubEnv('JWT_SECRET', longSecret);

            const { getEnv } = await import('../config.js');
            const env = getEnv();

            expect(env.JWT_SECRET).toBe(longSecret);
        });
    });
});
