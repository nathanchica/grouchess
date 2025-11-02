import { Socket } from 'socket.io';

import type { TokenService } from '../services/tokenService.js';

/**
 * Factory for Socket.IO authentication middleware.
 */
export function createAuthenticateSocket({ tokenService }: { tokenService: TokenService }) {
    return async function authenticateSocket(socket: Socket, next: (err?: Error) => void) {
        try {
            const token = socket.handshake.auth?.token;

            if (!token) {
                return next(new Error('Authentication required'));
            }

            const payload = tokenService.verify(token);
            if (!payload) {
                return next(new Error('Invalid or expired token'));
            }
            const { playerId, roomId } = payload;

            // Attach user and room data to socket data for use in all event handlers
            socket.data.playerId = playerId;
            socket.data.roomId = roomId;
            next();
        } catch (error) {
            console.error('Socket authentication error:', error);
            next(new Error('Authentication failed'));
        }
    };
}
