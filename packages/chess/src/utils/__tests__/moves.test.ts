import { InvalidInputError } from '@grouchess/errors';
import type { ChessBoardType, Move, Piece, PieceAlias } from '@grouchess/models';

import * as boardModule from '../../board.js';
import * as chessMovesModule from '../../moves.js';
import * as piecesModule from '../../pieces.js';
import { getPiece } from '../../pieces.js';
import {
    createMove,
    computePawnLegalMoves,
    computeSlidingPieceLegalMoves,
    computeLegalMovesForIndex,
    validatePromotion,
    isKingInCheckAfterMove,
} from '../moves.js';

const { rowColToIndex, indexToRowCol } = boardModule;

const createMockPiece = (overrides: Partial<Piece> = {}): Piece =>
    ({
        alias: 'P',
        color: 'white',
        type: 'pawn',
        value: 1,
        ...overrides,
    }) as Piece;

const createMockMove = (overrides: Partial<Move> = {}): Move =>
    ({
        startIndex: 8,
        endIndex: 16,
        type: 'standard',
        piece: createMockPiece(),
        ...overrides,
    }) as Move;

const createMockBoard = (): ChessBoardType => Array.from({ length: 64 }, () => null);

type Placement = { row: number; col: number; alias: PieceAlias };

const buildMockBoard = (placements: Placement[]): ChessBoardType => {
    const board = createMockBoard();
    placements.forEach(({ row, col, alias }) => {
        const index = rowColToIndex({ row, col });
        if (index >= 0) {
            board[index] = alias;
        }
    });
    return board;
};
const createBoardWithKings = (whiteKingIndex = 60, blackKingIndex = 4): ChessBoardType => {
    const whiteKingRowCol = indexToRowCol(whiteKingIndex);
    const blackKingRowCol = indexToRowCol(blackKingIndex);
    return buildMockBoard([
        { ...whiteKingRowCol, alias: 'K' },
        { ...blackKingRowCol, alias: 'k' },
    ]);
};

const createBoardIndex = (row: number, col: number) => rowColToIndex({ row, col });

afterEach(() => {
    vi.restoreAllMocks();
});

describe('createMove', () => {
    it('creates a standard move with piece data populated', () => {
        const board = createMockBoard();
        board[52] = 'P';

        const move = createMove(board, 52, 44, 'standard');

        expect(move).toEqual({
            startIndex: 52,
            endIndex: 44,
            type: 'standard',
            piece: getPiece('P'),
        });
    });

    it('captures piece on destination square when type is capture', () => {
        const board = createMockBoard();
        board[52] = 'P';
        board[44] = 'p';

        const move = createMove(board, 52, 44, 'capture');

        expect(move.captureIndex).toBe(44);
        expect(move.capturedPiece).toEqual(getPiece('p'));
    });

    it('captures adjacent pawn for en-passant moves', () => {
        const board = createMockBoard();
        board[28] = 'P';
        board[29] = 'p';

        const move = createMove(board, 28, 21, 'en-passant');

        expect(move.captureIndex).toBe(29);
        expect(move.capturedPiece).toEqual(getPiece('p'));
    });

    it('captures adjacent pawn for black en-passant moves', () => {
        const board = createMockBoard();
        board[createBoardIndex(4, 4)] = 'p';
        board[createBoardIndex(4, 5)] = 'P';

        const move = createMove(board, createBoardIndex(4, 4), createBoardIndex(5, 5), 'en-passant');

        expect(move.captureIndex).toBe(createBoardIndex(4, 5));
        expect(move.capturedPiece).toEqual(getPiece('P'));
    });

    it('throws when no piece is located at the start index', () => {
        const board = createMockBoard();

        expect(() => createMove(board, 10, 18, 'standard')).toThrow('Called createMove with no piece in startIndex');
    });
});

describe('isKingInCheckAfterMove', () => {
    it.each([
        { scenario: 'king remains safe', isInCheck: false },
        { scenario: 'king becomes in check', isInCheck: true },
    ])('delegates to move helpers when $scenario', ({ isInCheck }) => {
        const board = buildMockBoard([{ row: 6, col: 4, alias: 'P' }]);
        const move = createMockMove();
        const computedBoard = buildMockBoard([{ row: 4, col: 4, alias: 'P' }]);
        vi.spyOn(chessMovesModule, 'computeNextChessBoardFromMove').mockReturnValue(computedBoard);
        vi.spyOn(chessMovesModule, 'isKingInCheck').mockReturnValue(isInCheck);

        const result = isKingInCheckAfterMove(board, move);

        expect(chessMovesModule.computeNextChessBoardFromMove).toHaveBeenCalledWith(board, move);
        expect(chessMovesModule.isKingInCheck).toHaveBeenCalledWith(computedBoard, move.piece.color);
        expect(result).toBe(isInCheck);
    });
});

describe('computePawnLegalMoves', () => {
    it.each([
        {
            scenario: 'white pawn can advance one or two squares from starting rank',
            color: 'white' as const,
            start: { row: 6, col: 3 },
            placements: [],
            enPassantTargetIndex: null,
            expectedMoves: [
                { endIndex: rowColToIndex({ row: 5, col: 3 }), type: 'standard' },
                { endIndex: rowColToIndex({ row: 4, col: 3 }), type: 'standard' },
            ],
        },
        {
            scenario: 'black pawn is blocked forward but captures diagonally',
            color: 'black' as const,
            start: { row: 1, col: 4 },
            placements: [
                { row: 2, col: 4, alias: 'P' },
                { row: 2, col: 3, alias: 'P' },
            ],
            enPassantTargetIndex: null,
            expectedMoves: [{ endIndex: rowColToIndex({ row: 2, col: 3 }), type: 'capture' }],
        },
        {
            scenario: 'white pawn performs en passant alongside a standard advance',
            color: 'white' as const,
            start: { row: 3, col: 3 },
            placements: [{ row: 3, col: 4, alias: 'p' }],
            enPassantTargetIndex: rowColToIndex({ row: 2, col: 4 }),
            expectedMoves: [
                { endIndex: rowColToIndex({ row: 2, col: 3 }), type: 'standard' },
                { endIndex: rowColToIndex({ row: 2, col: 4 }), type: 'en-passant' },
            ],
        },
        {
            scenario: 'white pawn on top rank has no forward moves because rows are out of bounds',
            color: 'white' as const,
            start: { row: 0, col: 4 },
            placements: [],
            enPassantTargetIndex: null,
            expectedMoves: [],
        },
        {
            scenario: 'white pawn near left edge skips out-of-bounds diagonal and captures to the right',
            color: 'white' as const,
            start: { row: 1, col: 0 },
            placements: [{ row: 0, col: 1, alias: 'p' }],
            enPassantTargetIndex: null,
            expectedMoves: [
                { endIndex: rowColToIndex({ row: 0, col: 0 }), type: 'standard' },
                { endIndex: rowColToIndex({ row: 0, col: 1 }), type: 'capture' },
            ],
        },
    ])('returns legal moves when $scenario', ({ color, start, placements, enPassantTargetIndex, expectedMoves }) => {
        const startAlias: PieceAlias = color === 'white' ? 'P' : 'p';
        const board = buildMockBoard([
            { row: start.row, col: start.col, alias: startAlias },
            ...(placements as Placement[]),
        ]);
        const startIndex = rowColToIndex(start);

        const result = computePawnLegalMoves(board, startIndex, color, enPassantTargetIndex);

        expect(result.map(({ endIndex, type }) => ({ endIndex, type }))).toEqual(expectedMoves);
    });
});

describe('computeSlidingPieceLegalMoves', () => {
    it.each([
        {
            scenario: 'bishop stops at friendly piece and captures first enemy on each ray',
            color: 'white' as const,
            pieceType: 'bishop' as const,
            start: { row: 3, col: 3 },
            placements: [
                { row: 3, col: 3, alias: 'B' },
                { row: 2, col: 4, alias: 'P' },
                { row: 1, col: 1, alias: 'q' },
                { row: 4, col: 2, alias: 'q' },
                { row: 4, col: 4, alias: 'q' },
            ],
            expectedMoves: [
                { endIndex: rowColToIndex({ row: 4, col: 4 }), type: 'capture' },
                { endIndex: rowColToIndex({ row: 4, col: 2 }), type: 'capture' },
                { endIndex: rowColToIndex({ row: 2, col: 2 }), type: 'standard' },
                { endIndex: rowColToIndex({ row: 1, col: 1 }), type: 'capture' },
            ],
        },
        {
            scenario: 'rook traverses straights until blocked or capturing',
            color: 'black' as const,
            pieceType: 'rook' as const,
            start: { row: 4, col: 4 },
            placements: [
                { row: 4, col: 4, alias: 'r' },
                { row: 4, col: 6, alias: 'r' },
                { row: 4, col: 2, alias: 'P' },
                { row: 2, col: 4, alias: 'P' },
            ],
            expectedMoves: [
                { endIndex: rowColToIndex({ row: 4, col: 5 }), type: 'standard' },
                { endIndex: rowColToIndex({ row: 4, col: 3 }), type: 'standard' },
                { endIndex: rowColToIndex({ row: 4, col: 2 }), type: 'capture' },
                { endIndex: rowColToIndex({ row: 5, col: 4 }), type: 'standard' },
                { endIndex: rowColToIndex({ row: 6, col: 4 }), type: 'standard' },
                { endIndex: rowColToIndex({ row: 7, col: 4 }), type: 'standard' },
                { endIndex: rowColToIndex({ row: 3, col: 4 }), type: 'standard' },
                { endIndex: rowColToIndex({ row: 2, col: 4 }), type: 'capture' },
            ],
        },
        {
            scenario: 'queen combines diagonal and straight rays with blocks and captures',
            color: 'white' as const,
            pieceType: 'queen' as const,
            start: { row: 3, col: 3 },
            placements: [
                { row: 3, col: 3, alias: 'Q' },
                // Diagonals
                { row: 5, col: 5, alias: 'p' }, // down-right capture
                { row: 5, col: 1, alias: 'P' }, // down-left friendly block
                { row: 1, col: 1, alias: 'p' }, // up-left capture (after one empty)
                // Straights
                { row: 3, col: 5, alias: 'P' }, // right friendly block (after one empty)
                { row: 3, col: 1, alias: 'p' }, // left capture (after one empty)
                { row: 6, col: 3, alias: 'P' }, // down friendly block (after two empties)
                { row: 2, col: 3, alias: 'p' }, // up immediate capture
            ],
            expectedMoves: [
                // down-right
                { endIndex: rowColToIndex({ row: 4, col: 4 }), type: 'standard' },
                { endIndex: rowColToIndex({ row: 5, col: 5 }), type: 'capture' },
                // down-left
                { endIndex: rowColToIndex({ row: 4, col: 2 }), type: 'standard' },
                // up-left
                { endIndex: rowColToIndex({ row: 2, col: 2 }), type: 'standard' },
                { endIndex: rowColToIndex({ row: 1, col: 1 }), type: 'capture' },
                // up-right (no blocks to edge)
                { endIndex: rowColToIndex({ row: 2, col: 4 }), type: 'standard' },
                { endIndex: rowColToIndex({ row: 1, col: 5 }), type: 'standard' },
                { endIndex: rowColToIndex({ row: 0, col: 6 }), type: 'standard' },
                // right
                { endIndex: rowColToIndex({ row: 3, col: 4 }), type: 'standard' },
                // left
                { endIndex: rowColToIndex({ row: 3, col: 2 }), type: 'standard' },
                { endIndex: rowColToIndex({ row: 3, col: 1 }), type: 'capture' },
                // down
                { endIndex: rowColToIndex({ row: 4, col: 3 }), type: 'standard' },
                { endIndex: rowColToIndex({ row: 5, col: 3 }), type: 'standard' },
                // up
                { endIndex: rowColToIndex({ row: 2, col: 3 }), type: 'capture' },
            ],
        },
    ])('computes sliding moves when $scenario', ({ color, pieceType, start, placements, expectedMoves }) => {
        const board = buildMockBoard(placements as Placement[]);
        const startIndex = rowColToIndex(start);

        const result = computeSlidingPieceLegalMoves(board, startIndex, color, pieceType);

        expect(result.map(({ endIndex, type }) => ({ endIndex, type }))).toEqual(expectedMoves);
    });
});

describe('computeLegalMovesForIndex', () => {
    const noCastleRights = { short: false, long: false };

    it('returns an empty array when no piece occupies the square', () => {
        const board = createBoardWithKings();

        expect(computeLegalMovesForIndex(10, board, noCastleRights, null)).toEqual([]);
    });

    it('generates pawn advances from the starting rank', () => {
        const board = createBoardWithKings();
        board[52] = 'P';

        const moves = computeLegalMovesForIndex(52, board, noCastleRights, null);
        const destinations = moves.map(({ endIndex, type }) => ({ endIndex, type }));

        expect(moves).toHaveLength(2);
        expect(destinations).toEqual(
            expect.arrayContaining([
                { endIndex: 44, type: 'standard' },
                { endIndex: 36, type: 'standard' },
            ])
        );
    });

    it('includes en-passant captures when a target square is provided', () => {
        const board = createBoardWithKings(60, 0);
        board[28] = 'P';
        board[29] = 'p';

        const moves = computeLegalMovesForIndex(28, board, noCastleRights, 21);

        expect(moves.some((move) => move.type === 'en-passant' && move.endIndex === 21)).toBe(true);
        expect(moves.some((move) => move.endIndex === 20 && move.type === 'standard')).toBe(true);
    });

    it('computes sliding moves for bishops, rooks, and queens', () => {
        const board = createBoardWithKings();
        board[35] = 'B';

        const moves = computeLegalMovesForIndex(35, board, noCastleRights, null);

        expect(moves.length).toBeGreaterThan(0);
        expect(moves.some((move) => move.endIndex === 28 && move.type === 'standard')).toBe(true);
    });

    it('computes knight moves from the delta list', () => {
        const board = createBoardWithKings();
        board[35] = 'N';

        const moves = computeLegalMovesForIndex(35, board, noCastleRights, null);
        const destinations = moves.map((move) => move.endIndex);

        expect(moves).toHaveLength(8);
        expect(destinations).toEqual(expect.arrayContaining([20, 18, 25, 41, 50, 52, 45, 29]));
    });

    it('includes castle moves when castling is legal', () => {
        const board = createBoardWithKings();
        board[56] = 'R';
        board[63] = 'R';

        const moves = computeLegalMovesForIndex(60, board, { short: true, long: true }, null);

        expect(moves.some((move) => move.type === 'short-castle' && move.endIndex === 62)).toBe(true);
        expect(moves.some((move) => move.type === 'long-castle' && move.endIndex === 58)).toBe(true);
    });

    it('includes black short castle when castling is legal', () => {
        const board = createBoardWithKings();
        board[7] = 'r';

        const moves = computeLegalMovesForIndex(4, board, { short: true, long: false }, null);

        expect(moves.some((move) => move.type === 'short-castle' && move.endIndex === 6)).toBe(true);
    });

    it('includes black long castle and standard king moves when legal', () => {
        const board = createBoardWithKings();
        board[0] = 'r';

        const moves = computeLegalMovesForIndex(4, board, { short: false, long: true }, null);

        expect(moves.some((move) => move.type === 'long-castle' && move.endIndex === 2)).toBe(true);
        expect(moves.some((move) => move.type === 'standard' && move.endIndex === 5)).toBe(true);
    });

    it('appends standard king moves after castle moves when available', () => {
        const board = createBoardWithKings();
        board[56] = 'R';
        board[63] = 'R';

        const moves = computeLegalMovesForIndex(60, board, { short: true, long: true }, null);
        const shortCastleIndex = moves.findIndex((move) => move.type === 'short-castle');
        const longCastleIndex = moves.findIndex((move) => move.type === 'long-castle');
        const standardMoveIndex = moves.findIndex((move) => move.type === 'standard' && move.endIndex === 59);

        expect(shortCastleIndex).toBeGreaterThan(-1);
        expect(longCastleIndex).toBeGreaterThan(-1);
        expect(standardMoveIndex).toBeGreaterThan(Math.max(shortCastleIndex, longCastleIndex));
    });

    it('includes king capture when an adjacent enemy piece is present', () => {
        const board = createBoardWithKings();
        // Place a black queen next to the white king at index 60 (to the left: 59)
        board[59] = 'q' as PieceAlias;

        const moves = computeLegalMovesForIndex(60, board, { short: false, long: false }, null);

        expect(moves.some((move) => move.type === 'capture' && move.endIndex === 59)).toBe(true);
    });

    it('filters out moves that would leave the king in check', () => {
        const board = createBoardWithKings();
        board[62] = 'N';
        board[63] = 'r';

        const moves = computeLegalMovesForIndex(62, board, noCastleRights, null);

        expect(moves).toEqual([]);
    });
});

describe('validatePromotion', () => {
    it('does nothing when the piece is not a pawn', () => {
        const move = createMockMove({
            piece: createMockPiece({ type: 'knight', alias: 'N' }),
            endIndex: 7,
        });

        expect(() => validatePromotion(move)).not.toThrow();
    });

    it('allows pawn moves that do not reach a promotion square without checking promotion details', () => {
        const isPromotionSquareSpy = vi.spyOn(boardModule, 'isPromotionSquare').mockReturnValue(false);
        const getColorSpy = vi.spyOn(piecesModule, 'getColorFromAlias');
        const move = createMockMove({ piece: createMockPiece({ type: 'pawn', color: 'black', alias: 'p' }) });

        expect(() => validatePromotion(move)).not.toThrow();
        expect(isPromotionSquareSpy).toHaveBeenCalledWith(move.endIndex, move.piece.color);
        expect(getColorSpy).not.toHaveBeenCalled();
    });

    it('throws when a pawn reaches a promotion square without specifying a promotion piece', () => {
        vi.spyOn(boardModule, 'isPromotionSquare').mockReturnValue(true);
        const move = createMockMove({ piece: createMockPiece({ type: 'pawn', alias: 'P' }), promotion: undefined });

        expect(() => validatePromotion(move)).toThrow(InvalidInputError);
    });

    it('throws when the promotion piece has a mismatched color', () => {
        vi.spyOn(boardModule, 'isPromotionSquare').mockReturnValue(true);
        vi.spyOn(piecesModule, 'getColorFromAlias').mockReturnValue('black');
        const move = createMockMove({
            piece: createMockPiece({ type: 'pawn', color: 'white', alias: 'P' }),
            promotion: 'q',
        });

        expect(() => validatePromotion(move)).toThrow(InvalidInputError);
    });

    it('accepts a valid promotion piece with matching color', () => {
        vi.spyOn(boardModule, 'isPromotionSquare').mockReturnValue(true);
        vi.spyOn(piecesModule, 'getColorFromAlias').mockReturnValue('white');
        const move = createMockMove({
            piece: createMockPiece({ type: 'pawn', color: 'white', alias: 'P' }),
            promotion: 'Q',
        });

        expect(() => validatePromotion(move)).not.toThrow();
    });
});
