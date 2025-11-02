import jwt, { type Algorithm, type SignOptions } from 'jsonwebtoken';
import * as z from 'zod';

const DEFAULT_ALGORITHM: Algorithm = 'HS256';
const DEFAULT_EXPIRES_IN: SignOptions['expiresIn'] = '7d'; // Long enough for typical game durations

export const GameRoomTokenPayloadSchema = z.object({
    playerId: z.string(),
    roomId: z.string(),
});
export type GameRoomTokenPayload = z.infer<typeof GameRoomTokenPayloadSchema>;

export interface TokenService {
    generate(payload: GameRoomTokenPayload): string;
    verify(token: string): GameRoomTokenPayload | null;
}

export class JwtTokenService implements TokenService {
    private readonly secret: string;
    private readonly algorithm: Algorithm;
    private readonly expiresIn: SignOptions['expiresIn'];

    constructor(secret: string, options?: { algorithm?: Algorithm; expiresIn?: SignOptions['expiresIn'] }) {
        this.secret = secret;
        this.algorithm = options?.algorithm ?? DEFAULT_ALGORITHM;
        this.expiresIn = options?.expiresIn ?? DEFAULT_EXPIRES_IN;
    }

    generate(payload: GameRoomTokenPayload): string {
        return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn, algorithm: this.algorithm });
    }

    verify(token: string): GameRoomTokenPayload | null {
        try {
            const payload = jwt.verify(token, this.secret, { algorithms: [this.algorithm] });
            return GameRoomTokenPayloadSchema.parse(payload);
        } catch (error) {
            console.error(
                'Error verifying game room token:',
                error instanceof Error ? error.message : /* v8 ignore next -- @preserve */ error
            );
            return null;
        }
    }
}
