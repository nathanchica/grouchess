import { useCallback, useState } from 'react';

import { GetChessGameResponseSchema, type GetChessGameResponse } from '@grouchess/http-schemas';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

type FetchChessGameDataParams = {
    roomId: string;
    token: string;
    onSuccess?: (data: GetChessGameResponse) => void;
    onError?: (error: Error) => void;
};

type UseFetchChessGameResult = {
    fetchChessGameData: (params: FetchChessGameDataParams) => Promise<void>;
    loading: boolean;
    error: Error | null;
};

export function useFetchChessGame(): UseFetchChessGameResult {
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchChessGameData = useCallback(async ({ roomId, token, onSuccess, onError }: FetchChessGameDataParams) => {
        if (!apiBaseUrl) {
            const err = new Error('API base URL is not configured.');
            setError(err);
            onError?.(err);
            return;
        }

        if (!roomId || !token) {
            const err = new Error('Room ID and token are required.');
            setError(err);
            onError?.(err);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`${apiBaseUrl}/room/${roomId}/chess-game`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Unable to load chess game right now.');
            }

            const json = await response.json();
            const parsed = GetChessGameResponseSchema.parse(json);
            onSuccess?.(parsed);
        } catch (fetchError) {
            const err = fetchError instanceof Error ? fetchError : new Error('Failed to load chess game.');
            setError(err);
            onError?.(err);
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        fetchChessGameData,
        loading,
        error,
    };
}
