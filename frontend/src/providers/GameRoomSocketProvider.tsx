import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { io, Socket } from 'socket.io-client';
import invariant from 'tiny-invariant';

import { useGameRoom } from './GameRoomProvider';

import { type GameRoom, type Message } from '../utils/types';

type GameRoomSocketContextType = {
    isConnected: boolean;
    isAuthenticated: boolean;
    connectToRoom: (token: string | null) => void;
    sendMessage: (type: Message['type'], content?: string) => void;
};

const GameRoomSocketContext = createContext<GameRoomSocketContextType>({
    isConnected: false,
    isAuthenticated: false,
    connectToRoom: () => {},
    sendMessage: () => {},
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
    const { setRoom, addMessage } = useGameRoom();

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
                setRoom({
                    ...gameRoom,
                    messages: gameRoom.messages.map((msg) => ({
                        ...msg,
                        createdAt: new Date(msg.createdAt),
                    })),
                });
            });
            newSocket.on('new_message', ({ message }: { message: Message }) => {
                addMessage({
                    ...message,
                    createdAt: new Date(message.createdAt),
                });
            });

            socketRef.current = newSocket;
        },
        [setRoom, addMessage]
    );

    const sendMessage = useCallback(
        (type: Message['type'], content?: string) => {
            if (socketRef.current && isConnected && isAuthenticated) {
                socketRef.current.emit('send_message', { type, content });
            }
        },
        [isConnected, isAuthenticated]
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
        sendMessage,
    };

    return <GameRoomSocketContext.Provider value={contextValue}>{children}</GameRoomSocketContext.Provider>;
}

export default GameRoomSocketProvider;
