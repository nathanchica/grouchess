import { InvalidInputError } from '@grouchess/errors';
import * as Sentry from '@sentry/react';
import type { Mock } from 'vitest';
import * as z from 'zod';

import { fetchWithSchemas, fetchWithSchemasOrThrow } from '../fetch';

vi.mock('@sentry/react', { spy: true });

let fetchSpy: Mock<typeof fetch>;

beforeEach(() => {
    fetchSpy = vi.spyOn(window, 'fetch');
});

afterEach(() => {
    fetchSpy.mockRestore();
});

describe('fetchWithSchemas', () => {
    it('sends validated JSON body and parses success response', async () => {
        const requestSchema = z.object({
            name: z.string().min(1),
            age: z.number().int(),
        });
        const responseSchema = z.object({
            id: z.string(),
            created: z.boolean(),
        });

        const mockResponseBody = { id: 'user-123', created: true };
        const mockResponse = {
            ok: true,
            status: 200,
            json: vi.fn().mockResolvedValue(mockResponseBody),
        } as unknown as Response;
        fetchSpy.mockResolvedValue(mockResponse);

        const result = await fetchWithSchemas('https://example.com/users', {
            method: 'POST',
            requestSchema,
            successSchema: responseSchema,
            body: { name: 'Alice', age: 30 },
        });

        expect(fetchSpy).toHaveBeenCalledWith('https://example.com/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: 'Alice', age: 30 }),
        });

        expect(result.ok).toBe(true);
        expect(result.kind).toBe('success');
        const successResult = result as Extract<typeof result, { ok: true; kind: 'success' }>;
        expect(successResult.status).toBe(200);
        expect(successResult.data).toEqual(mockResponseBody);
    });

    it('respects custom headers and does not override Content-Type', async () => {
        const requestSchema = z.object({
            value: z.string(),
        });
        const responseSchema = z.object({
            success: z.boolean(),
        });

        const mockResponseBody = { success: true };
        const mockResponse = {
            ok: true,
            status: 200,
            json: vi.fn().mockResolvedValue(mockResponseBody),
        } as unknown as Response;
        fetchSpy.mockResolvedValue(mockResponse);

        const headers = {
            'Content-Type': 'application/custom',
            Authorization: 'Bearer token',
        };

        const result = await fetchWithSchemas('https://example.com/custom', {
            method: 'POST',
            requestSchema,
            successSchema: responseSchema,
            body: { value: 'test' },
            headers,
        });

        expect(fetchSpy).toHaveBeenCalledWith('https://example.com/custom', {
            method: 'POST',
            headers,
            body: JSON.stringify({ value: 'test' }),
        });

        expect(result.ok).toBe(true);
        expect(result.kind).toBe('success');
        const successResult = result as Extract<typeof result, { ok: true; kind: 'success' }>;
        expect(successResult.status).toBe(200);
        expect(successResult.data).toEqual(mockResponseBody);
    });

    it('does not send body or Content-Type header when body is undefined', async () => {
        const responseSchema = z.object({
            status: z.string(),
        });

        const mockResponseBody = { status: 'ok' };
        const mockResponse = {
            ok: true,
            status: 200,
            json: vi.fn().mockResolvedValue(mockResponseBody),
        } as unknown as Response;
        fetchSpy.mockResolvedValue(mockResponse);

        const result = await fetchWithSchemas('/status', {
            successSchema: responseSchema,
        });

        expect(fetchSpy).toHaveBeenCalledTimes(1);
        const [url, options] = fetchSpy.mock.calls[0];

        expect(url).toBe('/status');
        expect(options!.method).toBe('GET');
        expect(options!.body).toBeUndefined();
        expect(options!.headers).toEqual({});

        expect(result.ok).toBe(true);
        expect(result.kind).toBe('success');
        const successResult = result as Extract<typeof result, { ok: true; kind: 'success' }>;
        expect(successResult.data).toEqual(mockResponseBody);
    });

    it('returns http-error result and parses error body when response is not ok', async () => {
        const errorSchema = z.object({
            error: z.string(),
            details: z.array(z.unknown()).optional(),
        });

        const mockErrorBody = { error: 'Server error', details: ['detail'] };
        const mockResponse = {
            ok: false,
            status: 500,
            json: vi.fn().mockResolvedValue(mockErrorBody),
        } as unknown as Response;
        fetchSpy.mockResolvedValue(mockResponse);

        const result = await fetchWithSchemas('/error', {
            successSchema: z.object({}), // unused in error case
            errorSchema,
        });

        expect(result.ok).toBe(false);
        expect(result.kind).toBe('http-error');
        const errorResult = result as Extract<typeof result, { ok: false; kind: 'http-error' }>;
        expect(errorResult.status).toBe(500);
        expect(errorResult.error).toEqual(mockErrorBody);
        expect(errorResult.cause).toBeUndefined();
    });

    it('returns http-error result with cause when JSON parsing fails for error responses', async () => {
        const errorSchema = z.object({
            error: z.string(),
        });

        const jsonError = new Error('Bad JSON');
        const mockResponse = {
            ok: false,
            status: 502,
            json: vi.fn().mockRejectedValue(jsonError),
        } as unknown as Response;
        fetchSpy.mockResolvedValue(mockResponse);

        const result = await fetchWithSchemas('/bad-json-error', {
            successSchema: z.object({}), // unused in error case
            errorSchema,
        });

        expect(result.ok).toBe(false);
        expect(result.kind).toBe('http-error');
        const errorResult = result as Extract<typeof result, { ok: false; kind: 'http-error' }>;
        expect(errorResult.status).toBe(502);
        expect(errorResult.error).toBeNull();
        expect(errorResult.cause).toBe(jsonError);
    });

    it('throws when error schema parsing fails', async () => {
        const errorSchema = z.object({
            error: z.string(),
        });

        const mockErrorBody = { message: 'unexpected shape' };
        const mockResponse = {
            ok: false,
            status: 400,
            json: vi.fn().mockResolvedValue(mockErrorBody),
        } as unknown as Response;
        fetchSpy.mockResolvedValue(mockResponse);

        await expect(
            fetchWithSchemas('/bad-error-shape', {
                successSchema: z.object({}), // unused
                errorSchema,
            })
        ).rejects.toThrow(z.ZodError);
    });

    it('returns http-error result with null error when no error schema is provided', async () => {
        const mockResponse = {
            ok: false,
            status: 404,
            json: vi.fn().mockResolvedValue({ error: 'Not found' }),
        } as unknown as Response;
        fetchSpy.mockResolvedValue(mockResponse);

        const result = await fetchWithSchemas('/not-found', {
            successSchema: z.object({}), // unused
        });

        expect(result.ok).toBe(false);
        expect(result.kind).toBe('http-error');
        const errorResult = result as Extract<typeof result, { ok: false; kind: 'http-error' }>;
        expect(errorResult.status).toBe(404);
        expect(errorResult.error).toBeNull();
    });

    it('throws when success schema validation fails', async () => {
        const responseSchema = z.object({
            id: z.number(),
        });

        const mockResponse = {
            ok: true,
            status: 200,
            json: vi.fn().mockResolvedValue({ id: 'not-a-number' }),
        } as unknown as Response;
        fetchSpy.mockResolvedValue(mockResponse);

        await expect(
            fetchWithSchemas('/invalid-response', {
                successSchema: responseSchema,
            })
        ).rejects.toThrow(z.ZodError);
    });

    it('returns network-error result when JSON parsing fails for success responses', async () => {
        const responseSchema = z.object({
            value: z.string(),
        });

        const jsonError = new Error('Bad JSON');
        const mockResponse = {
            ok: true,
            status: 200,
            json: vi.fn().mockRejectedValue(jsonError),
        } as unknown as Response;
        fetchSpy.mockResolvedValue(mockResponse);

        const result = await fetchWithSchemas('/bad-json-success', {
            successSchema: responseSchema,
        });

        expect(result.ok).toBe(false);
        expect(result.kind).toBe('network-error');
        const networkResult = result as Extract<typeof result, { ok: false; kind: 'network-error' }>;
        expect(networkResult.status).toBe(200);
        expect(networkResult.error).toBe(jsonError);
    });

    it('returns network-error result when fetch rejects with network error', async () => {
        const responseSchema = z.object({
            value: z.string(),
        });

        const networkError = new Error('Network failure');
        fetchSpy.mockRejectedValue(networkError);

        const result = await fetchWithSchemas('/network-error', {
            successSchema: responseSchema,
        });

        expect(result.ok).toBe(false);
        expect(result.kind).toBe('network-error');
        const networkResult = result as Extract<typeof result, { ok: false; kind: 'network-error' }>;
        expect(networkResult.status).toBeNull();
        expect(networkResult.error).toBe(networkError);
    });

    it('normalizes non-Error rejections from fetch into a network-error with a generic message', async () => {
        const responseSchema = z.object({
            value: z.string(),
        });

        fetchSpy.mockRejectedValue('some failure');

        const result = await fetchWithSchemas('/network-error-non-error', {
            successSchema: responseSchema,
        });

        expect(result.ok).toBe(false);
        expect(result.kind).toBe('network-error');
        const networkResult = result as Extract<typeof result, { ok: false; kind: 'network-error' }>;
        expect(networkResult.status).toBeNull();
        expect(networkResult.error).toBeInstanceOf(Error);
        expect(networkResult.error.message).toBe('Network error');
    });

    it('normalizes non-Error rejections from json() for error responses into a generic parse error', async () => {
        const errorSchema = z.object({
            error: z.string(),
        });

        const mockResponse = {
            ok: false,
            status: 500,
            json: vi.fn().mockRejectedValue('not an error'),
        } as unknown as Response;
        fetchSpy.mockResolvedValue(mockResponse);

        const result = await fetchWithSchemas('/bad-json-non-error', {
            successSchema: z.object({}), // unused
            errorSchema,
        });

        expect(result.ok).toBe(false);
        expect(result.kind).toBe('http-error');
        const errorResult = result as Extract<typeof result, { ok: false; kind: 'http-error' }>;
        expect(errorResult.status).toBe(500);
        expect(errorResult.error).toBeNull();
        expect(errorResult.cause).toBeInstanceOf(Error);
        expect(errorResult.cause?.message).toBe('Failed to parse JSON response');
    });

    it('validates request body using the request schema before sending', async () => {
        const requestSchema = z.object({
            name: z.string().min(2),
        });
        const responseSchema = z.object({
            ok: z.boolean(),
        });

        await expect(
            fetchWithSchemas('/invalid-request', {
                method: 'POST',
                requestSchema,
                successSchema: responseSchema,
                body: { name: '' },
            })
        ).rejects.toThrow(InvalidInputError);

        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('throws invariant error when body is provided without requestSchema', async () => {
        const responseSchema = z.object({
            ok: z.boolean(),
        });

        await expect(
            fetchWithSchemas('/no-schema', {
                method: 'POST',
                successSchema: responseSchema,
                body: { name: 'test' },
                // Using 'as unknown' to force the missing requestSchema error
            } as unknown as Parameters<typeof fetchWithSchemas>[1])
        ).rejects.toThrow('requestSchema is required when body is provided');

        expect(fetchSpy).not.toHaveBeenCalled();
    });
});

describe('fetchWithSchemasOrThrow', () => {
    let sentrySpy: Mock<typeof Sentry.captureException>;

    beforeEach(() => {
        sentrySpy = vi.spyOn(Sentry, 'captureException').mockImplementation(() => '');
    });

    afterEach(() => {
        sentrySpy.mockRestore();
    });

    describe('Success cases', () => {
        it('returns parsed data on successful response', async () => {
            const responseSchema = z.object({
                id: z.string(),
                name: z.string(),
            });

            const mockResponseBody = { id: 'user-123', name: 'Alice' };
            const mockResponse = {
                ok: true,
                status: 200,
                json: vi.fn().mockResolvedValue(mockResponseBody),
            } as unknown as Response;
            fetchSpy.mockResolvedValue(mockResponse);

            const result = await fetchWithSchemasOrThrow('/users/123', {
                successSchema: responseSchema,
                errorMessage: 'Failed to fetch user',
            });

            expect(result).toEqual(mockResponseBody);
            expect(sentrySpy).not.toHaveBeenCalled();
        });
    });

    describe('InvalidInputError handling', () => {
        it('rethrows InvalidInputError without logging to Sentry', async () => {
            const requestSchema = z.object({
                name: z.string().min(2),
            });
            const responseSchema = z.object({
                ok: z.boolean(),
            });

            await expect(
                fetchWithSchemasOrThrow('/create', {
                    method: 'POST',
                    requestSchema,
                    successSchema: responseSchema,
                    body: { name: '' },
                    errorMessage: 'Failed to create resource',
                })
            ).rejects.toThrow(InvalidInputError);

            expect(sentrySpy).not.toHaveBeenCalled();
            expect(fetchSpy).not.toHaveBeenCalled();
        });
    });

    describe('Other thrown errors handling', () => {
        it('logs invariant error to Sentry and throws generic error', async () => {
            const responseSchema = z.object({
                ok: z.boolean(),
            });

            const errorMessage = 'Failed to create resource';

            await expect(
                fetchWithSchemasOrThrow('/create', {
                    method: 'POST',
                    successSchema: responseSchema,
                    body: { name: 'test' },
                    errorMessage,
                    // Bypass TypeScript to trigger invariant
                } as unknown as Parameters<typeof fetchWithSchemasOrThrow>[1])
            ).rejects.toThrow(errorMessage);

            expect(sentrySpy).toHaveBeenCalledExactlyOnceWith(
                expect.objectContaining({
                    message: 'Invariant failed: requestSchema is required when body is provided',
                }),
                expect.objectContaining({
                    extra: {
                        url: '/create',
                        method: 'POST',
                    },
                })
            );
            expect(fetchSpy).not.toHaveBeenCalled();
        });

        it('logs ZodError to Sentry and throws generic error when success schema validation fails', async () => {
            const responseSchema = z.object({
                id: z.number(),
            });

            const mockResponse = {
                ok: true,
                status: 200,
                json: vi.fn().mockResolvedValue({ id: 'not-a-number' }),
            } as unknown as Response;
            fetchSpy.mockResolvedValue(mockResponse);

            const errorMessage = 'Failed to fetch data';

            await expect(
                fetchWithSchemasOrThrow('/data', {
                    successSchema: responseSchema,
                    errorMessage,
                })
            ).rejects.toThrow(errorMessage);

            expect(sentrySpy).toHaveBeenCalledExactlyOnceWith(
                expect.any(z.ZodError),
                expect.objectContaining({
                    extra: {
                        url: '/data',
                        method: 'GET',
                    },
                })
            );
        });

        it('logs ZodError to Sentry and throws generic error when error schema validation fails', async () => {
            const errorSchema = z.object({
                error: z.string(),
            });

            const mockResponse = {
                ok: false,
                status: 400,
                json: vi.fn().mockResolvedValue({ message: 'unexpected shape' }),
            } as unknown as Response;
            fetchSpy.mockResolvedValue(mockResponse);

            const errorMessage = 'Failed to process request';

            await expect(
                fetchWithSchemasOrThrow('/bad-error-shape', {
                    method: 'POST',
                    successSchema: z.object({}),
                    errorSchema,
                    errorMessage,
                })
            ).rejects.toThrow(errorMessage);

            expect(sentrySpy).toHaveBeenCalledExactlyOnceWith(
                expect.any(z.ZodError),
                expect.objectContaining({
                    extra: {
                        url: '/bad-error-shape',
                        method: 'POST',
                    },
                })
            );
        });
    });

    describe('HTTP error handling', () => {
        it('throws server error message without logging to Sentry', async () => {
            const errorSchema = z.object({
                error: z.string(),
            });

            const mockErrorBody = { error: 'Not found' };
            const mockResponse = {
                ok: false,
                status: 404,
                json: vi.fn().mockResolvedValue(mockErrorBody),
            } as unknown as Response;
            fetchSpy.mockResolvedValue(mockResponse);

            const errorMessage = 'Failed to fetch user';

            await expect(
                fetchWithSchemasOrThrow('/users/123', {
                    successSchema: z.object({}),
                    errorSchema,
                    errorMessage,
                })
            ).rejects.toThrow('Not found');

            expect(sentrySpy).not.toHaveBeenCalled();
        });

        it('throws generic error when JSON parsing fails, without logging to Sentry', async () => {
            const jsonError = new Error('Bad JSON');
            const mockResponse = {
                ok: false,
                status: 502,
                json: vi.fn().mockRejectedValue(jsonError),
            } as unknown as Response;
            fetchSpy.mockResolvedValue(mockResponse);

            const errorMessage = 'Failed to process request';

            await expect(
                fetchWithSchemasOrThrow('/bad-json-error', {
                    successSchema: z.object({}),
                    errorMessage,
                })
            ).rejects.toThrow(errorMessage);

            expect(sentrySpy).not.toHaveBeenCalled();
        });

        it('throws generic error without error schema, without logging to Sentry', async () => {
            const mockResponse = {
                ok: false,
                status: 500,
                json: vi.fn().mockResolvedValue({ error: 'Internal server error' }),
            } as unknown as Response;
            fetchSpy.mockResolvedValue(mockResponse);

            const errorMessage = 'Something went wrong';

            await expect(
                fetchWithSchemasOrThrow('/server-error', {
                    method: 'PUT',
                    successSchema: z.object({}),
                    errorMessage,
                })
            ).rejects.toThrow(errorMessage);

            expect(sentrySpy).not.toHaveBeenCalled();
        });
    });

    describe('Network error handling', () => {
        it('throws generic error without logging to Sentry', async () => {
            const networkError = new Error('Network failure');
            fetchSpy.mockRejectedValue(networkError);

            const errorMessage = 'Connection failed';

            await expect(
                fetchWithSchemasOrThrow('/users', {
                    successSchema: z.object({}),
                    errorMessage,
                })
            ).rejects.toThrow(errorMessage);

            expect(sentrySpy).not.toHaveBeenCalled();
        });

        it('throws generic error when JSON parsing fails for success response, without logging to Sentry', async () => {
            const jsonError = new Error('Bad JSON');
            const mockResponse = {
                ok: true,
                status: 200,
                json: vi.fn().mockRejectedValue(jsonError),
            } as unknown as Response;
            fetchSpy.mockResolvedValue(mockResponse);

            const errorMessage = 'Failed to parse response';

            await expect(
                fetchWithSchemasOrThrow('/bad-json-success', {
                    successSchema: z.object({}),
                    errorMessage,
                })
            ).rejects.toThrow(errorMessage);

            expect(sentrySpy).not.toHaveBeenCalled();
        });
    });
});
