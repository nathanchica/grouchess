import { InvalidInputError } from '@grouchess/errors';

import * as boardModule from '../../board.js';
import * as castlesModule from '../../castles.js';
import * as drawsModule from '../../draws.js';
import * as chessMovesModule from '../../moves.js';
import * as piecesModule from '../../pieces.js';
import type {
    CastleRightsByColor,
    ChessBoardState,
    ChessBoardType,
    Move,
    Piece,
    PieceAlias,
    PieceCapture,
    PositionCounts,
} from '../../schema.js';
import {
    computeLegalMovesFromRowColDeltas,
    computePawnLegalMoves,
    computeSlidingPieceLegalMoves,
    validatePromotion,
    getPieceCaptureFromMove,
    getNextPositionCounts,
    getNextCastleRightsAfterMove,
    getNextBoardStateAfterMove,
    isKingInCheckAfterMove,
} from '../moves.js';

const createPiece = (overrides: Partial<Piece> = {}): Piece =>
    ({
        alias: 'P',
        color: 'white',
        type: 'pawn',
        value: 1,
        ...overrides,
    }) as Piece;

const createMove = (overrides: Partial<Move> = {}): Move =>
    ({
        startIndex: 8,
        endIndex: 16,
        type: 'standard',
        piece: createPiece(),
        ...overrides,
    }) as Move;

const createBoard = (): ChessBoardType => Array.from({ length: 64 }, () => null);

type Placement = { row: number; col: number; alias: PieceAlias };

const buildBoard = (placements: Placement[]): ChessBoardType => {
    const board = createBoard();
    placements.forEach(({ row, col, alias }) => {
        const index = boardModule.rowColToIndex({ row, col });
        if (index >= 0) {
            board[index] = alias;
        }
    });
    return board;
};

const createBoardState = (overrides: Partial<ChessBoardState> = {}): ChessBoardState =>
    ({
        board: createBoard(),
        playerTurn: 'white',
        castleRightsByColor: {
            white: { short: true, long: true },
            black: { short: true, long: true },
        },
        enPassantTargetIndex: null,
        halfmoveClock: 0,
        fullmoveClock: 1,
        ...overrides,
    }) as ChessBoardState;

afterEach(() => {
    vi.restoreAllMocks();
});

describe('isKingInCheckAfterMove', () => {
    it.each([
        { scenario: 'king remains safe', isInCheck: false },
        { scenario: 'king becomes in check', isInCheck: true },
    ])('delegates to move helpers when $scenario', ({ isInCheck }) => {
        const board = buildBoard([{ row: 6, col: 4, alias: 'P' }]);
        const move = createMove();
        const computedBoard = buildBoard([{ row: 4, col: 4, alias: 'P' }]);
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
                { endIndex: boardModule.rowColToIndex({ row: 5, col: 3 }), type: 'standard' },
                { endIndex: boardModule.rowColToIndex({ row: 4, col: 3 }), type: 'standard' },
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
            expectedMoves: [{ endIndex: boardModule.rowColToIndex({ row: 2, col: 3 }), type: 'capture' }],
        },
        {
            scenario: 'white pawn performs en passant alongside a standard advance',
            color: 'white' as const,
            start: { row: 3, col: 3 },
            placements: [{ row: 3, col: 4, alias: 'p' }],
            enPassantTargetIndex: boardModule.rowColToIndex({ row: 2, col: 4 }),
            expectedMoves: [
                { endIndex: boardModule.rowColToIndex({ row: 2, col: 3 }), type: 'standard' },
                { endIndex: boardModule.rowColToIndex({ row: 2, col: 4 }), type: 'en-passant' },
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
                { endIndex: boardModule.rowColToIndex({ row: 0, col: 0 }), type: 'standard' },
                { endIndex: boardModule.rowColToIndex({ row: 0, col: 1 }), type: 'capture' },
            ],
        },
    ])('returns legal moves when $scenario', ({ color, start, placements, enPassantTargetIndex, expectedMoves }) => {
        const startAlias: PieceAlias = color === 'white' ? 'P' : 'p';
        const board = buildBoard([
            { row: start.row, col: start.col, alias: startAlias },
            ...(placements as Placement[]),
        ]);
        const startIndex = boardModule.rowColToIndex(start);

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
                { endIndex: boardModule.rowColToIndex({ row: 4, col: 4 }), type: 'capture' },
                { endIndex: boardModule.rowColToIndex({ row: 4, col: 2 }), type: 'capture' },
                { endIndex: boardModule.rowColToIndex({ row: 2, col: 2 }), type: 'standard' },
                { endIndex: boardModule.rowColToIndex({ row: 1, col: 1 }), type: 'capture' },
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
                { endIndex: boardModule.rowColToIndex({ row: 4, col: 5 }), type: 'standard' },
                { endIndex: boardModule.rowColToIndex({ row: 4, col: 3 }), type: 'standard' },
                { endIndex: boardModule.rowColToIndex({ row: 4, col: 2 }), type: 'capture' },
                { endIndex: boardModule.rowColToIndex({ row: 5, col: 4 }), type: 'standard' },
                { endIndex: boardModule.rowColToIndex({ row: 6, col: 4 }), type: 'standard' },
                { endIndex: boardModule.rowColToIndex({ row: 7, col: 4 }), type: 'standard' },
                { endIndex: boardModule.rowColToIndex({ row: 3, col: 4 }), type: 'standard' },
                { endIndex: boardModule.rowColToIndex({ row: 2, col: 4 }), type: 'capture' },
            ],
        },
    ])('computes sliding moves when $scenario', ({ color, pieceType, start, placements, expectedMoves }) => {
        const board = buildBoard(placements as Placement[]);
        const startIndex = boardModule.rowColToIndex(start);

        const result = computeSlidingPieceLegalMoves(board, startIndex, color, pieceType);

        expect(result.map(({ endIndex, type }) => ({ endIndex, type }))).toEqual(expectedMoves);
    });
});

describe('computeLegalMovesFromRowColDeltas', () => {
    it.each([
        {
            scenario: 'white knight captures enemy and skips friendly square',
            color: 'white' as const,
            start: { row: 3, col: 3 },
            placements: [
                { row: 3, col: 3, alias: 'N' },
                { row: 5, col: 4, alias: 'p' },
                { row: 4, col: 5, alias: 'P' },
            ],
            deltas: [
                [2, 1],
                [1, 2],
                [-2, -1],
                [-4, 0],
            ] as [number, number][],
            expectedMoves: [
                { endIndex: boardModule.rowColToIndex({ row: 5, col: 4 }), type: 'capture' },
                { endIndex: boardModule.rowColToIndex({ row: 1, col: 2 }), type: 'standard' },
            ],
        },
        {
            scenario: 'black knight mirrors capture logic with uppercase opponents',
            color: 'black' as const,
            start: { row: 4, col: 4 },
            placements: [
                { row: 4, col: 4, alias: 'n' },
                { row: 2, col: 5, alias: 'P' },
                { row: 6, col: 5, alias: 'p' },
            ],
            deltas: [
                [-2, 1],
                [2, 1],
                [1, -2],
            ] as [number, number][],
            expectedMoves: [
                { endIndex: boardModule.rowColToIndex({ row: 2, col: 5 }), type: 'capture' },
                { endIndex: boardModule.rowColToIndex({ row: 5, col: 2 }), type: 'standard' },
            ],
        },
    ])('returns moves for $scenario', ({ color, start, placements, deltas, expectedMoves }) => {
        const board = buildBoard(placements as Placement[]);
        const startIndex = boardModule.rowColToIndex(start);

        const result = computeLegalMovesFromRowColDeltas(board, startIndex, color, deltas);

        expect(result.map(({ endIndex, type }) => ({ endIndex, type }))).toEqual(expectedMoves);
    });
});

describe('validatePromotion', () => {
    it('does nothing when the piece is not a pawn', () => {
        const move = createMove({
            piece: createPiece({ type: 'knight', alias: 'N' }),
            endIndex: 7,
        });

        expect(() => validatePromotion(move)).not.toThrow();
    });

    it('allows pawn moves that do not reach a promotion square without checking promotion details', () => {
        const isPromotionSquareSpy = vi.spyOn(boardModule, 'isPromotionSquare').mockReturnValue(false);
        const getColorSpy = vi.spyOn(piecesModule, 'getColorFromAlias');
        const move = createMove({ piece: createPiece({ type: 'pawn', color: 'black', alias: 'p' }) });

        expect(() => validatePromotion(move)).not.toThrow();
        expect(isPromotionSquareSpy).toHaveBeenCalledWith(move.endIndex, move.piece.color);
        expect(getColorSpy).not.toHaveBeenCalled();
    });

    it('throws when a pawn reaches a promotion square without specifying a promotion piece', () => {
        vi.spyOn(boardModule, 'isPromotionSquare').mockReturnValue(true);
        const move = createMove({ piece: createPiece({ type: 'pawn', alias: 'P' }), promotion: undefined });

        expect(() => validatePromotion(move)).toThrow(InvalidInputError);
    });

    it('throws when the promotion piece has a mismatched color', () => {
        vi.spyOn(boardModule, 'isPromotionSquare').mockReturnValue(true);
        vi.spyOn(piecesModule, 'getColorFromAlias').mockReturnValue('black');
        const move = createMove({
            piece: createPiece({ type: 'pawn', color: 'white', alias: 'P' }),
            promotion: 'q',
        });

        expect(() => validatePromotion(move)).toThrow(InvalidInputError);
    });

    it('accepts a valid promotion piece with matching color', () => {
        vi.spyOn(boardModule, 'isPromotionSquare').mockReturnValue(true);
        vi.spyOn(piecesModule, 'getColorFromAlias').mockReturnValue('white');
        const move = createMove({
            piece: createPiece({ type: 'pawn', color: 'white', alias: 'P' }),
            promotion: 'Q',
        });

        expect(() => validatePromotion(move)).not.toThrow();
    });
});

describe('getPieceCaptureFromMove', () => {
    it.each([
        { scenario: 'regular capture', moveType: 'capture' as Move['type'] },
        { scenario: 'en passant capture', moveType: 'en-passant' as Move['type'] },
    ])('returns capture details for $scenario', ({ moveType }) => {
        const capturedPiece = createPiece({ alias: 'p', color: 'black' });
        const move = createMove({
            type: moveType,
            capturedPiece,
        });
        const expectedCapture: PieceCapture = { piece: capturedPiece, moveIndex: 3 };

        const result = getPieceCaptureFromMove(move, 3);

        expect(result).toEqual(expectedCapture);
    });

    it('throws when a capture move is missing the captured piece', () => {
        const move = createMove({ type: 'capture', capturedPiece: undefined });

        expect(() => getPieceCaptureFromMove(move, 5)).toThrow(/expected to have a capturedPiece/);
    });

    it('returns null for non-capturing moves', () => {
        const move = createMove({ type: 'standard' });

        expect(getPieceCaptureFromMove(move, 0)).toBeNull();
    });
});

describe('getNextPositionCounts', () => {
    it.each([
        {
            scenario: 'clears counts after a reset halfmove clock',
            halfmoveClock: 0,
            previousCounts: { old: 2 },
            expectedCounts: { 'key-1': 1 },
        },
        {
            scenario: 'increments existing position count',
            halfmoveClock: 4,
            previousCounts: { 'key-2': 2 },
            expectedCounts: { 'key-2': 3 },
        },
        {
            scenario: 'initializes count when position has not been seen',
            halfmoveClock: 2,
            previousCounts: {},
            expectedCounts: { 'key-3': 1 },
        },
    ])('computes next position counts when $scenario', ({ halfmoveClock, previousCounts, expectedCounts }) => {
        const keys = Object.keys(expectedCounts);
        const keyToReturn = keys[0];
        vi.spyOn(drawsModule, 'createRepetitionKeyFromBoardState').mockReturnValue(keyToReturn);
        const boardState = createBoardState({ halfmoveClock });

        const result = getNextPositionCounts(previousCounts as PositionCounts, boardState);

        expect(drawsModule.createRepetitionKeyFromBoardState).toHaveBeenCalledWith(boardState);
        expect(result).toEqual(expectedCounts);
    });
});

describe('getNextCastleRightsAfterMove', () => {
    it('merges castle-right changes into the previous rights', () => {
        const prevRights: CastleRightsByColor = {
            white: { short: true, long: true },
            black: { short: false, long: true },
        };
        const diff = {
            white: { short: false },
            black: { long: false },
        };
        vi.spyOn(castlesModule, 'computeCastleRightsChangesFromMove').mockReturnValue(diff);

        const move = createMove();
        const result = getNextCastleRightsAfterMove(prevRights, move);

        expect(castlesModule.computeCastleRightsChangesFromMove).toHaveBeenCalledWith(move);
        expect(result).toEqual({
            white: { short: false, long: true },
            black: { short: false, long: false },
        });
    });

    it('falls back to previous rights when white has no updates', () => {
        const prevRights: CastleRightsByColor = {
            white: { short: false, long: true },
            black: { short: true, long: false },
        };
        vi.spyOn(castlesModule, 'computeCastleRightsChangesFromMove').mockReturnValue({
            black: { short: false },
        });

        const result = getNextCastleRightsAfterMove(prevRights, createMove());

        expect(result).toEqual({
            white: { short: false, long: true },
            black: { short: false, long: false },
        });
    });

    it('falls back to previous rights when black has no updates', () => {
        const prevRights: CastleRightsByColor = {
            white: { short: true, long: false },
            black: { short: false, long: true },
        };
        vi.spyOn(castlesModule, 'computeCastleRightsChangesFromMove').mockReturnValue({
            white: { short: false },
        });

        const result = getNextCastleRightsAfterMove(prevRights, createMove());

        expect(result).toEqual({
            white: { short: false, long: false },
            black: { short: false, long: true },
        });
    });
});

describe('getNextBoardStateAfterMove', () => {
    it('computes the next state for a pawn move and resets counters', () => {
        const prevCastleRights: CastleRightsByColor = {
            white: { short: true, long: false },
            black: { short: true, long: true },
        };
        const prevState = createBoardState({
            board: createBoard(),
            playerTurn: 'white',
            castleRightsByColor: prevCastleRights,
            halfmoveClock: 5,
            fullmoveClock: 7,
        });
        const move = createMove({
            startIndex: 8,
            endIndex: 16,
            type: 'standard',
            piece: createPiece({ type: 'pawn', color: 'white', alias: 'P' }),
        });
        const computedBoard = createBoard();
        vi.spyOn(chessMovesModule, 'computeNextChessBoardFromMove').mockReturnValue(computedBoard);
        vi.spyOn(boardModule, 'computeEnPassantTargetIndex').mockReturnValue(12);
        const rightsDiff = {
            white: {},
            black: { short: false },
        };
        vi.spyOn(castlesModule, 'computeCastleRightsChangesFromMove').mockReturnValue(rightsDiff);
        const expectedCastleRights: CastleRightsByColor = {
            white: { short: true, long: false },
            black: { short: false, long: true },
        };

        const result = getNextBoardStateAfterMove(prevState, move);

        expect(chessMovesModule.computeNextChessBoardFromMove).toHaveBeenCalledWith(prevState.board, move);
        expect(castlesModule.computeCastleRightsChangesFromMove).toHaveBeenCalledWith(move);
        expect(boardModule.computeEnPassantTargetIndex).toHaveBeenCalledWith(move.startIndex, move.endIndex);
        expect(result).toEqual<ChessBoardState>({
            board: computedBoard,
            playerTurn: 'black',
            castleRightsByColor: expectedCastleRights,
            enPassantTargetIndex: 12,
            halfmoveClock: 0,
            fullmoveClock: 7,
        });
    });

    it('increments clocks and omits en-passant target for non-pawn, non-capture moves', () => {
        const prevCastleRights: CastleRightsByColor = {
            white: { short: false, long: false },
            black: { short: true, long: false },
        };
        const prevState = createBoardState({
            board: createBoard(),
            playerTurn: 'black',
            castleRightsByColor: prevCastleRights,
            halfmoveClock: 3,
            fullmoveClock: 10,
        });
        const move = createMove({
            type: 'standard',
            piece: createPiece({ type: 'knight', alias: 'N', value: 3 }),
        });
        const computedBoard = createBoard();
        vi.spyOn(chessMovesModule, 'computeNextChessBoardFromMove').mockReturnValue(computedBoard);
        const enPassantSpy = vi.spyOn(boardModule, 'computeEnPassantTargetIndex');
        const rightsDiff = {
            white: {},
            black: {},
        };
        vi.spyOn(castlesModule, 'computeCastleRightsChangesFromMove').mockReturnValue(rightsDiff);
        const expectedCastleRights: CastleRightsByColor = {
            white: { short: false, long: false },
            black: { short: true, long: false },
        };

        const result = getNextBoardStateAfterMove(prevState, move);

        expect(enPassantSpy).not.toHaveBeenCalled();
        expect(result).toEqual<ChessBoardState>({
            board: computedBoard,
            playerTurn: 'white',
            castleRightsByColor: expectedCastleRights,
            enPassantTargetIndex: null,
            halfmoveClock: 4,
            fullmoveClock: 11,
        });
    });
});
