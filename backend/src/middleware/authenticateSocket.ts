import { Socket } from 'socket.io';

import { verifyGameRoomToken } from '../utils/token.js';

export interface AuthenticatedSocket extends Socket {
    playerId?: string;
    roomId?: string;
}

/**
 * Authentication middleware that runs on connection establishment.
 */
export async function authenticateSocket(socket: AuthenticatedSocket, next: (err?: Error) => void) {
    try {
        const token = socket.handshake.auth?.token;

        if (!token) {
            return next(new Error('Authentication required'));
        }

        const payload = verifyGameRoomToken(token);
        if (!payload) {
            return next(new Error('Invalid or expired token'));
        }
        const { playerId, roomId } = payload;

        // Attach user and room data to socket for use in all event handlers
        socket.playerId = playerId;
        socket.roomId = roomId;
        next();
    } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
    }
}
