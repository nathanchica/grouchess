import { useCallback, useState } from 'react';

import { GetChessGameResponseSchema, type GetChessGameResponse } from '@grouchess/http-schemas';

import { getEnv } from '../utils/config';

const { VITE_API_BASE_URL: API_BASE_URL } = getEnv();

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
        if (!roomId || !token) {
            const err = new Error('Room ID and token are required.');
            setError(err);
            onError?.(err);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`${API_BASE_URL}/room/${roomId}/chess-game`, {
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
