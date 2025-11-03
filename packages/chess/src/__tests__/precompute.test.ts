import { DIAGONAL_DELTAS, KNIGHT_DELTAS, ALL_DIRECTION_DELTAS } from '../constants.js';
import {
    computeNonSlidingTargets,
    computeKingTargets,
    computeKnightTargets,
    computeSlidingTargets,
    computeBishopTargets,
    computeRookTargets,
    computeQueenTargets,
    computeNonPawnTargets,
} from '../precompute.js';

// Helper to build a Set from array for easy comparison
const asSet = (arr: number[]) => new Set(arr);

describe('computeNonSlidingTargets', () => {
    it.each([
        {
            name: 'diagonal one-step from corner (0) -> only down-right',
            deltas: DIAGONAL_DELTAS,
            index: 0,
            expected: asSet([9]),
        },
        {
            name: 'diagonal one-step from center (27) -> four neighbors',
            deltas: DIAGONAL_DELTAS,
            index: 27,
            expected: asSet([18, 20, 34, 36]),
        },
        {
            name: 'knight one-step from center (27) -> eight jumps',
            deltas: KNIGHT_DELTAS,
            index: 27,
            expected: asSet([44, 37, 21, 12, 10, 17, 33, 42]),
        },
    ])('$name', ({ deltas, index, expected }) => {
        const targets = computeNonSlidingTargets(deltas);
        expect(targets).toHaveLength(64);
        expect(targets[index]).toEqual(expected);
    });
});

describe('computeKingTargets', () => {
    it.each([
        {
            name: 'corner (0) has three neighbors',
            index: 0,
            expected: asSet([1, 8, 9]),
        },
        {
            name: 'center (27) has eight neighbors',
            index: 27,
            expected: asSet([18, 19, 20, 26, 28, 34, 35, 36]),
        },
    ])('$name', ({ index, expected }) => {
        const kingTargets = computeKingTargets();
        expect(kingTargets).toHaveLength(64);
        expect(kingTargets[index]).toEqual(expected);
    });
});

describe('computeKnightTargets', () => {
    it.each([
        {
            name: 'corner (0) has two moves',
            index: 0,
            expected: asSet([10, 17]),
        },
        {
            name: 'center (27) has eight moves',
            index: 27,
            expected: asSet([44, 37, 21, 12, 10, 17, 33, 42]),
        },
    ])('$name', ({ index, expected }) => {
        const knightTargets = computeKnightTargets();
        expect(knightTargets).toHaveLength(64);
        expect(knightTargets[index]).toEqual(expected);
    });
});

describe('computeSlidingTargets', () => {
    it('rook directions are only up/down/left/right and ordered rays', () => {
        const rook = computeSlidingTargets('rook');
        expect(rook).toHaveLength(64);
        const center = rook[27];
        // Ensure only the four straight directions exist
        expect(Object.keys(center).sort()).toEqual(['down', 'left', 'right', 'up']);
        // Ordered rays from 27
        expect(center.up).toEqual([19, 11, 3]);
        expect(center.down).toEqual([35, 43, 51, 59]);
        expect(center.left).toEqual([26, 25, 24]);
        expect(center.right).toEqual([28, 29, 30, 31]);
    });
});

describe('computeBishopTargets', () => {
    it('bishop directions are diagonals only and ordered rays', () => {
        const bishop = computeBishopTargets();
        expect(bishop).toHaveLength(64);
        const center = bishop[27];
        expect(Object.keys(center).sort()).toEqual(['down-left', 'down-right', 'up-left', 'up-right']);
        expect(center['up-left']).toEqual([18, 9, 0]);
        expect(center['up-right']).toEqual([20, 13, 6]);
        expect(center['down-left']).toEqual([34, 41, 48]);
        expect(center['down-right']).toEqual([36, 45, 54, 63]);
    });
});

describe('computeRookTargets', () => {
    it.each([
        {
            name: 'center (27) rays match expected',
            index: 27,
            expected: {
                up: [19, 11, 3],
                down: [35, 43, 51, 59],
                left: [26, 25, 24],
                right: [28, 29, 30, 31],
            },
        },
        {
            name: 'corner (0) rays',
            index: 0,
            expected: {
                up: [],
                left: [],
                right: [1, 2, 3, 4, 5, 6, 7],
                down: [8, 16, 24, 32, 40, 48, 56],
            },
        },
    ])('$name', ({ index, expected }) => {
        const rook = computeRookTargets();
        expect(rook).toHaveLength(64);
        expect(rook[index]).toEqual(expected);
    });
});

describe('computeQueenTargets', () => {
    it('queen has all 8 directions and merges rook+bishop rays', () => {
        const queen = computeQueenTargets();
        expect(queen).toHaveLength(64);
        const center = queen[27];
        expect(Object.keys(center).sort()).toEqual([
            'down',
            'down-left',
            'down-right',
            'left',
            'right',
            'up',
            'up-left',
            'up-right',
        ]);
        expect(center.up).toEqual([19, 11, 3]);
        expect(center['up-right']).toEqual([20, 13, 6]);
        expect(center.right).toEqual([28, 29, 30, 31]);
        expect(center['down-right']).toEqual([36, 45, 54, 63]);
        expect(center.down).toEqual([35, 43, 51, 59]);
        expect(center['down-left']).toEqual([34, 41, 48]);
        expect(center.left).toEqual([26, 25, 24]);
        expect(center['up-left']).toEqual([18, 9, 0]);
    });
});

describe('computeNonPawnTargets', () => {
    it('returns all piece target structures with correct lengths', () => {
        const res = computeNonPawnTargets();
        expect(res.king).toHaveLength(64);
        expect(res.knight).toHaveLength(64);
        expect(res.bishop).toHaveLength(64);
        expect(res.rook).toHaveLength(64);
        expect(res.queen).toHaveLength(64);
    });

    it('king and knight sets match non-sliding computation', () => {
        const res = computeNonPawnTargets();
        const kingRef = computeNonSlidingTargets(ALL_DIRECTION_DELTAS);
        const knightRef = computeNonSlidingTargets(KNIGHT_DELTAS);
        expect(res.king[27]).toEqual(kingRef[27]);
        expect(res.knight[27]).toEqual(knightRef[27]);
    });
});
