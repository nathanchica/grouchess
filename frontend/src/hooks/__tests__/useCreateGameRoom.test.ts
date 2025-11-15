import {
    CreateGameRoomRequestSchema,
    CreateGameRoomResponseSchema,
    ErrorResponseSchema,
    type CreateGameRoomResponse,
} from '@grouchess/http-schemas';
import { renderHook } from 'vitest-browser-react';

import { getEnv } from '../../utils/config';
import { fetchWithSchemasOrThrow } from '../../utils/fetch';
import { useCreateGameRoom, type CreateGameRoomParams } from '../useCreateGameRoom';

vi.mock('../../utils/fetch', () => ({
    fetchWithSchemasOrThrow: vi.fn(),
}));

const fetchWithSchemasOrThrowMock = vi.mocked(fetchWithSchemasOrThrow);

const baseRequest: Omit<CreateGameRoomParams, 'onSuccess' | 'onError'> = {
    displayName: 'Alpha',
    color: 'white',
    timeControlAlias: '5|0',
    roomType: 'player-vs-player',
};

function createMockResponse(overrides: Partial<CreateGameRoomResponse> = {}): CreateGameRoomResponse {
    return {
        roomId: 'room-123',
        playerId: 'player-456',
        token: 'token-789',
        ...overrides,
    };
}

describe('useCreateGameRoom', () => {
    beforeEach(() => {
        fetchWithSchemasOrThrowMock.mockReset();
    });

    describe('createGameRoom', () => {
        it('posts the payload to the create endpoint and resolves parsed data', async () => {
            const apiResponse = createMockResponse();
            let resolveFetch: ((value: CreateGameRoomResponse) => void) | undefined;
            fetchWithSchemasOrThrowMock.mockImplementation(
                () =>
                    new Promise<CreateGameRoomResponse>((resolve) => {
                        resolveFetch = resolve;
                    })
            );

            const onSuccess = vi.fn();
            const { result } = await renderHook(() => useCreateGameRoom());

            const createPromise = result.current.createGameRoom({
                ...baseRequest,
                onSuccess,
            });

            await vi.waitFor(() => expect(result.current.loading).toBe(true));

            resolveFetch?.(apiResponse);
            const resolvedData = await createPromise;

            expect(resolvedData).toEqual(apiResponse);
            expect(onSuccess).toHaveBeenCalledWith(apiResponse);
            await vi.waitFor(() => expect(result.current.loading).toBe(false));
            expect(result.current.error).toBeNull();

            expect(fetchWithSchemasOrThrowMock).toHaveBeenCalledWith(`${getEnv().VITE_API_BASE_URL}/room`, {
                method: 'POST',
                requestSchema: CreateGameRoomRequestSchema,
                successSchema: CreateGameRoomResponseSchema,
                errorSchema: ErrorResponseSchema,
                body: {
                    displayName: baseRequest.displayName,
                    color: baseRequest.color,
                    timeControlAlias: baseRequest.timeControlAlias,
                    roomType: baseRequest.roomType,
                },
                errorMessage: 'Unable to create game room right now.',
            });
        });

        it('surfaces errors, calls onError, and resets loading state when request fails', async () => {
            const apiError = new Error('boom');
            fetchWithSchemasOrThrowMock.mockRejectedValue(apiError);

            const onError = vi.fn();
            const onSuccess = vi.fn();
            const { result } = await renderHook(() => useCreateGameRoom());

            const response = await result.current.createGameRoom({
                ...baseRequest,
                onError,
                onSuccess,
            });

            expect(response).toBeNull();
            expect(onError).toHaveBeenCalledWith(apiError);
            expect(onSuccess).not.toHaveBeenCalled();
            await vi.waitFor(() => expect(result.current.error).toBe(apiError));
            await vi.waitFor(() => expect(result.current.loading).toBe(false));
        });

        it('prevents duplicate create requests while a previous one is loading', async () => {
            const apiResponse = createMockResponse({ roomId: 'room-999' });
            let resolveFetch: ((value: CreateGameRoomResponse) => void) | undefined;
            fetchWithSchemasOrThrowMock.mockImplementation(
                () =>
                    new Promise<CreateGameRoomResponse>((resolve) => {
                        resolveFetch = resolve;
                    })
            );

            const { result } = await renderHook(() => useCreateGameRoom());

            const firstCall = result.current.createGameRoom(baseRequest);
            await vi.waitFor(() => expect(result.current.loading).toBe(true));

            const secondCall = await result.current.createGameRoom({
                ...baseRequest,
                displayName: 'Second attempt',
            });

            expect(secondCall).toBeNull();
            expect(fetchWithSchemasOrThrowMock).toHaveBeenCalledTimes(1);

            resolveFetch?.(apiResponse);
            await firstCall;
            await vi.waitFor(() => expect(result.current.loading).toBe(false));
        });

        it('returns null and avoids network calls when invoked after unmount', async () => {
            const { result, unmount } = await renderHook(() => useCreateGameRoom());
            const createGameRoom = result.current.createGameRoom;

            unmount();

            const response = await createGameRoom(baseRequest);

            expect(response).toBeNull();
            expect(fetchWithSchemasOrThrowMock).not.toHaveBeenCalled();
        });

        it('resolves outstanding requests without React warnings after unmount', async () => {
            const apiResponse = createMockResponse();
            let resolveFetch: ((value: CreateGameRoomResponse) => void) | undefined;
            fetchWithSchemasOrThrowMock.mockImplementation(
                () =>
                    new Promise<CreateGameRoomResponse>((resolve) => {
                        resolveFetch = resolve;
                    })
            );

            const { result, unmount } = await renderHook(() => useCreateGameRoom());
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const createPromise = result.current.createGameRoom(baseRequest);
            await vi.waitFor(() => expect(result.current.loading).toBe(true));

            unmount();

            resolveFetch?.(apiResponse);
            await expect(createPromise).resolves.toEqual(apiResponse);

            const unmountedWarnings = consoleErrorSpy.mock.calls
                .flat()
                .filter(
                    (message) =>
                        typeof message === 'string' && message.includes('state update on an unmounted component')
                );

            expect(unmountedWarnings).toHaveLength(0);
            consoleErrorSpy.mockRestore();
        });
    });
});
