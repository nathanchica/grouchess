import { InvalidInputError } from '@grouchess/errors';
import type { ChessGame } from '@grouchess/models';
import { createMockChessGameRoom } from '@grouchess/test-utils';

import { computePlayerScores } from '../scores.js';

const WHITE_PLAYER_ID = 'player-white';
const BLACK_PLAYER_ID = 'player-black';

describe('computePlayerScores', () => {
    it.each([
        {
            scenario: 'increments score for white victory',
            winner: 'white' as ChessGame['gameState']['winner'],
            expectedScore: { [WHITE_PLAYER_ID]: 1, [BLACK_PLAYER_ID]: 0 },
        },
        {
            scenario: 'increments score for black victory',
            winner: 'black' as ChessGame['gameState']['winner'],
            expectedScore: { [WHITE_PLAYER_ID]: 0, [BLACK_PLAYER_ID]: 1 },
        },
    ])('$scenario', ({ winner, expectedScore }) => {
        const gameRoom = createMockChessGameRoom({
            colorToPlayerId: { white: WHITE_PLAYER_ID, black: BLACK_PLAYER_ID },
            playerIdToScore: { [WHITE_PLAYER_ID]: 0, [BLACK_PLAYER_ID]: 0 },
        });
        const result = computePlayerScores(gameRoom, {
            status: 'checkmate',
            winner,
        } satisfies ChessGame['gameState']);

        expect(result).toEqual(expectedScore);
        expect(gameRoom.playerIdToScore).toEqual({ [WHITE_PLAYER_ID]: 0, [BLACK_PLAYER_ID]: 0 });
    });

    it('adds half-point to both players for draw statuses', () => {
        const gameRoom = createMockChessGameRoom({
            playerIdToScore: { [WHITE_PLAYER_ID]: 2, [BLACK_PLAYER_ID]: 5 },
        });

        const result = computePlayerScores(gameRoom, {
            status: 'draw-by-agreement',
        } satisfies ChessGame['gameState']);

        expect(result[WHITE_PLAYER_ID]).toBeCloseTo(2.5);
        expect(result[BLACK_PLAYER_ID]).toBeCloseTo(5.5);
        expect(gameRoom.playerIdToScore).toEqual({ [WHITE_PLAYER_ID]: 2, [BLACK_PLAYER_ID]: 5 });
    });

    it('returns unchanged scores when the game is still in progress', () => {
        const gameRoom = createMockChessGameRoom({
            playerIdToScore: { [WHITE_PLAYER_ID]: 4, [BLACK_PLAYER_ID]: 3 },
        });

        const result = computePlayerScores(gameRoom, {
            status: 'in-progress',
        } satisfies ChessGame['gameState']);

        expect(result).toEqual({ [WHITE_PLAYER_ID]: 4, [BLACK_PLAYER_ID]: 3 });
    });

    it('throws when winner is missing from color mapping', () => {
        const gameRoom = createMockChessGameRoom({
            colorToPlayerId: { white: null, black: BLACK_PLAYER_ID },
        });

        expect(() =>
            computePlayerScores(gameRoom, {
                status: 'checkmate',
                winner: 'white',
            } satisfies ChessGame['gameState'])
        ).toThrowError(InvalidInputError);
    });
});
