import type { ChessClientToServerEvents, ChessServerToClientEvents } from '@grouchess/socket-events';
import { io, type Socket } from 'socket.io-client';

import { getEnv } from './utils/config';

export const socket: Socket<ChessServerToClientEvents, ChessClientToServerEvents> = io(getEnv().VITE_WEBSOCKET_URL, {
    transports: ['websocket'],
    autoConnect: false,
});
export type SocketType = typeof socket;
