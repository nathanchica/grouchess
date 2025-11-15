import { useCallback } from 'react';

import { GetChessGameResponseSchema, type GetChessGameResponse } from '@grouchess/http-schemas';

import { useFetchWithSchema } from './useFetchWithSchema';

import { getEnv } from '../utils/config';

export type FetchChessGameDataParams = {
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
    const { execute, loading, error } = useFetchWithSchema();

    const fetchChessGameData = useCallback(
        async ({ roomId, token, onSuccess, onError }: FetchChessGameDataParams) => {
            await execute({
                url: `${getEnv().VITE_API_BASE_URL}/room/${roomId}/chess-game`,
                successSchema: GetChessGameResponseSchema,
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                errorMessage: 'Unable to load chess game right now.',
                onSuccess,
                onError,
            });
        },
        [execute]
    );

    return {
        fetchChessGameData,
        loading,
        error,
    };
}
