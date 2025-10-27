import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import type { PawnPromotion } from '@grouchess/chess';
import { io, Socket } from 'socket.io-client';
import invariant from 'tiny-invariant';

import { useGameRoom } from './GameRoomProvider';

import { type GameRoom, type Message } from '../utils/types';

type PieceMovedPayload = {
    fromIndex: number;
    toIndex: number;
    promotion?: PawnPromotion;
};

type GameRoomSocketContextType = {
    isConnected: boolean;
    isAuthenticated: boolean;
    lastPieceMovedPayload: PieceMovedPayload | null;
    connectToRoom: (token: string | null) => boolean;
    sendMovePiece: (fromIndex: number, toIndex: number, promotion?: PawnPromotion) => boolean;
    sendMessage: (type: Message['type'], content?: string) => boolean;
};

const GameRoomSocketContext = createContext<GameRoomSocketContextType>({
    isConnected: false,
    isAuthenticated: false,
    lastPieceMovedPayload: null,
    connectToRoom: () => false,
    sendMovePiece: () => false,
    sendMessage: () => false,
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
    const [lastPieceMovedPayload, setLastPieceMovedPayload] = useState<PieceMovedPayload | null>(null);
    const socketRef = useRef<Socket | null>(null);

    const connectToRoom = useCallback(
        (token: string | null): boolean => {
            // Cleanup existing socket
            if (socketRef.current) {
                socketRef.current.removeAllListeners();
                socketRef.current.disconnect();
                socketRef.current = null;
                setIsConnected(false);
                setIsAuthenticated(false);
            }

            if (!token) return false;

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
                const { messages } = gameRoom;
                setRoom({
                    ...gameRoom,
                    messages: messages.map((msg) => ({
                        ...msg,
                        createdAt: new Date(msg.createdAt),
                    })),
                });
            });
            newSocket.on('piece_moved', (payload: PieceMovedPayload) => {
                setLastPieceMovedPayload(payload);
            });
            newSocket.on('new_message', ({ message }: { message: Message }) => {
                addMessage({
                    ...message,
                    createdAt: new Date(message.createdAt),
                });
            });

            socketRef.current = newSocket;
            return true;
        },
        [setRoom, addMessage, setLastPieceMovedPayload]
    );

    const sendMovePiece = useCallback(
        (fromIndex: number, toIndex: number, promotion?: PawnPromotion): boolean => {
            if (socketRef.current && isConnected && isAuthenticated) {
                socketRef.current.emit('move_piece', { fromIndex, toIndex, promotion });
                return true;
            }
            return false;
        },
        [isConnected, isAuthenticated]
    );

    const sendMessage = useCallback(
        (type: Message['type'], content?: string): boolean => {
            if (socketRef.current && isConnected && isAuthenticated) {
                socketRef.current.emit('send_message', { type, content });
                return true;
            }
            return false;
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
        lastPieceMovedPayload,
        connectToRoom,
        sendMovePiece,
        sendMessage,
    };

    return <GameRoomSocketContext.Provider value={contextValue}>{children}</GameRoomSocketContext.Provider>;
}

export default GameRoomSocketProvider;
