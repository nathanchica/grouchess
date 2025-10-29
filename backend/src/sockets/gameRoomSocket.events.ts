import { INITIAL_CHESS_BOARD_FEN } from '@grouchess/chess';
import type { ChessGameRoom } from '@grouchess/game-room';
import { Server } from 'socket.io';

import { AuthenticatedPayloadSchema, ErrorPayloadSchema, LoadGamePayloadSchema } from './gameRoomSocket.schemas.js';

import type { AuthenticatedSocket } from '../middleware/authenticateSocket.js';

export function sendErrorEvent(socket: AuthenticatedSocket, message: string) {
    socket.emit('error', ErrorPayloadSchema.parse({ message }));
}

export function sendAuthenticatedEvent(socket: AuthenticatedSocket, success: boolean) {
    socket.emit('authenticated', AuthenticatedPayloadSchema.parse({ success }));
}

export function sendLoadGameEvent(
    io: Server,
    target: string,
    gameRoom: ChessGameRoom,
    fen: string = INITIAL_CHESS_BOARD_FEN
) {
    io.to(target).emit('load_game', LoadGamePayloadSchema.parse({ gameRoom, fen }));
}
