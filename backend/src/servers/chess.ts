import type {
    ChessClientToServerEvents,
    ChessServerToClientEvents,
    ChessInterServerEvents,
    ChessSocketData,
} from '@grouchess/socket-events';
import { Server } from 'socket.io';

export const chessIO = new Server<
    ChessClientToServerEvents,
    ChessServerToClientEvents,
    ChessInterServerEvents,
    ChessSocketData
>();
export type ChessSocketServer = typeof chessIO;
