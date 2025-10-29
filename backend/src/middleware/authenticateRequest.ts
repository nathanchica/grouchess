import { NextFunction, Request, Response } from 'express';

import { verifyGameRoomToken } from '../utils/token.js';

/**
 * Authentication middleware for HTTP requests that require game room access.
 * Verifies the JWT token and ensures it matches the requested room.
 */
export function authenticateRequest(req: Request, res: Response, next: NextFunction) {
    try {
        // Extract token from Authorization header (Bearer token)
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        const payload = verifyGameRoomToken(token);

        if (!payload) {
            res.status(401).json({ error: 'Invalid or expired token' });
            return;
        }

        const { playerId, roomId } = payload;

        // Verify that the token's roomId matches the requested roomId
        const requestedRoomId = req.params.roomId;
        if (roomId !== requestedRoomId) {
            res.status(403).json({ error: 'Token is not valid for this room' });
            return;
        }

        // Attach user and room data to request for use in route handlers
        req.playerId = playerId;
        req.roomId = roomId;

        next();
    } catch (error) {
        console.error('Request authentication error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
}
