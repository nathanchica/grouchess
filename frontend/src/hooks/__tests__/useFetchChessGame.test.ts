import { GetChessGameResponseSchema, type GetChessGameResponse } from '@grouchess/http-schemas';
import { createMockChessGame, createMockChessGameRoom, createMockChessClockState } from '@grouchess/test-utils';
import { renderHook } from 'vitest-browser-react';

import { getEnv } from '../../utils/config';
import { fetchWithSchemasOrThrow } from '../../utils/fetch';
import { useFetchChessGame, type FetchChessGameDataParams } from '../useFetchChessGame';

vi.mock('../../utils/fetch', () => ({
    fetchWithSchemasOrThrow: vi.fn(),
}));

const fetchWithSchemasOrThrowMock = vi.mocked(fetchWithSchemasOrThrow);

const baseRequest: Omit<FetchChessGameDataParams, 'onSuccess' | 'onError'> = {
    roomId: 'room-123',
    token: 'token-789',
};

function createMockResponse(overrides: Partial<GetChessGameResponse> = {}): GetChessGameResponse {
    return {
        gameRoom: createMockChessGameRoom({ id: 'room-123' }),
        chessGame: createMockChessGame(),
        messages: [],
        clockState: createMockChessClockState(),
        playerId: 'player-123',
        ...overrides,
    };
}

describe('useFetchChessGame', () => {
    beforeEach(() => {
        fetchWithSchemasOrThrowMock.mockReset();
    });

    describe('fetchChessGameData', () => {
        it('fetches chess game data from the correct endpoint with authorization', async () => {
            const apiResponse = createMockResponse();
            let resolveFetch: ((value: GetChessGameResponse) => void) | undefined;
            fetchWithSchemasOrThrowMock.mockImplementation(
                () =>
                    new Promise<GetChessGameResponse>((resolve) => {
                        resolveFetch = resolve;
                    })
            );

            const onSuccess = vi.fn();
            const { result } = await renderHook(() => useFetchChessGame());

            const fetchPromise = result.current.fetchChessGameData({
                ...baseRequest,
                onSuccess,
            });

            await vi.waitFor(() => expect(result.current.loading).toBe(true));

            resolveFetch?.(apiResponse);
            await fetchPromise;

            expect(onSuccess).toHaveBeenCalledWith(apiResponse);
            await vi.waitFor(() => expect(result.current.loading).toBe(false));
            expect(result.current.error).toBeNull();

            expect(fetchWithSchemasOrThrowMock).toHaveBeenCalledWith(
                `${getEnv().VITE_API_BASE_URL}/room/${baseRequest.roomId}/chess-game`,
                {
                    successSchema: GetChessGameResponseSchema,
                    headers: {
                        Authorization: `Bearer ${baseRequest.token}`,
                    },
                    errorMessage: 'Unable to load chess game right now.',
                }
            );
        });

        it('surfaces errors, calls onError, and resets loading state when request fails', async () => {
            const apiError = new Error('Network failure');
            fetchWithSchemasOrThrowMock.mockRejectedValue(apiError);

            const onError = vi.fn();
            const onSuccess = vi.fn();
            const { result } = await renderHook(() => useFetchChessGame());

            await result.current.fetchChessGameData({
                ...baseRequest,
                onError,
                onSuccess,
            });

            expect(onError).toHaveBeenCalledWith(apiError);
            expect(onSuccess).not.toHaveBeenCalled();
            await vi.waitFor(() => expect(result.current.error).toBe(apiError));
            await vi.waitFor(() => expect(result.current.loading).toBe(false));
        });

        it('clears previous errors when a new request starts', async () => {
            const firstError = new Error('First error');
            fetchWithSchemasOrThrowMock.mockRejectedValueOnce(firstError);

            const { result } = await renderHook(() => useFetchChessGame());

            // First request fails
            await result.current.fetchChessGameData(baseRequest);
            await vi.waitFor(() => expect(result.current.error).toBe(firstError));

            // Second request starts successfully
            let resolveFetch: ((value: GetChessGameResponse) => void) | undefined;
            fetchWithSchemasOrThrowMock.mockImplementation(
                () =>
                    new Promise<GetChessGameResponse>((resolve) => {
                        resolveFetch = resolve;
                    })
            );

            const fetchPromise = result.current.fetchChessGameData(baseRequest);

            await vi.waitFor(() => expect(result.current.loading).toBe(true));
            expect(result.current.error).toBeNull();

            resolveFetch?.(createMockResponse());
            await fetchPromise;

            await vi.waitFor(() => expect(result.current.loading).toBe(false));
            expect(result.current.error).toBeNull();
        });

        it('works without onSuccess and onError callbacks', async () => {
            const apiResponse = createMockResponse();
            fetchWithSchemasOrThrowMock.mockResolvedValue(apiResponse);

            const { result } = await renderHook(() => useFetchChessGame());

            await expect(
                result.current.fetchChessGameData({
                    roomId: baseRequest.roomId,
                    token: baseRequest.token,
                })
            ).resolves.toBeUndefined();

            await vi.waitFor(() => expect(result.current.loading).toBe(false));
            expect(result.current.error).toBeNull();
        });
    });
});
