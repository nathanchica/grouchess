import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { io, Socket } from 'socket.io-client';
import invariant from 'tiny-invariant';

import { useGameRoom } from './GameRoomProvider';

import { type GameRoom } from '../utils/types';

type GameRoomSocketContextType = {
    isConnected: boolean;
    isAuthenticated: boolean;
    connectToRoom: (token: string | null) => void;
};

const GameRoomSocketContext = createContext<GameRoomSocketContextType>({
    isConnected: false,
    isAuthenticated: false,
    connectToRoom: () => {},
});

export function useGameRoomSocket(): GameRoomSocketContextType {
    const context = useContext(GameRoomSocketContext);
    invariant(context, 'useGameRoomSocket must be used within GameRoomSocketProvider');
    return context;
}

type Props = {
    children: ReactNode;
};

function GameRoomSocketProvider({ children }: Props) {
    const { setRoom } = useGameRoom();

    const [isConnected, setIsConnected] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    const connectToRoom = useCallback(
        (token: string | null) => {
            // Cleanup existing socket
            if (socketRef.current) {
                socketRef.current.removeAllListeners();
                socketRef.current.disconnect();
                socketRef.current = null;
                setIsConnected(false);
                setIsAuthenticated(false);
            }

            if (!token) return;

            const wsUrl = import.meta.env.VITE_WEBSOCKET_URL;
            if (!wsUrl) {
                throw new Error('VITE_WEBSOCKET_URL is not defined');
            }

            const newSocket = io(wsUrl, {
                transports: ['websocket'],
                auth: { token },
            });

            newSocket.on('connect', () => setIsConnected(true));
            newSocket.on('disconnect', () => {
                setIsConnected(false);
                setIsAuthenticated(false);
            });
            newSocket.on('authenticated', () => {
                setIsAuthenticated(true);
                newSocket.emit('join_game_room');
            });
            newSocket.on('error', (error: string) => {
                // TODO: handle error appropriately
                console.error('Socket error:', error);
            });
            newSocket.on('game_room_ready', ({ gameRoom }: { gameRoom: GameRoom }) => {
                setRoom(gameRoom);
            });

            socketRef.current = newSocket;
        },
        [setRoom]
    );

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (socketRef.current) {
                socketRef.current.removeAllListeners();
                socketRef.current.disconnect();
            }
        };
    }, []);

    const contextValue: GameRoomSocketContextType = {
        isConnected,
        isAuthenticated,
        connectToRoom,
    };

    return <GameRoomSocketContext.Provider value={contextValue}>{children}</GameRoomSocketContext.Provider>;
}

export default GameRoomSocketProvider;
