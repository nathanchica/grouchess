import { InvalidInputError } from '@grouchess/errors';
import type { CastleRightsByColor, ChessBoardType } from '@grouchess/models';

import * as boardModule from '../../board.js';
import * as notationsModule from '../../notations.js';
import {
    createBoardStateFromFEN,
    isNonNegativeInteger,
    isPositiveInteger,
    isValidEnPassantNotation,
    isValidCastlingAvailability,
    isValidEnPassantTarget,
    isValidPiecePlacement,
    createCastlingRightsFENPart,
    createPiecePlacementFromBoard,
} from '../fen.js';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('createBoardStateFromFEN', () => {
    it('throws InvalidInputError when the provided FEN string is invalid', () => {
        vi.spyOn(notationsModule, 'isValidFEN').mockReturnValue(false);

        expect(() => createBoardStateFromFEN('invalid fen')).toThrow(InvalidInputError);
    });

    it('parses board state with no castling rights and no en passant target', () => {
        const fen = '8/8/8/8/8/8/8/8 b - - 12 34';
        const board = Array.from({ length: 64 }, () => null) as ChessBoardType;
        const isValidFENSpy = vi.spyOn(notationsModule, 'isValidFEN').mockReturnValue(true);
        const createBoardSpy = vi.spyOn(boardModule, 'createBoardFromFEN').mockReturnValue(board);
        const algebraicSpy = vi.spyOn(boardModule, 'algebraicNotationToIndex');

        const result = createBoardStateFromFEN(fen);

        expect(isValidFENSpy).toHaveBeenCalledWith(fen);
        expect(createBoardSpy).toHaveBeenCalledWith('8/8/8/8/8/8/8/8');
        expect(algebraicSpy).not.toHaveBeenCalled();
        expect(result).toEqual({
            board,
            playerTurn: 'black',
            castleRightsByColor: {
                white: { short: false, long: false },
                black: { short: false, long: false },
            },
            enPassantTargetIndex: null,
            halfmoveClock: 12,
            fullmoveClock: 34,
        });
    });

    it('parses board state with castling rights and an en passant target square', () => {
        const fen = '8/8/8/8/8/8/8/8 w Kq e3 0 1';
        const board = Array.from({ length: 64 }, () => null) as ChessBoardType;
        vi.spyOn(notationsModule, 'isValidFEN').mockReturnValue(true);
        vi.spyOn(boardModule, 'createBoardFromFEN').mockReturnValue(board);
        const algebraicSpy = vi.spyOn(boardModule, 'algebraicNotationToIndex').mockReturnValue(21);

        const result = createBoardStateFromFEN(fen);

        expect(algebraicSpy).toHaveBeenCalledWith('e3');
        expect(result).toEqual({
            board,
            playerTurn: 'white',
            castleRightsByColor: {
                white: { short: true, long: false },
                black: { short: false, long: true },
            },
            enPassantTargetIndex: 21,
            halfmoveClock: 0,
            fullmoveClock: 1,
        });
    });
});

describe('isValidEnPassantNotation', () => {
    it.each([{ notation: 'a3' }, { notation: 'h6' }, { notation: 'd3' }])(
        'returns true for valid notation $notation',
        ({ notation }) => {
            expect(isValidEnPassantNotation(notation)).toBe(true);
        }
    );

    it.each([
        { scenario: 'rank other than 3 or 6', notation: 'a5' },
        { scenario: 'file outside a-h', notation: 'i3' },
        { scenario: 'uppercase file', notation: 'A3' },
        { scenario: 'non-digit rank', notation: 'aX' },
        { scenario: 'too short', notation: 'a' },
        { scenario: 'too long', notation: 'a36' },
    ])('returns false for $scenario', ({ notation }) => {
        expect(isValidEnPassantNotation(notation)).toBe(false);
    });
});

describe('isValidPiecePlacement', () => {
    it('returns true for a well-formed placement string', () => {
        const placement = '8/8/8/8/8/8/4K3/7k';

        expect(isValidPiecePlacement(placement)).toBe(true);
    });

    it.each([
        {
            scenario: 'less than eight ranks',
            placement: '8/8/8/8/8/8/8',
        },
        {
            scenario: 'missing kings',
            placement: '8/8/8/8/8/8/8/8',
        },
        {
            scenario: 'more squares than allowed in a rank',
            placement: '8/8/8/8/8/8/8/8p',
        },
        {
            scenario: 'invalid character present',
            placement: '8/8/8/8/8/8/8/7X',
        },
        {
            scenario: 'incomplete rank',
            placement: '7/8/8/8/8/8/8/K6k',
        },
        {
            scenario: 'duplicate white kings',
            placement: 'K7/K7/8/8/8/8/8/k7',
        },
        {
            scenario: 'duplicate black kings',
            placement: 'k7/k7/8/8/8/8/8/7K',
        },
    ])('returns false when $scenario', ({ placement }) => {
        expect(isValidPiecePlacement(placement)).toBe(false);
    });
});

describe('isValidCastlingAvailability', () => {
    it.each([
        { scenario: 'all castling rights available', input: 'KQkq', expected: true },
        { scenario: 'no castling rights available', input: '-', expected: true },
        { scenario: 'single right available', input: 'K', expected: true },
        { scenario: 'duplicate flag present', input: 'KQK', expected: false },
        { scenario: 'invalid character present', input: 'Ka', expected: false },
        { scenario: 'empty string', input: '', expected: false },
    ])('$scenario', ({ input, expected }) => {
        expect(isValidCastlingAvailability(input)).toBe(expected);
    });
});

describe('isValidEnPassantTarget', () => {
    it.each([
        { scenario: 'no en passant target', enPassant: '-', activeColor: 'w', expected: true },
        { scenario: 'white en passant target on sixth rank', enPassant: 'a6', activeColor: 'w', expected: true },
        { scenario: 'black en passant target on third rank', enPassant: 'h3', activeColor: 'b', expected: true },
        { scenario: 'invalid algebraic notation', enPassant: 'i3', activeColor: 'w', expected: false },
        { scenario: 'white en passant target on third rank', enPassant: 'a3', activeColor: 'w', expected: false },
        { scenario: 'black en passant target on sixth rank', enPassant: 'h6', activeColor: 'b', expected: false },
    ])('returns $expected for $scenario', ({ enPassant, activeColor, expected }) => {
        expect(isValidEnPassantTarget(enPassant, activeColor)).toBe(expected);
    });
});

describe('isPositiveInteger', () => {
    it.each([
        { value: '1', expected: true },
        { value: '42', expected: true },
        { value: '0', expected: false },
        { value: '-1', expected: false },
        { value: '3.14', expected: false },
        { value: 'abc', expected: false },
        { value: '01', expected: false },
    ])('returns $expected for "$value"', ({ value, expected }) => {
        expect(isPositiveInteger(value)).toBe(expected);
    });
});

describe('isNonNegativeInteger', () => {
    it.each([
        { value: '0', expected: true },
        { value: '5', expected: true },
        { value: '-1', expected: false },
        { value: '2.5', expected: false },
        { value: 'abc', expected: false },
        { value: '05', expected: false },
    ])('returns $expected for "$value"', ({ value, expected }) => {
        expect(isNonNegativeInteger(value)).toBe(expected);
    });
});

describe('createPiecePlacementFromBoard', () => {
    it('serializes a board into the correct FEN placement string', () => {
        const board = Array.from({ length: 64 }, () => null) as ChessBoardType;
        board[boardModule.rowColToIndex({ row: 0, col: 0 })] = 'r';
        board[boardModule.rowColToIndex({ row: 0, col: 7 })] = 'k';
        board[boardModule.rowColToIndex({ row: 2, col: 3 })] = 'p';
        board[boardModule.rowColToIndex({ row: 4, col: 4 })] = 'Q';
        board[boardModule.rowColToIndex({ row: 7, col: 4 })] = 'K';

        expect(createPiecePlacementFromBoard(board)).toBe('r6k/8/3p4/8/4Q3/8/8/4K3');
    });
});

describe('createCastlingRightsFENPart', () => {
    it.each([
        {
            scenario: 'all rights available',
            rights: {
                white: { short: true, long: true },
                black: { short: true, long: true },
            } satisfies CastleRightsByColor,
            expected: 'KQkq',
        },
        {
            scenario: 'no rights available',
            rights: {
                white: { short: false, long: false },
                black: { short: false, long: false },
            } satisfies CastleRightsByColor,
            expected: '-',
        },
        {
            scenario: 'only white short castle available',
            rights: {
                white: { short: true, long: false },
                black: { short: false, long: false },
            } satisfies CastleRightsByColor,
            expected: 'K',
        },
        {
            scenario: 'mixed availability',
            rights: {
                white: { short: false, long: true },
                black: { short: true, long: false },
            } satisfies CastleRightsByColor,
            expected: 'Qk',
        },
    ])('returns "$expected" when $scenario', ({ rights, expected }) => {
        expect(createCastlingRightsFENPart(rights)).toBe(expected);
    });
});
