import { renderHook } from 'vitest-browser-react';
import * as z from 'zod';

import { fetchWithSchemasOrThrow } from '../../utils/fetch';
import { useFetchWithSchema } from '../useFetchWithSchema';

vi.mock('../../utils/fetch', () => ({
    fetchWithSchemasOrThrow: vi.fn(),
}));

const fetchWithSchemasOrThrowMock = vi.mocked(fetchWithSchemasOrThrow);

const UserSchema = z.object({
    id: z.string(),
    name: z.string(),
});

type User = z.infer<typeof UserSchema>;

const ErrorSchema = z.object({
    message: z.string(),
});

function createMockUser(overrides: Partial<User> = {}): User {
    return {
        id: 'user-123',
        name: 'Alice',
        ...overrides,
    };
}

describe('useFetchWithSchema', () => {
    beforeEach(() => {
        fetchWithSchemasOrThrowMock.mockReset();
    });

    describe('execute', () => {
        it('fetches data and calls onSuccess callback', async () => {
            const mockUser = createMockUser();
            let resolveFetch: ((value: User) => void) | undefined;
            fetchWithSchemasOrThrowMock.mockImplementation(
                () =>
                    new Promise<User>((resolve) => {
                        resolveFetch = resolve;
                    })
            );

            const onSuccess = vi.fn();
            const { result } = await renderHook(() => useFetchWithSchema());

            const executePromise = result.current.execute({
                url: '/api/users/123',
                successSchema: UserSchema,
                errorMessage: 'Failed to fetch user',
                onSuccess,
            });

            await vi.waitFor(() => expect(result.current.loading).toBe(true));

            resolveFetch?.(mockUser);
            const resolvedData = await executePromise;

            expect(resolvedData).toEqual(mockUser);
            expect(onSuccess).toHaveBeenCalledWith(mockUser);
            await vi.waitFor(() => expect(result.current.loading).toBe(false));
            expect(result.current.error).toBeNull();

            expect(fetchWithSchemasOrThrowMock).toHaveBeenCalledWith('/api/users/123', {
                successSchema: UserSchema,
                errorMessage: 'Failed to fetch user',
            });
        });

        it('handles POST requests with body', async () => {
            const mockUser = createMockUser();
            fetchWithSchemasOrThrowMock.mockResolvedValue(mockUser);

            const CreateUserSchema = z.object({
                name: z.string(),
            });

            const { result } = await renderHook(() => useFetchWithSchema());

            await result.current.execute({
                url: '/api/users',
                method: 'POST',
                requestSchema: CreateUserSchema,
                successSchema: UserSchema,
                errorSchema: ErrorSchema,
                body: { name: 'Alice' },
                errorMessage: 'Failed to create user',
            });

            expect(fetchWithSchemasOrThrowMock).toHaveBeenCalledWith('/api/users', {
                method: 'POST',
                requestSchema: CreateUserSchema,
                successSchema: UserSchema,
                errorSchema: ErrorSchema,
                body: { name: 'Alice' },
                errorMessage: 'Failed to create user',
            });
        });

        it('handles custom headers', async () => {
            const mockUser = createMockUser();
            fetchWithSchemasOrThrowMock.mockResolvedValue(mockUser);

            const { result } = await renderHook(() => useFetchWithSchema());

            await result.current.execute({
                url: '/api/users/123',
                successSchema: UserSchema,
                headers: {
                    Authorization: 'Bearer token-123',
                },
                errorMessage: 'Failed to fetch user',
            });

            expect(fetchWithSchemasOrThrowMock).toHaveBeenCalledWith('/api/users/123', {
                successSchema: UserSchema,
                headers: {
                    Authorization: 'Bearer token-123',
                },
                errorMessage: 'Failed to fetch user',
            });
        });

        it('surfaces errors, calls onError, and resets loading state', async () => {
            const apiError = new Error('Network failure');
            fetchWithSchemasOrThrowMock.mockRejectedValue(apiError);

            const onError = vi.fn();
            const onSuccess = vi.fn();
            const { result } = await renderHook(() => useFetchWithSchema());

            const response = await result.current.execute({
                url: '/api/users/123',
                successSchema: UserSchema,
                errorMessage: 'Failed to fetch user',
                onSuccess,
                onError,
            });

            expect(response).toBeNull();
            expect(onError).toHaveBeenCalledWith(apiError);
            expect(onSuccess).not.toHaveBeenCalled();
            await vi.waitFor(() => expect(result.current.error).toBe(apiError));
            await vi.waitFor(() => expect(result.current.loading).toBe(false));
        });

        it('prevents duplicate requests while a previous one is loading', async () => {
            const mockUser = createMockUser({ id: 'user-999' });
            let resolveFetch: ((value: User) => void) | undefined;
            fetchWithSchemasOrThrowMock.mockImplementation(
                () =>
                    new Promise<User>((resolve) => {
                        resolveFetch = resolve;
                    })
            );

            const { result } = await renderHook(() => useFetchWithSchema());

            const firstCall = result.current.execute({
                url: '/api/users/123',
                successSchema: UserSchema,
                errorMessage: 'Failed to fetch user',
            });
            await vi.waitFor(() => expect(result.current.loading).toBe(true));

            const secondCall = await result.current.execute({
                url: '/api/users/456',
                successSchema: UserSchema,
                errorMessage: 'Failed to fetch user',
            });

            expect(secondCall).toBeNull();
            expect(fetchWithSchemasOrThrowMock).toHaveBeenCalledTimes(1);

            resolveFetch?.(mockUser);
            await firstCall;
            await vi.waitFor(() => expect(result.current.loading).toBe(false));
        });

        it('returns null and avoids network calls when invoked after unmount', async () => {
            const { result, unmount } = await renderHook(() => useFetchWithSchema());
            const execute = result.current.execute;

            unmount();

            const response = await execute({
                url: '/api/users/123',
                successSchema: UserSchema,
                errorMessage: 'Failed to fetch user',
            });

            expect(response).toBeNull();
            expect(fetchWithSchemasOrThrowMock).not.toHaveBeenCalled();
        });

        it('resolves outstanding requests without React warnings after unmount', async () => {
            const mockUser = createMockUser();
            let resolveFetch: ((value: User) => void) | undefined;
            fetchWithSchemasOrThrowMock.mockImplementation(
                () =>
                    new Promise<User>((resolve) => {
                        resolveFetch = resolve;
                    })
            );

            const { result, unmount } = await renderHook(() => useFetchWithSchema());
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const executePromise = result.current.execute({
                url: '/api/users/123',
                successSchema: UserSchema,
                errorMessage: 'Failed to fetch user',
            });
            await vi.waitFor(() => expect(result.current.loading).toBe(true));

            unmount();

            resolveFetch?.(mockUser);
            await expect(executePromise).resolves.toEqual(mockUser);

            const unmountedWarnings = consoleErrorSpy.mock.calls
                .flat()
                .filter(
                    (message) =>
                        typeof message === 'string' && message.includes('state update on an unmounted component')
                );

            expect(unmountedWarnings).toHaveLength(0);
            consoleErrorSpy.mockRestore();
        });

        it('clears previous errors when a new request starts', async () => {
            const firstError = new Error('First error');
            fetchWithSchemasOrThrowMock.mockRejectedValueOnce(firstError);

            const { result } = await renderHook(() => useFetchWithSchema());

            // First request fails
            await result.current.execute({
                url: '/api/users/123',
                successSchema: UserSchema,
                errorMessage: 'Failed to fetch user',
            });
            await vi.waitFor(() => expect(result.current.error).toBe(firstError));

            // Second request starts successfully
            const mockUser = createMockUser();
            let resolveFetch: ((value: User) => void) | undefined;
            fetchWithSchemasOrThrowMock.mockImplementation(
                () =>
                    new Promise<User>((resolve) => {
                        resolveFetch = resolve;
                    })
            );

            const executePromise = result.current.execute({
                url: '/api/users/123',
                successSchema: UserSchema,
                errorMessage: 'Failed to fetch user',
            });

            await vi.waitFor(() => expect(result.current.loading).toBe(true));
            expect(result.current.error).toBeNull();

            resolveFetch?.(mockUser);
            await executePromise;

            await vi.waitFor(() => expect(result.current.loading).toBe(false));
            expect(result.current.error).toBeNull();
        });

        it('works without onSuccess and onError callbacks', async () => {
            const mockUser = createMockUser();
            fetchWithSchemasOrThrowMock.mockResolvedValue(mockUser);

            const { result } = await renderHook(() => useFetchWithSchema());

            const response = await result.current.execute({
                url: '/api/users/123',
                successSchema: UserSchema,
                errorMessage: 'Failed to fetch user',
            });

            expect(response).toEqual(mockUser);
            await vi.waitFor(() => expect(result.current.loading).toBe(false));
            expect(result.current.error).toBeNull();
        });
    });
});
