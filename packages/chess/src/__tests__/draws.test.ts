import { rowColToIndex } from '../board.js';
import {
    computeForcedDrawStatus,
    createRepetitionKeyFromBoardState,
    hasInsufficientMatingMaterial,
    isDrawStatus,
} from '../draws.js';
import * as piecesModule from '../pieces.js';
import type { ChessBoardState, ChessBoardType, ChessGameStatus, PieceAlias, PieceColor } from '../schema.js';

const { WHITE_KING_START_INDEX, BLACK_KING_START_INDEX } = piecesModule;

type PiecePlacement = {
    index: number;
    alias: PieceAlias;
};

const buildBoard = (pieces: PiecePlacement[] = []): ChessBoardType => {
    const board = Array<ChessBoardType[number]>(64).fill(null);
    board[WHITE_KING_START_INDEX] = 'K';
    board[BLACK_KING_START_INDEX] = 'k';

    pieces.forEach(({ index, alias }) => {
        board[index] = alias;
    });

    return board as ChessBoardType;
};

const createBoardState = (overrides: Partial<ChessBoardState> = {}): ChessBoardState => ({
    board: buildBoard(),
    playerTurn: 'white',
    castleRightsByColor: {
        white: { short: false, long: false },
        black: { short: false, long: false },
    },
    enPassantTargetIndex: null,
    halfmoveClock: 0,
    fullmoveClock: 1,
    ...overrides,
});

describe('isDrawStatus', () => {
    it.each([
        { scenario: 'recognizes stalemate', status: 'stalemate' as ChessGameStatus, expected: true },
        { scenario: 'recognizes 50-move draw', status: '50-move-draw' as ChessGameStatus, expected: true },
        {
            scenario: 'recognizes threefold repetition',
            status: 'threefold-repetition' as ChessGameStatus,
            expected: true,
        },
        { scenario: 'recognizes draw by agreement', status: 'draw-by-agreement' as ChessGameStatus, expected: true },
        {
            scenario: 'recognizes insufficient material',
            status: 'insufficient-material' as ChessGameStatus,
            expected: true,
        },
        { scenario: 'excludes in-progress status', status: 'in-progress' as ChessGameStatus, expected: false },
        { scenario: 'excludes checkmate status', status: 'checkmate' as ChessGameStatus, expected: false },
        { scenario: 'excludes resignation status', status: 'resigned' as ChessGameStatus, expected: false },
    ])('$scenario', ({ status, expected }) => {
        expect(isDrawStatus(status)).toBe(expected);
    });
});

describe('createRepetitionKeyFromBoardState', () => {
    it('extracts the FEN components relevant to repetition detection', () => {
        const enPassantTargetIndex = rowColToIndex({ row: 2, col: 3 });
        const boardState = createBoardState({
            playerTurn: 'black',
            enPassantTargetIndex,
            castleRightsByColor: {
                white: { short: true, long: false },
                black: { short: false, long: true },
            },
            halfmoveClock: 42,
            fullmoveClock: 73,
        });

        expect(createRepetitionKeyFromBoardState(boardState)).toBe('4k3/8/8/8/8/8/8/4K3 b Kq d6');
    });
});

describe('hasInsufficientMatingMaterial', () => {
    it.each([
        { scenario: 'bare kings only', pieces: [] as PiecePlacement[], expected: true },
        {
            scenario: 'major material present for white',
            pieces: [{ index: 52, alias: 'P' }] as PiecePlacement[],
            expected: false,
        },
        {
            scenario: 'single minor piece per side',
            pieces: [
                { index: 58, alias: 'B' },
                { index: 1, alias: 'n' },
            ] as PiecePlacement[],
            expected: true,
        },
        {
            scenario: 'white two knights versus bare king',
            pieces: [
                { index: 57, alias: 'N' },
                { index: 50, alias: 'N' },
            ] as PiecePlacement[],
            expected: true,
        },
        {
            scenario: 'black two knights versus bare king',
            pieces: [
                { index: 1, alias: 'n' },
                { index: 2, alias: 'n' },
            ] as PiecePlacement[],
            expected: true,
        },
        {
            scenario: 'both sides have multiple minor pieces',
            pieces: [
                { index: 57, alias: 'N' },
                { index: 58, alias: 'B' },
                { index: 1, alias: 'n' },
                { index: 2, alias: 'b' },
            ] as PiecePlacement[],
            expected: false,
        },
        {
            scenario: 'white has a pawn',
            color: 'white' as PieceColor,
            pieces: [{ index: 52, alias: 'P' }] as PiecePlacement[],
            expected: false,
        },
        {
            scenario: 'white only has a king',
            color: 'white' as PieceColor,
            pieces: [] as PiecePlacement[],
            expected: true,
        },
        {
            scenario: 'white king and single bishop',
            color: 'white' as PieceColor,
            pieces: [{ index: 58, alias: 'B' }] as PiecePlacement[],
            expected: true,
        },
        {
            scenario: 'white king and two knights',
            color: 'white' as PieceColor,
            pieces: [
                { index: 57, alias: 'N' },
                { index: 50, alias: 'N' },
            ] as PiecePlacement[],
            expected: true,
        },
        {
            scenario: 'white king with bishop and knight',
            color: 'white' as PieceColor,
            pieces: [
                { index: 57, alias: 'N' },
                { index: 58, alias: 'B' },
            ] as PiecePlacement[],
            expected: false,
        },
        {
            scenario: 'white king with rook',
            color: 'white' as PieceColor,
            pieces: [{ index: 63, alias: 'R' }] as PiecePlacement[],
            expected: false,
        },
        {
            scenario: 'white king with queen',
            color: 'white' as PieceColor,
            pieces: [{ index: 59, alias: 'Q' }] as PiecePlacement[],
            expected: false,
        },
        {
            scenario: 'black king and two knights',
            color: 'black' as PieceColor,
            pieces: [
                { index: 1, alias: 'n' },
                { index: 2, alias: 'n' },
            ] as PiecePlacement[],
            expected: true,
        },
        {
            scenario: 'black king with bishop and knight',
            color: 'black' as PieceColor,
            pieces: [
                { index: 1, alias: 'n' },
                { index: 2, alias: 'b' },
            ] as PiecePlacement[],
            expected: false,
        },
    ])('$scenario', ({ pieces, color, expected }) => {
        const board = buildBoard(pieces);
        expect(hasInsufficientMatingMaterial(board, color)).toBe(expected);
    });

    it('throws when an unexpected piece type is encountered', () => {
        const originalGetPiece = piecesModule.getPiece;
        const getPieceSpy = vi.spyOn(piecesModule, 'getPiece').mockImplementation((alias) => {
            if (alias === 'P') {
                return {
                    alias: 'P',
                    color: 'white',
                    type: 'archer',
                    value: 1,
                } as unknown as ReturnType<typeof originalGetPiece>;
            }
            return originalGetPiece(alias);
        });

        const board = buildBoard([{ index: 52, alias: 'P' }]);

        expect(() => hasInsufficientMatingMaterial(board)).toThrow("Unexpected piece type 'archer'");

        getPieceSpy.mockRestore();
    });
});

describe('computeForcedDrawStatus', () => {
    it('returns stalemate when no legal moves remain', () => {
        const board = buildBoard();
        expect(computeForcedDrawStatus(board, true, 0, {})).toBe('stalemate');
    });

    it('returns a 50-move draw when halfmove clock reaches the threshold', () => {
        const board = buildBoard([{ index: 52, alias: 'P' }]);
        expect(computeForcedDrawStatus(board, false, 100, {})).toBe('50-move-draw');
    });

    it('returns insufficient material when neither side can checkmate', () => {
        const board = buildBoard();
        expect(computeForcedDrawStatus(board, false, 20, {})).toBe('insufficient-material');
    });

    it('returns threefold repetition when a position occurs three times', () => {
        const board = buildBoard([{ index: 52, alias: 'P' }]);
        expect(computeForcedDrawStatus(board, false, 12, { '4k3/8/8/8/8/8/8/4K3 w - -': 3 })).toBe(
            'threefold-repetition'
        );
    });

    it('returns null when no forced draw condition applies', () => {
        const board = buildBoard([{ index: 52, alias: 'P' }]);
        expect(computeForcedDrawStatus(board, false, 10, { '4k3/8/8/8/8/8/8/4K3 w - -': 2 })).toBeNull();
    });
});
