import {
    INITIAL_CHESS_BOARD_FEN,
    INITIAL_CHESS_BOARD_FEN_PLACEMENT,
    algebraicNotationToIndex,
    computeEnPassantTargetIndex,
    createBoardFromFEN,
    createInitialBoard,
    getKingIndices,
    indexToRowCol,
    isColInBounds,
    isPromotionSquare,
    isRowColInBounds,
    isRowInBounds,
    rowColToIndex,
} from '../board.js';
import type { ChessBoardType } from '../schema.js';

const EMPTY_BOARD_FEN = '8/8/8/8/8/8/8/8';

const makeEmptyBoard = (): ChessBoardType => Array(64).fill(undefined) as ChessBoardType;

describe('INITIAL_CHESS_BOARD_FEN', () => {
    it('matches the standard initial position', () => {
        expect(INITIAL_CHESS_BOARD_FEN).toBe(`${INITIAL_CHESS_BOARD_FEN_PLACEMENT} w KQkq - 0 1`);
    });
});

describe('indexToRowCol', () => {
    it.each([
        { scenario: 'maps index 0 to top-left', index: 0, expected: { row: 0, col: 0 } },
        { scenario: 'maps index 7 to top-right', index: 7, expected: { row: 0, col: 7 } },
        { scenario: 'maps index 8 to second rank first file', index: 8, expected: { row: 1, col: 0 } },
        { scenario: 'maps index 63 to bottom-right', index: 63, expected: { row: 7, col: 7 } },
        { scenario: 'maps index 44 to e3 square', index: 44, expected: { row: 5, col: 4 } },
    ])('$scenario', ({ index, expected }) => {
        expect(indexToRowCol(index)).toEqual(expected);
    });
});

describe('isRowInBounds', () => {
    it.each([
        { scenario: 'accepts lowest valid row', row: 0, expected: true },
        { scenario: 'accepts highest valid row', row: 7, expected: true },
        { scenario: 'rejects below lower bound', row: -1, expected: false },
        { scenario: 'rejects above upper bound', row: 8, expected: false },
    ])('$scenario', ({ row, expected }) => {
        expect(isRowInBounds(row)).toBe(expected);
    });
});

describe('isColInBounds', () => {
    it.each([
        { scenario: 'accepts lowest valid column', col: 0, expected: true },
        { scenario: 'accepts highest valid column', col: 7, expected: true },
        { scenario: 'rejects below lower bound', col: -1, expected: false },
        { scenario: 'rejects above upper bound', col: 8, expected: false },
    ])('$scenario', ({ col, expected }) => {
        expect(isColInBounds(col)).toBe(expected);
    });
});

describe('isRowColInBounds', () => {
    it.each([
        { scenario: 'accepts in-bounds coordinates', rowCol: { row: 4, col: 7 }, expected: true },
        { scenario: 'rejects out-of-bounds row', rowCol: { row: -1, col: 0 }, expected: false },
        { scenario: 'rejects out-of-bounds column', rowCol: { row: 0, col: 8 }, expected: false },
        { scenario: 'rejects out-of-bounds row and column', rowCol: { row: 10, col: -2 }, expected: false },
    ])('$scenario', ({ rowCol, expected }) => {
        expect(isRowColInBounds(rowCol)).toBe(expected);
    });
});

describe('rowColToIndex', () => {
    it.each([
        { scenario: 'converts top-left to index 0', rowCol: { row: 0, col: 0 }, expected: 0 },
        { scenario: 'converts bottom-right to index 63', rowCol: { row: 7, col: 7 }, expected: 63 },
        { scenario: 'converts e3 to index 44', rowCol: { row: 5, col: 4 }, expected: 44 },
    ])('$scenario', ({ rowCol, expected }) => {
        expect(rowColToIndex(rowCol)).toBe(expected);
    });

    it.each([
        { scenario: 'returns -1 when row is out of bounds', rowCol: { row: -1, col: 0 } },
        { scenario: 'returns -1 when column is out of bounds', rowCol: { row: 0, col: 8 } },
    ])('$scenario', ({ rowCol }) => {
        expect(rowColToIndex(rowCol)).toBe(-1);
    });
});

describe('getKingIndices', () => {
    it('returns both king indices when both kings are present', () => {
        const board = makeEmptyBoard();
        board[4] = 'k';
        board[60] = 'K';

        expect(getKingIndices(board)).toEqual({
            white: 60,
            black: 4,
        });
    });

    it('throws when white king is missing', () => {
        const board = makeEmptyBoard();
        board[4] = 'k';

        expect(() => getKingIndices(board)).toThrow('White king not found');
    });

    it('throws when black king is missing', () => {
        const board = makeEmptyBoard();
        board[60] = 'K';

        expect(() => getKingIndices(board)).toThrow('Black king not found');
    });
});

describe('isPromotionSquare', () => {
    it.each([
        { scenario: 'identifies white promotion square at index 0', color: 'white' as const, index: 0, expected: true },
        { scenario: 'rejects non-promotion square for white', color: 'white' as const, index: 8, expected: false },
        {
            scenario: 'identifies black promotion square at index 56',
            color: 'black' as const,
            index: 56,
            expected: true,
        },
        { scenario: 'rejects non-promotion square for black', color: 'black' as const, index: 48, expected: false },
    ])('$scenario', ({ color, index, expected }) => {
        expect(isPromotionSquare(index, color)).toBe(expected);
    });
});

describe('computeEnPassantTargetIndex', () => {
    it.each([
        {
            scenario: 'returns intermediate square for white double advance',
            startIndex: 52,
            endIndex: 36,
            expected: 44,
        },
        {
            scenario: 'returns intermediate square for black double advance',
            startIndex: 11,
            endIndex: 27,
            expected: 19,
        },
    ])('$scenario', ({ startIndex, endIndex, expected }) => {
        expect(computeEnPassantTargetIndex(startIndex, endIndex)).toBe(expected);
    });

    it.each([
        {
            scenario: 'returns null for single-square advance',
            startIndex: 52,
            endIndex: 44,
        },
        {
            scenario: 'returns null when move is not vertical by two squares',
            startIndex: 52,
            endIndex: 43,
        },
    ])('$scenario', ({ startIndex, endIndex }) => {
        expect(computeEnPassantTargetIndex(startIndex, endIndex)).toBeNull();
    });
});

describe('createBoardFromFEN', () => {
    it('creates board with expected pieces for the initial placement', () => {
        const board = createBoardFromFEN(INITIAL_CHESS_BOARD_FEN_PLACEMENT);

        expect(board).toHaveLength(64);
        expect(board[0]).toBe('r');
        expect(board[4]).toBe('k');
        expect(board[7]).toBe('r');
        expect(board[8]).toBe('p');
        expect(board[55]).toBe('P');
        expect(board[56]).toBe('R');
        expect(board[60]).toBe('K');
        expect(board[36]).toBeUndefined();
    });

    it('creates an empty board when fen contains only empty ranks', () => {
        const board = createBoardFromFEN(EMPTY_BOARD_FEN);

        expect(board).toHaveLength(64);
        expect(board.every((square) => square == null)).toBe(true);
    });

    it.each([
        {
            scenario: 'rejects empty placement string',
            fen: '',
            expectedError: 'Placement must be non-empty',
        },
        {
            scenario: 'rejects placement with incorrect number of ranks',
            fen: '8/8/8/8/8/8/8',
            expectedError: 'Invalid FEN: expected 8 ranks',
        },
        {
            scenario: 'rejects placement with incomplete rank',
            fen: '7/8/8/8/8/8/8/8',
            expectedError: 'Invalid FEN: incomplete rank',
        },
        {
            scenario: 'rejects placement with unexpected character',
            fen: '8/8/8/8/8/8/8/7Z',
            expectedError: "Invalid FEN: unexpected character 'Z'",
        },
        {
            scenario: 'rejects placement with too many squares in a rank',
            fen: '8/8/8/8/8/8/8/R7P',
            expectedError: 'Invalid FEN: too many squares in a rank',
        },
    ])('$scenario', ({ fen, expectedError }) => {
        expect(() => createBoardFromFEN(fen)).toThrow(expectedError);
    });
});

describe('createInitialBoard', () => {
    it('matches board derived from initial placement FEN', () => {
        expect(createInitialBoard()).toEqual(createBoardFromFEN(INITIAL_CHESS_BOARD_FEN_PLACEMENT));
    });
});

describe('algebraicNotationToIndex', () => {
    it.each([
        { scenario: 'parses a1 to index 56', notation: 'a1', expected: 56 },
        { scenario: 'parses h8 to index 7', notation: 'h8', expected: 7 },
        { scenario: 'parses e3 to index 44', notation: 'e3', expected: 44 },
        { scenario: 'trims whitespace before parsing', notation: '   e4 \n', expected: 36 },
    ])('$scenario', ({ notation, expected }) => {
        expect(algebraicNotationToIndex(notation)).toBe(expected);
    });

    it('returns -1 for "-" notation', () => {
        expect(algebraicNotationToIndex('-')).toBe(-1);
    });

    it.each([
        { scenario: 'rejects invalid file', notation: 'i3' },
        { scenario: 'rejects invalid rank', notation: 'a9' },
        { scenario: 'rejects malformed string', notation: 'abc' },
        { scenario: 'rejects empty string', notation: '' },
    ])('$scenario', ({ notation }) => {
        expect(() => algebraicNotationToIndex(notation)).toThrow(`Invalid square notation: ${notation}`);
    });
});
