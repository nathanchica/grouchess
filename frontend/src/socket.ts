import type { ChessClientToServerEvents, ChessServerToClientEvents } from '@grouchess/socket-events';
import { io, type Socket } from 'socket.io-client';

const wsUrl = import.meta.env.VITE_WEBSOCKET_URL;
if (!wsUrl) {
    throw new Error('VITE_WEBSOCKET_URL is not defined');
}

export const socket: Socket<ChessServerToClientEvents, ChessClientToServerEvents> = io(wsUrl, {
    transports: ['websocket'],
    autoConnect: false,
});
export type SocketType = typeof socket;
