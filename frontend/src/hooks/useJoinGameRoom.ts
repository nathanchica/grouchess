import { useCallback } from 'react';

import {
    JoinGameRoomRequestSchema,
    JoinGameRoomResponseSchema,
    ErrorResponseSchema,
    type JoinGameRoomResponse,
} from '@grouchess/http-schemas';

import { useFetchWithSchema } from './useFetchWithSchema';

import { getEnv } from '../utils/config';

export type JoinGameRoomParams = {
    displayName?: string;
    onSuccess?: (data: JoinGameRoomResponse) => void;
    onError?: (error: Error) => void;
};

export type JoinGameRoomFn = (params?: JoinGameRoomParams) => Promise<JoinGameRoomResponse | null>;

export type UseJoinGameRoomPayload = {
    joinGameRoom: JoinGameRoomFn;
    loading: boolean;
    error: Error | null;
};

export function useJoinGameRoom(roomId: string): UseJoinGameRoomPayload {
    const { execute, loading, error } = useFetchWithSchema();

    const joinGameRoom = useCallback<JoinGameRoomFn>(
        async ({ displayName, onSuccess, onError }: JoinGameRoomParams = {}) => {
            return execute({
                url: `${getEnv().VITE_API_BASE_URL}/room/join/${roomId}`,
                method: 'POST',
                requestSchema: JoinGameRoomRequestSchema,
                successSchema: JoinGameRoomResponseSchema,
                errorSchema: ErrorResponseSchema,
                body: {
                    displayName: displayName as string, // if actually null/undefined, schema will default it to "Player 2"
                },
                errorMessage: 'Unable to join game room right now.',
                onSuccess,
                onError,
            });
        },
        [execute, roomId]
    );

    return {
        joinGameRoom,
        loading,
        error,
    };
}
