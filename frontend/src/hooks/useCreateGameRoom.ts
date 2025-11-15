import { useCallback } from 'react';

import {
    CreateGameRoomRequestSchema,
    CreateGameRoomResponseSchema,
    ErrorResponseSchema,
    type CreateGameRoomResponse,
} from '@grouchess/http-schemas';
import type { PieceColor, RoomType } from '@grouchess/models';

import { useFetchWithSchema } from './useFetchWithSchema';

import { getEnv } from '../utils/config';

export type CreateGameRoomParams = {
    displayName: string | null;
    color: PieceColor | null;
    timeControlAlias: string | null;
    roomType: RoomType;
    onSuccess?: (data: CreateGameRoomResponse) => void;
    onError?: (error: Error) => void;
};

export type CreateGameRoomFn = (params: CreateGameRoomParams) => Promise<CreateGameRoomResponse | null>;

export type UseCreateGameRoomPayload = {
    createGameRoom: CreateGameRoomFn;
    loading: boolean;
    error: Error | null;
};

export function useCreateGameRoom(): UseCreateGameRoomPayload {
    const { execute, loading, error } = useFetchWithSchema();

    const createGameRoom = useCallback<CreateGameRoomFn>(
        async ({ displayName, color, timeControlAlias, roomType, onSuccess, onError }) => {
            return execute({
                url: `${getEnv().VITE_API_BASE_URL}/room`,
                method: 'POST',
                requestSchema: CreateGameRoomRequestSchema,
                successSchema: CreateGameRoomResponseSchema,
                errorSchema: ErrorResponseSchema,
                body: {
                    displayName: displayName,
                    color,
                    timeControlAlias,
                    roomType,
                },
                errorMessage: 'Unable to create game room right now.',
                onSuccess,
                onError,
            });
        },
        [execute]
    );

    return {
        createGameRoom,
        loading,
        error,
    };
}
