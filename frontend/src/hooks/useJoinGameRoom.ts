import { useCallback, useEffect, useRef, useState } from 'react';

type JoinGameRoomResponse = {
    roomId: string;
    playerId: string;
    token: string;
};

type JoinGameRoomFn = (displayName?: string) => Promise<JoinGameRoomResponse | null>;

type Payload = {
    joinGameRoom: JoinGameRoomFn;
    loading: boolean;
    error: Error | null;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const ROOM_ENDPOINT = apiBaseUrl ? `${apiBaseUrl}/room` : null;

export function useJoinGameRoom(roomId: string): Payload {
    // Dual loading tracking: state for UI reactivity, ref for race condition prevention
    // - loading state triggers re-renders for UI updates (spinners, disabled buttons)
    // - loadingRef prevents duplicate requests without causing dependency array issues
    const [loading, setLoading] = useState<boolean>(false);
    const loadingRef = useRef(false);

    const [error, setError] = useState<Error | null>(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const joinGameRoom = useCallback<JoinGameRoomFn>(
        async (displayName) => {
            // Prevent duplicate requests
            if (loadingRef.current) {
                return null;
            }

            if (!isMountedRef.current) {
                return null;
            }

            if (!ROOM_ENDPOINT) {
                const endpointError = new Error('Room endpoint is not configured.');
                if (isMountedRef.current) {
                    setError(endpointError);
                }
                return null;
            }

            loadingRef.current = true;
            setLoading(true);
            setError(null);

            try {
                const response = await fetch(`${ROOM_ENDPOINT}/join/${roomId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        displayName: displayName || null,
                    }),
                });

                const responseText = await response.text();
                let payload: unknown = null;
                if (responseText) {
                    try {
                        payload = JSON.parse(responseText) as unknown;
                    } catch {
                        setError(new Error('Received invalid response when joining game room.'));
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
                            : 'Unable to join game room right now.';
                    setError(new Error(errorMessage));
                    return null;
                }

                const data = payload as JoinGameRoomResponse | null;
                if (
                    !data ||
                    typeof data.roomId !== 'string' ||
                    typeof data.playerId !== 'string' ||
                    typeof data.token !== 'string'
                ) {
                    setError(new Error('Missing data when joining game room.'));
                    return null;
                }

                setError(null);
                return data;
            } catch (caughtError) {
                const errorInstance =
                    caughtError instanceof Error ? caughtError : new Error('Failed to join game room.');
                setError(errorInstance);
                return null;
            } finally {
                if (isMountedRef.current) {
                    loadingRef.current = false;
                    setLoading(false);
                }
            }
        },
        [roomId]
    );

    return {
        joinGameRoom,
        loading,
        error,
    };
}
