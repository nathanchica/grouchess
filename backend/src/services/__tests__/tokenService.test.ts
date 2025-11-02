import jwt, { type JwtPayload } from 'jsonwebtoken';

import { JwtTokenService } from '../tokenService.js';

const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;
const TEST_SECRET = 'test-jwt-secret';

describe('JwtTokenService.generate', () => {
    it('creates a signed token containing the payload and 7 day expiry', () => {
        const service = new JwtTokenService(TEST_SECRET);
        const payload = { playerId: 'player-123', roomId: 'room-456' };

        const token = service.generate(payload);
        const decoded = jwt.verify(token, TEST_SECRET, { algorithms: ['HS256'] }) as JwtPayload & typeof payload;

        const { exp, iat, ...decodedPayload } = decoded;

        expect(decodedPayload).toEqual(payload);
        expect(typeof exp).toBe('number');
        expect(typeof iat).toBe('number');
        expect(exp! - iat!).toBe(SEVEN_DAYS_IN_SECONDS);
    });
});

describe('JwtTokenService.verify', () => {
    const validPayload = { playerId: 'player-abc', roomId: 'room-def' };

    it('returns the payload for a valid token', () => {
        const consoleSpy = vi.spyOn(console, 'error');

        const service = new JwtTokenService(TEST_SECRET);
        const token = service.generate(validPayload);
        const result = service.verify(token);

        expect(result).toEqual(validPayload);
        expect(consoleSpy).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it.each([
        {
            scenario: 'token signed with a different secret',
            tokenFactory: () => jwt.sign(validPayload, 'wrong-secret', { algorithm: 'HS256', expiresIn: '1h' }),
            expectedMessageFragment: 'invalid signature',
        },
        {
            scenario: 'token missing required fields',
            tokenFactory: () =>
                jwt.sign({ playerId: validPayload.playerId }, TEST_SECRET, { algorithm: 'HS256', expiresIn: '7d' }),
            expectedMessageFragment: 'roomId',
        },
    ])('returns null when $scenario', ({ tokenFactory, expectedMessageFragment }) => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const service = new JwtTokenService(TEST_SECRET);
        const result = service.verify(tokenFactory());

        expect(result).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith(
            'Error verifying game room token:',
            expect.stringContaining(expectedMessageFragment)
        );

        consoleSpy.mockRestore();
    });
});

describe('JwtTokenService options', () => {
    it('supports custom algorithm and expiresIn', () => {
        const service = new JwtTokenService(TEST_SECRET, { algorithm: 'HS512', expiresIn: '1h' });
        const payload = { playerId: 'p1', roomId: 'r1' };

        const token = service.generate(payload);
        // Verify with the same algorithm succeeds
        const decoded = jwt.verify(token, TEST_SECRET, { algorithms: ['HS512'] }) as JwtPayload & typeof payload;
        const { exp, iat, ...decodedPayload } = decoded;

        expect(decodedPayload).toEqual(payload);
        expect(exp! - iat!).toBe(60 * 60); // 1 hour
    });
});
