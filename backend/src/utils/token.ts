import jwt from 'jsonwebtoken';

import env from '../config.js';

export type GameRoomTokenPayload = {
    playerId: string;
    roomId: string;
};

/**
 * Generates a JWT token for the game room and player.
 * @param payload - The token payload containing userId and roomId
 * @returns A signed JWT token
 */
export function generateGameRoomToken(payload: GameRoomTokenPayload): string {
    return jwt.sign(payload, env.JWT_SECRET);
}

/**
 * Verifies a JWT token and extracts the payload.
 * @param token - The JWT token to verify
 * @returns The token payload if valid, null if verification fails
 */
export function verifyGameRoomToken(token: string): GameRoomTokenPayload | null {
    try {
        return jwt.verify(token, env.JWT_SECRET) as GameRoomTokenPayload;
    } catch {
        return null;
    }
}
