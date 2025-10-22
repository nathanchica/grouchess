import jwt from 'jsonwebtoken';
import * as z from 'zod';

import env from '../config.js';

export const GameRoomTokenPayloadSchema = z.object({
    playerId: z.string(),
    roomId: z.string(),
});
export type GameRoomTokenPayload = z.infer<typeof GameRoomTokenPayloadSchema>;

const ALGORITHM = 'HS256';
const EXPIRES_IN = '7d'; // Long enough for typical game durations

/**
 * Generates a JWT token for the game room and player.
 * @param payload - The token payload containing playerId and roomId
 * @returns A signed JWT token
 */
export function generateGameRoomToken(payload: GameRoomTokenPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: EXPIRES_IN, algorithm: ALGORITHM });
}

/**
 * Verifies a JWT token and extracts the payload.
 * @param token - The JWT token to verify
 * @returns The token payload if valid, null if verification fails
 */
export function verifyGameRoomToken(token: string): GameRoomTokenPayload | null {
    try {
        const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITHM] });
        return GameRoomTokenPayloadSchema.parse(payload);
    } catch (error) {
        console.error('Error verifying game room token:', error instanceof Error ? error.message : error);
        return null;
    }
}
