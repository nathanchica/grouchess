import type { ChessGameStatus } from '@grouchess/models';

import { getDisplayTextForDrawStatus } from '../draws';

describe('getDisplayTextForDrawStatus', () => {
    it.each([
        { scenario: 'stalemate', input: 'stalemate' as ChessGameStatus, expected: 'Stalemate' },
        { scenario: '50-move draw', input: '50-move-draw' as ChessGameStatus, expected: '50-Move Draw' },
        {
            scenario: 'threefold repetition',
            input: 'threefold-repetition' as ChessGameStatus,
            expected: 'Threefold Repetition',
        },
        { scenario: 'draw by agreement', input: 'draw-by-agreement' as ChessGameStatus, expected: 'Draw by Agreement' },
        {
            scenario: 'insufficient material',
            input: 'insufficient-material' as ChessGameStatus,
            expected: 'Insufficient Material',
        },
    ])('returns "$expected" for $scenario', ({ input, expected }) => {
        expect(getDisplayTextForDrawStatus(input)).toBe(expected);
    });

    it.each([
        { scenario: 'in-progress status', input: 'in-progress' as ChessGameStatus },
        { scenario: 'checkmate status', input: 'checkmate' as ChessGameStatus },
        { scenario: 'resigned status', input: 'resigned' as ChessGameStatus },
        { scenario: 'time-out status', input: 'time-out' as ChessGameStatus },
    ])('throws error for $scenario', ({ input }) => {
        expect(() => getDisplayTextForDrawStatus(input)).toThrow(`Status '${input}' is not a draw status`);
    });
});
