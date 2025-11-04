import type { ChessBoardType, Move } from '@grouchess/models';

import { computeCastlingLegality, computeCastleRightsChangesFromMove, createInitialCastleRights } from '../castles.js';
import {
    BLACK_SHORT_CASTLE_INDICES,
    BLACK_LONG_CASTLE_SAFE_INDICES,
    BLACK_LONG_ROOK_START_INDEX,
    BLACK_SHORT_ROOK_START_INDEX,
    WHITE_LONG_CASTLE_EMPTY_INDICES,
    WHITE_LONG_CASTLE_SAFE_INDICES,
    WHITE_LONG_ROOK_START_INDEX,
    WHITE_SHORT_CASTLE_INDICES,
    WHITE_SHORT_ROOK_START_INDEX,
} from '../constants.js';
import * as moves from '../moves.js';
import { getPiece } from '../pieces.js';

const isKingInCheckMock = vi.spyOn(moves, 'isKingInCheck');
const isSquareAttackedMock = vi.spyOn(moves, 'isSquareAttacked');

const makeEmptyBoard = (): ChessBoardType => Array(64).fill(null) as ChessBoardType;

const WHITE_KING = getPiece('K');
const BLACK_KING = getPiece('k');
const WHITE_ROOK = getPiece('R');
const BLACK_ROOK = getPiece('r');
const WHITE_QUEEN = getPiece('Q');
const BLACK_QUEEN = getPiece('q');

beforeEach(() => {
    isKingInCheckMock.mockReset();
    isSquareAttackedMock.mockReset();

    isKingInCheckMock.mockReturnValue(false);
    isSquareAttackedMock.mockReturnValue(false);
});

afterAll(() => {
    vi.restoreAllMocks();
});

describe('createInitialCastleRights', () => {
    it('returns full rights for both colors', () => {
        expect(createInitialCastleRights()).toEqual({
            white: { short: true, long: true },
            black: { short: true, long: true },
        });
    });
});

describe('computeCastlingLegality', () => {
    it('returns no legal castles when rights are absent', () => {
        const board = makeEmptyBoard();
        const result = computeCastlingLegality('white', board, { short: false, long: false });

        expect(result).toEqual({ short: false, long: false });
        expect(isKingInCheckMock).not.toHaveBeenCalled();
    });

    it('returns no legal castles when the king is in check', () => {
        const board = makeEmptyBoard();
        isKingInCheckMock.mockReturnValue(true);

        const result = computeCastlingLegality('black', board, { short: true, long: true });

        expect(result).toEqual({ short: false, long: false });
        expect(isSquareAttackedMock).not.toHaveBeenCalled();
    });

    it('allows white short castle when path is empty, safe, and rook present', () => {
        const board = makeEmptyBoard();
        board[WHITE_SHORT_ROOK_START_INDEX] = 'R';

        const result = computeCastlingLegality('white', board, { short: true, long: false });

        expect(result).toEqual({ short: true, long: false });
        expect(isSquareAttackedMock).toHaveBeenCalledTimes(WHITE_SHORT_CASTLE_INDICES.length);
        WHITE_SHORT_CASTLE_INDICES.forEach((index) => {
            expect(isSquareAttackedMock).toHaveBeenCalledWith(board, index, 'black');
        });
    });

    it('allows black long castle when path is empty, safe, and rook present', () => {
        const board = makeEmptyBoard();
        board[BLACK_LONG_ROOK_START_INDEX] = 'r';

        const result = computeCastlingLegality('black', board, { short: false, long: true });

        expect(result).toEqual({ short: false, long: true });
        BLACK_LONG_CASTLE_SAFE_INDICES.forEach((index) => {
            expect(isSquareAttackedMock).toHaveBeenCalledWith(board, index, 'white');
        });
    });

    it('allows black short castle when path is empty, safe, and rook present', () => {
        const board = makeEmptyBoard();
        board[BLACK_SHORT_ROOK_START_INDEX] = 'r';

        const result = computeCastlingLegality('black', board, { short: true, long: false });

        expect(result).toEqual({ short: true, long: false });
        expect(isSquareAttackedMock).toHaveBeenCalledTimes(BLACK_SHORT_CASTLE_INDICES.length);
        BLACK_SHORT_CASTLE_INDICES.forEach((index) => {
            expect(isSquareAttackedMock).toHaveBeenCalledWith(board, index, 'white');
        });
    });

    it('prevents long castling when a required square is attacked', () => {
        const board = makeEmptyBoard();
        board[WHITE_LONG_ROOK_START_INDEX] = 'R';

        isSquareAttackedMock.mockImplementation((_, index) => index === WHITE_LONG_CASTLE_SAFE_INDICES[0]);

        const result = computeCastlingLegality('white', board, { short: false, long: true });

        expect(result).toEqual({ short: false, long: false });
        expect(isSquareAttackedMock).not.toHaveBeenCalledWith(board, WHITE_LONG_CASTLE_EMPTY_INDICES[0], 'black');
    });

    it('prevents castling when the rook is missing from its starting square', () => {
        const board = makeEmptyBoard();

        const result = computeCastlingLegality('white', board, { short: true, long: false });

        expect(result).toEqual({ short: false, long: false });
    });
});

describe('computeCastleRightsChangesFromMove', () => {
    it.each([
        {
            scenario: 'white king move revokes both rights',
            move: {
                startIndex: 60,
                endIndex: 52,
                type: 'standard',
                piece: WHITE_KING,
            },
            expected: {
                white: { short: false, long: false },
            },
        },
        {
            scenario: 'black king move revokes both rights',
            move: {
                startIndex: 4,
                endIndex: 12,
                type: 'standard',
                piece: BLACK_KING,
            },
            expected: {
                black: { short: false, long: false },
            },
        },
    ])('$scenario', ({ move, expected }) => {
        expect(computeCastleRightsChangesFromMove(move as Move)).toEqual(expected);
    });

    it.each([
        {
            scenario: 'white rook moves from h1 and loses short castling',
            move: {
                startIndex: WHITE_SHORT_ROOK_START_INDEX,
                endIndex: 55,
                type: 'standard',
                piece: WHITE_ROOK,
            },
            expected: {
                white: { short: false },
            },
        },
        {
            scenario: 'white rook moves from a1 and loses long castling',
            move: {
                startIndex: WHITE_LONG_ROOK_START_INDEX,
                endIndex: 48,
                type: 'standard',
                piece: WHITE_ROOK,
            },
            expected: {
                white: { long: false },
            },
        },
        {
            scenario: 'black rook moves from h8 and loses short castling',
            move: {
                startIndex: BLACK_SHORT_ROOK_START_INDEX,
                endIndex: 14,
                type: 'standard',
                piece: BLACK_ROOK,
            },
            expected: {
                black: { short: false },
            },
        },
        {
            scenario: 'black rook moves from a8 and loses long castling',
            move: {
                startIndex: BLACK_LONG_ROOK_START_INDEX,
                endIndex: 8,
                type: 'standard',
                piece: BLACK_ROOK,
            },
            expected: {
                black: { long: false },
            },
        },
    ])('$scenario', ({ move, expected }) => {
        expect(computeCastleRightsChangesFromMove(move as Move)).toEqual(expected);
    });

    it('ignores rook moves from non-starting squares (e.g. promoted rooks)', () => {
        const move: Move = {
            startIndex: 10,
            endIndex: 18,
            type: 'standard',
            piece: WHITE_ROOK,
        };

        expect(computeCastleRightsChangesFromMove(move)).toEqual({});
    });

    it.each([
        {
            scenario: 'black rook captured on a8 revokes black long castling',
            move: {
                startIndex: 20,
                endIndex: BLACK_LONG_ROOK_START_INDEX,
                type: 'capture',
                piece: WHITE_QUEEN,
                capturedPiece: BLACK_ROOK,
                captureIndex: BLACK_LONG_ROOK_START_INDEX,
            },
            expected: {
                black: { long: false },
            },
        },
        {
            scenario: 'white rook captured on h1 revokes white short castling',
            move: {
                startIndex: 43,
                endIndex: WHITE_SHORT_ROOK_START_INDEX,
                type: 'capture',
                piece: BLACK_QUEEN,
                capturedPiece: WHITE_ROOK,
                captureIndex: WHITE_SHORT_ROOK_START_INDEX,
            },
            expected: {
                white: { short: false },
            },
        },
    ])('$scenario', ({ move, expected }) => {
        expect(computeCastleRightsChangesFromMove(move as Move)).toEqual(expected);
    });

    it('updates both colors when a rook from its start square captures the opposing rook on its start square', () => {
        const move: Move = {
            startIndex: WHITE_SHORT_ROOK_START_INDEX,
            endIndex: BLACK_LONG_ROOK_START_INDEX,
            type: 'capture',
            piece: WHITE_ROOK,
            capturedPiece: BLACK_ROOK,
            captureIndex: BLACK_LONG_ROOK_START_INDEX,
        };

        expect(computeCastleRightsChangesFromMove(move)).toEqual({
            white: { short: false },
            black: { long: false },
        });
    });

    it('throws when capturing a starting rook without a capture index', () => {
        const move: Move = {
            startIndex: 20,
            endIndex: BLACK_LONG_ROOK_START_INDEX,
            type: 'capture',
            piece: WHITE_QUEEN,
            capturedPiece: BLACK_ROOK,
        };

        expect(() => computeCastleRightsChangesFromMove(move)).toThrow('Missing captureIndex for rook capture');
    });
});
