import { InvalidInputError, NotConfiguredError, RequestTimeoutError } from '@grouchess/errors';
import type { Mock } from 'vitest';

import { fetchParsedHealthStatus, checkHealthStatus } from '../health';

let fetchSpy: Mock<typeof fetch>;
let setTimeoutSpy: Mock<typeof setTimeout>;
let clearTimeoutSpy: Mock<typeof clearTimeout>;

beforeEach(() => {
    fetchSpy = vi.spyOn(window, 'fetch');
    setTimeoutSpy = vi.spyOn(window, 'setTimeout');
    clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:4000/api');
});

afterEach(() => {
    fetchSpy.mockRestore();
    setTimeoutSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
    vi.unstubAllEnvs();
});

describe('fetchParsedHealthStatus', () => {
    it.each([
        { description: 'empty string', value: '' },
        { description: 'undefined', value: undefined },
    ])('throws NotConfiguredError when API base URL is $description', async ({ value }) => {
        vi.stubEnv('VITE_API_BASE_URL', value);

        await expect(fetchParsedHealthStatus()).rejects.toThrow(NotConfiguredError);
        await expect(fetchParsedHealthStatus()).rejects.toThrow('API base URL is not configured.');
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it.each([
        { description: 'zero', value: 0 },
        { description: 'negative', value: -100 },
    ])('throws InvalidInputError when timeoutMs is $description', async ({ value }) => {
        await expect(fetchParsedHealthStatus({ timeoutMs: value })).rejects.toThrow(InvalidInputError);
        await expect(fetchParsedHealthStatus({ timeoutMs: value })).rejects.toThrow(
            'timeoutMs must be a positive number.'
        );
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('fetches from correct endpoint with default timeout', async () => {
        const mockHealthData = {
            status: 'healthy',
            service: 'grouchess-api',
            uptime: 12345,
            timestamp: new Date().toISOString(),
        };
        const mockResponse = {
            ok: true,
            json: vi.fn().mockResolvedValue(mockHealthData),
        } as unknown as Response;
        fetchSpy.mockResolvedValue(mockResponse);

        await fetchParsedHealthStatus();

        expect(fetchSpy).toHaveBeenCalledWith('http://localhost:4000/api/health', {
            signal: expect.any(AbortSignal),
        });
        expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 800);
    });

    it('fetches from correct endpoint with custom timeout', async () => {
        const mockHealthData = {
            status: 'healthy',
            service: 'grouchess-api',
            uptime: 12345,
            timestamp: new Date().toISOString(),
        };
        const mockResponse = {
            ok: true,
            json: vi.fn().mockResolvedValue(mockHealthData),
        } as unknown as Response;
        fetchSpy.mockResolvedValue(mockResponse);

        await fetchParsedHealthStatus({ timeoutMs: 2000 });

        expect(fetchSpy).toHaveBeenCalledWith('http://localhost:4000/api/health', {
            signal: expect.any(AbortSignal),
        });
        expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
    });

    it('parses and returns health status response on success', async () => {
        const mockHealthData = {
            status: 'healthy',
            service: 'grouchess-api',
            uptime: 54321,
            timestamp: '2025-01-15T10:30:00.000Z',
        };
        const mockResponse = {
            ok: true,
            json: vi.fn().mockResolvedValue(mockHealthData),
        } as unknown as Response;
        fetchSpy.mockResolvedValue(mockResponse);

        const result = await fetchParsedHealthStatus();

        expect(result.status).toBe('healthy');
        expect(result.service).toBe('grouchess-api');
        expect(result.uptime).toBe(54321);
        expect(result.timestamp).toBeInstanceOf(Date);
        expect(mockResponse.json).toHaveBeenCalled();
    });

    it('clears timeout after successful fetch', async () => {
        const mockHealthData = {
            status: 'healthy',
            service: 'grouchess-api',
            uptime: 12345,
            timestamp: new Date().toISOString(),
        };
        const mockResponse = {
            ok: true,
            json: vi.fn().mockResolvedValue(mockHealthData),
        } as unknown as Response;
        fetchSpy.mockResolvedValue(mockResponse);
        const mockTimeoutId = 123;
        setTimeoutSpy.mockReturnValue(mockTimeoutId as unknown as ReturnType<typeof setTimeout>);

        await fetchParsedHealthStatus();

        expect(clearTimeoutSpy).toHaveBeenCalledWith(mockTimeoutId);
    });

    it('throws error when response is not ok', async () => {
        const mockResponse = {
            ok: false,
            status: 500,
        } as Response;
        fetchSpy.mockResolvedValue(mockResponse);

        await expect(fetchParsedHealthStatus()).rejects.toThrow('Unable to load service health right now.');
    });

    it('throws RequestTimeoutError when fetch is aborted due to timeout', async () => {
        const abortError = new DOMException('The operation was aborted.', 'AbortError');
        fetchSpy.mockRejectedValue(abortError);

        await expect(fetchParsedHealthStatus()).rejects.toThrow(RequestTimeoutError);
    });

    it('calls abort on the controller when timeout is reached', async () => {
        vi.useFakeTimers();

        let abortWasCalled = false;

        // Store reference to the real AbortController
        const OriginalAbortController = window.AbortController;

        // Mock AbortController to track abort calls
        window.AbortController = class MockAbortController {
            signal: AbortSignal;
            constructor() {
                const controller = new OriginalAbortController();
                this.signal = controller.signal;

                // Spy on abort
                const originalAbort = controller.abort.bind(controller);
                controller.abort = () => {
                    abortWasCalled = true;
                    originalAbort();
                };

                return controller;
            }
            abort() {}
        };

        // Create a promise that never resolves to simulate a hanging fetch
        fetchSpy.mockImplementation(() => new Promise(() => {}));

        const fetchPromise = fetchParsedHealthStatus({ timeoutMs: 1000 });

        // Fast-forward time to trigger the timeout
        await vi.advanceTimersByTimeAsync(1000);

        expect(abortWasCalled).toBe(true);

        // Restore original AbortController
        window.AbortController = OriginalAbortController;

        // Clean up the hanging promise (it will reject but we don't await it)
        fetchPromise.catch(() => {});
        vi.useRealTimers();
    });

    it('clears timeout after timeout error', async () => {
        const abortError = new DOMException('The operation was aborted.', 'AbortError');
        fetchSpy.mockRejectedValue(abortError);
        const mockTimeoutId = 456;
        setTimeoutSpy.mockReturnValue(mockTimeoutId as unknown as ReturnType<typeof setTimeout>);

        await expect(fetchParsedHealthStatus()).rejects.toThrow(RequestTimeoutError);

        expect(clearTimeoutSpy).toHaveBeenCalledWith(mockTimeoutId);
    });

    it('rethrows non-abort errors', async () => {
        const networkError = new Error('Network failure');
        fetchSpy.mockRejectedValue(networkError);

        await expect(fetchParsedHealthStatus()).rejects.toThrow('Network failure');
    });

    it('clears timeout after non-abort errors', async () => {
        const networkError = new Error('Network failure');
        fetchSpy.mockRejectedValue(networkError);
        const mockTimeoutId = 789;
        setTimeoutSpy.mockReturnValue(mockTimeoutId as unknown as ReturnType<typeof setTimeout>);

        await expect(fetchParsedHealthStatus()).rejects.toThrow('Network failure');

        expect(clearTimeoutSpy).toHaveBeenCalledWith(mockTimeoutId);
    });

    it('throws error when JSON parsing fails due to invalid schema', async () => {
        const invalidData = { invalid: 'data' };
        const mockResponse = {
            ok: true,
            json: vi.fn().mockResolvedValue(invalidData),
        } as unknown as Response;
        fetchSpy.mockResolvedValue(mockResponse);

        // ZodError should be thrown when schema validation fails
        await expect(fetchParsedHealthStatus()).rejects.toThrow();
    });
});

describe('checkHealthStatus', () => {
    it('returns true when health check succeeds', async () => {
        const mockHealthData = {
            status: 'healthy',
            service: 'grouchess-api',
            uptime: 12345,
            timestamp: new Date().toISOString(),
        };
        const mockResponse = {
            ok: true,
            json: vi.fn().mockResolvedValue(mockHealthData),
        } as unknown as Response;
        fetchSpy.mockResolvedValue(mockResponse);

        const result = await checkHealthStatus();

        expect(result).toBe(true);
    });

    it('returns false when API base URL is empty', async () => {
        vi.stubEnv('VITE_API_BASE_URL', '');

        const result = await checkHealthStatus();

        expect(result).toBe(false);
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('returns false when API base URL is undefined', async () => {
        vi.stubEnv('VITE_API_BASE_URL', undefined);

        const result = await checkHealthStatus();

        expect(result).toBe(false);
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('returns false when timeoutMs is invalid', async () => {
        const result = await checkHealthStatus({ timeoutMs: -1 });

        expect(result).toBe(false);
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('returns false when response is not ok', async () => {
        const mockResponse = {
            ok: false,
            status: 503,
        } as Response;
        fetchSpy.mockResolvedValue(mockResponse);

        const result = await checkHealthStatus();

        expect(result).toBe(false);
    });

    it('returns false when request times out', async () => {
        const abortError = new DOMException('The operation was aborted.', 'AbortError');
        fetchSpy.mockRejectedValue(abortError);

        const result = await checkHealthStatus();

        expect(result).toBe(false);
    });

    it('returns false when network error occurs', async () => {
        const networkError = new Error('Network failure');
        fetchSpy.mockRejectedValue(networkError);

        const result = await checkHealthStatus();

        expect(result).toBe(false);
    });

    it('uses custom timeout when provided', async () => {
        const mockHealthData = {
            status: 'healthy',
            service: 'grouchess-api',
            uptime: 12345,
            timestamp: new Date().toISOString(),
        };
        const mockResponse = {
            ok: true,
            json: vi.fn().mockResolvedValue(mockHealthData),
        } as unknown as Response;
        fetchSpy.mockResolvedValue(mockResponse);
        const setTimeoutSpy = vi.spyOn(window, 'setTimeout');

        await checkHealthStatus({ timeoutMs: 5000 });

        expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000);

        setTimeoutSpy.mockRestore();
    });

    it.each([
        {
            scenario: 'with default timeout (800ms)',
            timeoutMs: undefined,
            expectedTimeout: 800,
        },
        {
            scenario: 'with custom short timeout (100ms)',
            timeoutMs: 100,
            expectedTimeout: 100,
        },
        {
            scenario: 'with custom long timeout (10000ms)',
            timeoutMs: 10000,
            expectedTimeout: 10000,
        },
    ])('calls fetch with correct timeout $scenario', async ({ timeoutMs, expectedTimeout }) => {
        const mockHealthData = {
            status: 'healthy',
            service: 'grouchess-api',
            uptime: 12345,
            timestamp: new Date().toISOString(),
        };
        const mockResponse = {
            ok: true,
            json: vi.fn().mockResolvedValue(mockHealthData),
        } as unknown as Response;
        fetchSpy.mockResolvedValue(mockResponse);
        const setTimeoutSpy = vi.spyOn(window, 'setTimeout');

        await checkHealthStatus(timeoutMs !== undefined ? { timeoutMs } : undefined);

        expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), expectedTimeout);

        setTimeoutSpy.mockRestore();
    });
});
