import {
    JoinGameRoomRequestSchema,
    JoinGameRoomResponseSchema,
    ErrorResponseSchema,
    type JoinGameRoomResponse,
} from '@grouchess/http-schemas';
import { renderHook } from 'vitest-browser-react';

import { getEnv } from '../../utils/config';
import { fetchWithSchemasOrThrow } from '../../utils/fetch';
import { useJoinGameRoom } from '../useJoinGameRoom';

vi.mock('../../utils/fetch', () => ({
    fetchWithSchemasOrThrow: vi.fn(),
}));

const fetchWithSchemasOrThrowMock = vi.mocked(fetchWithSchemasOrThrow);

const roomId = 'room-123';

function createMockResponse(overrides: Partial<JoinGameRoomResponse> = {}): JoinGameRoomResponse {
    return {
        roomId: 'room-123',
        playerId: 'player-456',
        token: 'token-789',
        ...overrides,
    };
}

describe('useJoinGameRoom', () => {
    beforeEach(() => {
        fetchWithSchemasOrThrowMock.mockReset();
    });

    describe('joinGameRoom', () => {
        it('posts the payload to the join endpoint and resolves parsed data', async () => {
            const apiResponse = createMockResponse();
            let resolveFetch: ((value: JoinGameRoomResponse) => void) | undefined;
            fetchWithSchemasOrThrowMock.mockImplementation(
                () =>
                    new Promise<JoinGameRoomResponse>((resolve) => {
                        resolveFetch = resolve;
                    })
            );

            const onSuccess = vi.fn();
            const { result } = await renderHook(() => useJoinGameRoom(roomId));

            const joinPromise = result.current.joinGameRoom({
                displayName: 'Beta',
                onSuccess,
            });

            await vi.waitFor(() => expect(result.current.loading).toBe(true));

            resolveFetch?.(apiResponse);
            const resolvedData = await joinPromise;

            expect(resolvedData).toEqual(apiResponse);
            expect(onSuccess).toHaveBeenCalledWith(apiResponse);
            await vi.waitFor(() => expect(result.current.loading).toBe(false));
            expect(result.current.error).toBeNull();

            expect(fetchWithSchemasOrThrowMock).toHaveBeenCalledWith(
                `${getEnv().VITE_API_BASE_URL}/room/join/${roomId}`,
                {
                    method: 'POST',
                    requestSchema: JoinGameRoomRequestSchema,
                    successSchema: JoinGameRoomResponseSchema,
                    errorSchema: ErrorResponseSchema,
                    body: {
                        displayName: 'Beta',
                    },
                    errorMessage: 'Unable to join game room right now.',
                }
            );
        });

        it('posts with undefined displayName when not provided', async () => {
            const apiResponse = createMockResponse();
            fetchWithSchemasOrThrowMock.mockResolvedValue(apiResponse);

            const { result } = await renderHook(() => useJoinGameRoom(roomId));

            await result.current.joinGameRoom({});

            expect(fetchWithSchemasOrThrowMock).toHaveBeenCalledWith(
                `${getEnv().VITE_API_BASE_URL}/room/join/${roomId}`,
                expect.objectContaining({
                    body: {
                        displayName: undefined,
                    },
                })
            );
        });

        it('surfaces errors, calls onError, and resets loading state when request fails', async () => {
            const apiError = new Error('boom');
            fetchWithSchemasOrThrowMock.mockRejectedValue(apiError);

            const onError = vi.fn();
            const onSuccess = vi.fn();
            const { result } = await renderHook(() => useJoinGameRoom(roomId));

            const response = await result.current.joinGameRoom({
                displayName: 'Beta',
                onError,
                onSuccess,
            });

            expect(response).toBeNull();
            expect(onError).toHaveBeenCalledWith(apiError);
            expect(onSuccess).not.toHaveBeenCalled();
            await vi.waitFor(() => expect(result.current.error).toBe(apiError));
            await vi.waitFor(() => expect(result.current.loading).toBe(false));
        });

        it('prevents duplicate join requests while a previous one is loading', async () => {
            const apiResponse = createMockResponse({ roomId: 'room-999' });
            let resolveFetch: ((value: JoinGameRoomResponse) => void) | undefined;
            fetchWithSchemasOrThrowMock.mockImplementation(
                () =>
                    new Promise<JoinGameRoomResponse>((resolve) => {
                        resolveFetch = resolve;
                    })
            );

            const { result } = await renderHook(() => useJoinGameRoom(roomId));

            const firstCall = result.current.joinGameRoom({ displayName: 'Beta' });
            await vi.waitFor(() => expect(result.current.loading).toBe(true));

            const secondCall = await result.current.joinGameRoom({
                displayName: 'Second attempt',
            });

            expect(secondCall).toBeNull();
            expect(fetchWithSchemasOrThrowMock).toHaveBeenCalledTimes(1);

            resolveFetch?.(apiResponse);
            await firstCall;
            await vi.waitFor(() => expect(result.current.loading).toBe(false));
        });

        it('returns null and avoids network calls when invoked after unmount', async () => {
            const { result, unmount } = await renderHook(() => useJoinGameRoom(roomId));
            const joinGameRoom = result.current.joinGameRoom;

            unmount();

            const response = await joinGameRoom({ displayName: 'Beta' });

            expect(response).toBeNull();
            expect(fetchWithSchemasOrThrowMock).not.toHaveBeenCalled();
        });

        it('resolves outstanding requests without React warnings after unmount', async () => {
            const apiResponse = createMockResponse();
            let resolveFetch: ((value: JoinGameRoomResponse) => void) | undefined;
            fetchWithSchemasOrThrowMock.mockImplementation(
                () =>
                    new Promise<JoinGameRoomResponse>((resolve) => {
                        resolveFetch = resolve;
                    })
            );

            const { result, unmount } = await renderHook(() => useJoinGameRoom(roomId));
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const joinPromise = result.current.joinGameRoom({ displayName: 'Beta' });
            await vi.waitFor(() => expect(result.current.loading).toBe(true));

            unmount();

            resolveFetch?.(apiResponse);
            await expect(joinPromise).resolves.toEqual(apiResponse);

            const unmountedWarnings = consoleErrorSpy.mock.calls
                .flat()
                .filter(
                    (message) =>
                        typeof message === 'string' && message.includes('state update on an unmounted component')
                );

            expect(unmountedWarnings).toHaveLength(0);
            consoleErrorSpy.mockRestore();
        });

        it('uses roomId from hook parameter in request URL', async () => {
            const apiResponse = createMockResponse();
            fetchWithSchemasOrThrowMock.mockResolvedValue(apiResponse);

            const customRoomId = 'custom-room-456';
            const { result } = await renderHook(() => useJoinGameRoom(customRoomId));

            await result.current.joinGameRoom({ displayName: 'Beta' });

            expect(fetchWithSchemasOrThrowMock).toHaveBeenCalledWith(
                `${getEnv().VITE_API_BASE_URL}/room/join/${customRoomId}`,
                expect.any(Object)
            );
        });
    });
});
