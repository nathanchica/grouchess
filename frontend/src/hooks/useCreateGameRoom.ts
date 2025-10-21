import { useCallback, useEffect, useRef, useState } from 'react';

import type { RoomType } from '../providers/GameRoomProvider';
import type { PieceColor } from '../utils/pieces';

type CreateGameRoomResponse = {
    roomId: string;
    playerId: string;
};

type CreateGameRoomFn = (
    displayName: string,
    color: PieceColor | null,
    timeControlAlias: string | null,
    roomType: RoomType
) => Promise<CreateGameRoomResponse | null>;

type Payload = {
    createGameRoom: CreateGameRoomFn;
    loading: boolean;
    error: Error | null;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const ROOM_ENDPOINT = apiBaseUrl ? `${apiBaseUrl}/room` : null;

export function useCreateGameRoom(): Payload {
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const createGameRoom = useCallback<CreateGameRoomFn>(async (displayName, color, timeControlAlias, roomType) => {
        if (isMountedRef.current) {
            setLoading(true);
            setError(null);
        } else {
            return null;
        }

        if (!ROOM_ENDPOINT) {
            const endpointError = new Error('Room endpoint is not configured.');
            if (isMountedRef.current) {
                setError(endpointError);
            }
            return null;
        }

        try {
            const response = await fetch(ROOM_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    displayName,
                    color,
                    timeControlAlias,
                    roomType,
                }),
            });

            const responseText = await response.text();
            let payload: unknown = null;
            if (responseText) {
                try {
                    payload = JSON.parse(responseText) as unknown;
                } catch {
                    setError(new Error('Received invalid response when creating game room.'));
                    return null;
                }
            }

            if (!response.ok) {
                const errorMessage =
                    payload &&
                    typeof payload === 'object' &&
                    payload !== null &&
                    'error' in payload &&
                    typeof (payload as { error?: unknown }).error === 'string'
                        ? (payload as { error: string }).error
                        : 'Unable to create game room right now.';
                setError(new Error(errorMessage));
                return null;
            }

            const data = payload as CreateGameRoomResponse | null;
            if (!data || typeof data.roomId !== 'string' || typeof data.playerId !== 'string') {
                setError(new Error('Missing data when creating game room.'));
                return null;
            }

            setError(null);
            return data;
        } catch (caughtError) {
            const errorInstance = caughtError instanceof Error ? caughtError : new Error('Failed to create game room.');
            setError(errorInstance);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        createGameRoom,
        loading,
        error,
    };
}
