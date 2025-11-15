import { useCallback, useEffect, useRef, useState } from 'react';

import { WaitingRoomSchema, type WaitingRoom } from '@grouchess/models';
import { useLocation } from 'react-router';

import { useAuth } from '../providers/AuthProvider';
import { useSocket } from '../providers/SocketProvider';
import { getStoredValue, setStoredValue } from '../utils/window';

function isWaitingRoomData(data: unknown): data is WaitingRoom {
    return WaitingRoomSchema.safeParse(data).success;
}

type Payload = {
    waitingRoomData: WaitingRoom | null;
    loadData: (data: unknown) => void;
};

/**
 * Fetches waiting room data from location state (passed from GameRoomForm upon creating a room) or session storage.
 * If there is no waiting room data, the user is a challenger joining via a shared link. They will receive the data upon
 * successfully joining the room, which can then be loaded via `loadData`, which will store it in session storage,
 * and update the waitingRoomData state.
 *
 * If a token from waitingRoomData is available, the socket connection will be authenticated and emit `wait_for_game`
 * upon success. This covers both the creator and challenger joining scenarios.
 */
export function useWaitingRoom(roomId: string): Payload {
    const { state: locationState } = useLocation();
    const { socket, authenticateSocket, isAuthenticated } = useSocket();
    const { loadData: loadAuthData } = useAuth();
    const isWaitingForGame = useRef<boolean>(false);

    const sessionStorageKey = `room:${roomId}`;

    const [waitingRoomData, setWaitingRoomData] = useState<WaitingRoom | null>(() => {
        if (locationState && isWaitingRoomData(locationState)) {
            return locationState;
        }

        const storedData = getStoredValue('sessionStorage', sessionStorageKey, null);
        if (storedData && isWaitingRoomData(storedData)) {
            return storedData;
        }

        return null;
    });

    const loadData = useCallback((data: unknown) => {
        if (isWaitingRoomData(data)) {
            setWaitingRoomData(data);
        }
    }, []);

    const onAuthenticated = useCallback(() => {
        // Prevent multiple emissions in case of re-renders
        if (isWaitingForGame.current) return;
        socket.emit('wait_for_game');
        isWaitingForGame.current = true;
    }, [socket]);

    /**
     * When waitingRoomData is available, authenticate the socket if not already done.
     */
    useEffect(() => {
        if (waitingRoomData && !isAuthenticated) {
            authenticateSocket(waitingRoomData.token, onAuthenticated);
        }
    }, [waitingRoomData, authenticateSocket, isAuthenticated, onAuthenticated]);

    /**
     * Persist waitingRoomData to session storage whenever it changes. Also load token into context.
     */
    useEffect(() => {
        if (waitingRoomData) {
            setStoredValue('sessionStorage', sessionStorageKey, waitingRoomData);
            loadAuthData({
                roomId: waitingRoomData.roomId,
                playerId: waitingRoomData.playerId,
                token: waitingRoomData.token,
            });
        }
    }, [waitingRoomData, sessionStorageKey, loadAuthData]);

    return { waitingRoomData, loadData };
}
