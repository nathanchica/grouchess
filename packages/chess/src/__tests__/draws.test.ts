import type { ChessGameStatus, PieceAlias, PieceColor } from '@grouchess/models';
import { createMockChessBoard, createMockChessBoardState } from '@grouchess/test-utils';

import { rowColToIndex } from '../board.js';
import {
    computeForcedDrawStatus,
    createRepetitionKeyFromBoardState,
    hasInsufficientMatingMaterial,
    isDrawStatus,
} from '../draws.js';
import * as piecesModule from '../pieces.js';

const { WHITE_KING_START_INDEX, BLACK_KING_START_INDEX } = piecesModule;

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
        const boardState = createMockChessBoardState({
            board: createMockChessBoard({
                [WHITE_KING_START_INDEX]: 'K',
                [BLACK_KING_START_INDEX]: 'k',
            }),
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
        {
            scenario: 'bare kings only',
            boardOverrides: { [WHITE_KING_START_INDEX]: 'K', [BLACK_KING_START_INDEX]: 'k' } as Record<
                number,
                PieceAlias
            >,
            expected: true,
        },
        {
            scenario: 'major material present for white',
            boardOverrides: { [WHITE_KING_START_INDEX]: 'K', [BLACK_KING_START_INDEX]: 'k', 52: 'P' } as Record<
                number,
                PieceAlias
            >,
            expected: false,
        },
        {
            scenario: 'single minor piece per side',
            boardOverrides: {
                [WHITE_KING_START_INDEX]: 'K',
                [BLACK_KING_START_INDEX]: 'k',
                58: 'B',
                1: 'n',
            } as Record<number, PieceAlias>,
            expected: true,
        },
        {
            scenario: 'white two knights versus bare king',
            boardOverrides: {
                [WHITE_KING_START_INDEX]: 'K',
                [BLACK_KING_START_INDEX]: 'k',
                57: 'N',
                50: 'N',
            } as Record<number, PieceAlias>,
            expected: true,
        },
        {
            scenario: 'black two knights versus bare king',
            boardOverrides: {
                [WHITE_KING_START_INDEX]: 'K',
                [BLACK_KING_START_INDEX]: 'k',
                1: 'n',
                2: 'n',
            } as Record<number, PieceAlias>,
            expected: true,
        },
        {
            scenario: 'both sides have multiple minor pieces',
            boardOverrides: {
                [WHITE_KING_START_INDEX]: 'K',
                [BLACK_KING_START_INDEX]: 'k',
                57: 'N',
                58: 'B',
                1: 'n',
                2: 'b',
            } as Record<number, PieceAlias>,
            expected: false,
        },
        {
            scenario: 'white has a pawn',
            color: 'white' as PieceColor,
            boardOverrides: { [WHITE_KING_START_INDEX]: 'K', [BLACK_KING_START_INDEX]: 'k', 52: 'P' } as Record<
                number,
                PieceAlias
            >,
            expected: false,
        },
        {
            scenario: 'white only has a king',
            color: 'white' as PieceColor,
            boardOverrides: { [WHITE_KING_START_INDEX]: 'K', [BLACK_KING_START_INDEX]: 'k' } as Record<
                number,
                PieceAlias
            >,
            expected: true,
        },
        {
            scenario: 'white king and single bishop',
            color: 'white' as PieceColor,
            boardOverrides: { [WHITE_KING_START_INDEX]: 'K', [BLACK_KING_START_INDEX]: 'k', 58: 'B' } as Record<
                number,
                PieceAlias
            >,
            expected: true,
        },
        {
            scenario: 'white king and two knights',
            color: 'white' as PieceColor,
            boardOverrides: {
                [WHITE_KING_START_INDEX]: 'K',
                [BLACK_KING_START_INDEX]: 'k',
                57: 'N',
                50: 'N',
            } as Record<number, PieceAlias>,
            expected: true,
        },
        {
            scenario: 'white king with bishop and knight',
            color: 'white' as PieceColor,
            boardOverrides: {
                [WHITE_KING_START_INDEX]: 'K',
                [BLACK_KING_START_INDEX]: 'k',
                57: 'N',
                58: 'B',
            } as Record<number, PieceAlias>,
            expected: false,
        },
        {
            scenario: 'white king with rook',
            color: 'white' as PieceColor,
            boardOverrides: { [WHITE_KING_START_INDEX]: 'K', [BLACK_KING_START_INDEX]: 'k', 63: 'R' } as Record<
                number,
                PieceAlias
            >,
            expected: false,
        },
        {
            scenario: 'white king with queen',
            color: 'white' as PieceColor,
            boardOverrides: { [WHITE_KING_START_INDEX]: 'K', [BLACK_KING_START_INDEX]: 'k', 59: 'Q' } as Record<
                number,
                PieceAlias
            >,
            expected: false,
        },
        {
            scenario: 'black king and two knights',
            color: 'black' as PieceColor,
            boardOverrides: {
                [WHITE_KING_START_INDEX]: 'K',
                [BLACK_KING_START_INDEX]: 'k',
                1: 'n',
                2: 'n',
            } as Record<number, PieceAlias>,
            expected: true,
        },
        {
            scenario: 'black king with bishop and knight',
            color: 'black' as PieceColor,
            boardOverrides: {
                [WHITE_KING_START_INDEX]: 'K',
                [BLACK_KING_START_INDEX]: 'k',
                1: 'n',
                2: 'b',
            } as Record<number, PieceAlias>,
            expected: false,
        },
    ])('$scenario', ({ boardOverrides, color, expected }) => {
        const board = createMockChessBoard(boardOverrides);
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

        const board = createMockChessBoard({
            [WHITE_KING_START_INDEX]: 'K',
            [BLACK_KING_START_INDEX]: 'k',
            52: 'P',
        });

        expect(() => hasInsufficientMatingMaterial(board)).toThrow("Unexpected piece type 'archer'");

        getPieceSpy.mockRestore();
    });
});

describe('computeForcedDrawStatus', () => {
    it('returns stalemate when no legal moves remain', () => {
        const board = createMockChessBoard({
            [WHITE_KING_START_INDEX]: 'K',
            [BLACK_KING_START_INDEX]: 'k',
        });
        expect(computeForcedDrawStatus(board, true, 0, {})).toBe('stalemate');
    });

    it('returns a 50-move draw when halfmove clock reaches the threshold', () => {
        const board = createMockChessBoard({
            [WHITE_KING_START_INDEX]: 'K',
            [BLACK_KING_START_INDEX]: 'k',
            52: 'P',
        });
        expect(computeForcedDrawStatus(board, false, 100, {})).toBe('50-move-draw');
    });

    it('returns insufficient material when neither side can checkmate', () => {
        const board = createMockChessBoard({
            [WHITE_KING_START_INDEX]: 'K',
            [BLACK_KING_START_INDEX]: 'k',
        });
        expect(computeForcedDrawStatus(board, false, 20, {})).toBe('insufficient-material');
    });

    it('returns threefold repetition when a position occurs three times', () => {
        const board = createMockChessBoard({
            [WHITE_KING_START_INDEX]: 'K',
            [BLACK_KING_START_INDEX]: 'k',
            52: 'P',
        });
        expect(computeForcedDrawStatus(board, false, 12, { '4k3/8/8/8/8/8/8/4K3 w - -': 3 })).toBe(
            'threefold-repetition'
        );
    });

    it('returns null when no forced draw condition applies', () => {
        const board = createMockChessBoard({
            [WHITE_KING_START_INDEX]: 'K',
            [BLACK_KING_START_INDEX]: 'k',
            52: 'P',
        });
        expect(computeForcedDrawStatus(board, false, 10, { '4k3/8/8/8/8/8/8/4K3 w - -': 2 })).toBeNull();
    });
});
