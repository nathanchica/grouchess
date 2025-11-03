import { describe, it, expect } from 'vitest';

import {
    createMockBoardIndex,
    createMockChessBoard,
    createMockChessBoardState,
    createMockChessGame,
    createMockChessGameState,
    createMockLegalMovesStore,
    createMockMove,
    createMockMoveNotation,
    createMockMoveRecord,
    createMockPiece,
    createMockPieceCapture,
    createMockPositionCounts,
    createMockRowCol,
    createMockStartingChessBoard,
    createMockStartingChessBoardState,
    createMockStartingChessGame,
} from '../chess.js';

describe('Chess Mock Factories', () => {
    describe('createMockBoardIndex', () => {
        it('should create a valid board index', () => {
            const index = createMockBoardIndex(10);
            expect(index).toBe(10);
        });

        it('should clamp values to valid range', () => {
            expect(createMockBoardIndex(-1)).toBe(0);
            expect(createMockBoardIndex(100)).toBe(63);
        });
    });

    describe('createMockRowCol', () => {
        it('should create default RowCol', () => {
            const rowCol = createMockRowCol();
            expect(rowCol).toEqual({ row: 0, col: 0 });
        });

        it('should apply overrides', () => {
            const rowCol = createMockRowCol({ row: 3, col: 5 });
            expect(rowCol).toEqual({ row: 3, col: 5 });
        });
    });

    describe('createMockPiece', () => {
        it('should create default white pawn', () => {
            const piece = createMockPiece();
            expect(piece).toEqual({
                alias: 'P',
                color: 'white',
                type: 'pawn',
                value: 1,
            });
        });

        it('should apply overrides', () => {
            const piece = createMockPiece({
                alias: 'Q',
                color: 'black',
                type: 'queen',
                value: 9,
            });
            expect(piece).toEqual({
                alias: 'Q',
                color: 'black',
                type: 'queen',
                value: 9,
            });
        });
    });

    describe('createMockChessBoard', () => {
        it('should create empty board by default', () => {
            const board = createMockChessBoard();
            expect(board).toHaveLength(64);
            expect(board.every((square) => square === null)).toBe(true);
        });

        it('should apply overrides', () => {
            const board = createMockChessBoard({ 0: 'R', 7: 'K' });
            expect(board[0]).toBe('R');
            expect(board[7]).toBe('K');
            expect(board[1]).toBe(null);
        });
    });

    describe('createMockStartingChessBoard', () => {
        it('should create starting position', () => {
            const board = createMockStartingChessBoard();
            expect(board).toHaveLength(64);
            expect(board[0]).toBe('r'); // Black rook
            expect(board[4]).toBe('k'); // Black king
            expect(board[60]).toBe('K'); // White king
            expect(board[63]).toBe('R'); // White rook
        });
    });

    describe('createMockChessBoardState', () => {
        it('should create default board state', () => {
            const state = createMockChessBoardState();
            expect(state.board).toHaveLength(64);
            expect(state.playerTurn).toBe('white');
            expect(state.castleRightsByColor.white.short).toBe(true);
            expect(state.enPassantTargetIndex).toBe(null);
            expect(state.halfmoveClock).toBe(0);
            expect(state.fullmoveClock).toBe(1);
        });

        it('should apply overrides', () => {
            const state = createMockChessBoardState({
                playerTurn: 'black',
                halfmoveClock: 5,
            });
            expect(state.playerTurn).toBe('black');
            expect(state.halfmoveClock).toBe(5);
        });
    });

    describe('createMockStartingChessBoardState', () => {
        it('should create starting board state', () => {
            const state = createMockStartingChessBoardState();
            expect(state.board[0]).toBe('r');
            expect(state.playerTurn).toBe('white');
        });
    });

    describe('createMockMove', () => {
        it('should create default move', () => {
            const move = createMockMove();
            expect(move.startIndex).toBe(52);
            expect(move.endIndex).toBe(36);
            expect(move.type).toBe('standard');
        });

        it('should apply overrides', () => {
            const move = createMockMove({
                startIndex: 10,
                endIndex: 20,
                type: 'capture',
            });
            expect(move.startIndex).toBe(10);
            expect(move.endIndex).toBe(20);
            expect(move.type).toBe('capture');
        });
    });

    describe('createMockMoveNotation', () => {
        it('should create default notation', () => {
            const notation = createMockMoveNotation();
            expect(notation.san).toBe('Nf3');
            expect(notation.uci).toBe('g1f3');
        });
    });

    describe('createMockMoveRecord', () => {
        it('should create move record with move and notation', () => {
            const record = createMockMoveRecord();
            expect(record.move).toBeDefined();
            expect(record.notation).toBeDefined();
        });
    });

    describe('createMockLegalMovesStore', () => {
        it('should create empty legal moves store', () => {
            const store = createMockLegalMovesStore();
            expect(store.allMoves).toEqual([]);
            expect(store.byStartIndex).toEqual({});
            expect(store.typeAndEndIndexToStartIndex).toEqual({});
        });
    });

    describe('createMockChessGameState', () => {
        it('should create in-progress game state', () => {
            const gameState = createMockChessGameState();
            expect(gameState.status).toBe('in-progress');
        });

        it('should apply overrides', () => {
            const gameState = createMockChessGameState({
                status: 'checkmate',
                winner: 'white',
            });
            expect(gameState.status).toBe('checkmate');
            expect(gameState.winner).toBe('white');
        });
    });

    describe('createMockPieceCapture', () => {
        it('should create piece capture', () => {
            const capture = createMockPieceCapture();
            expect(capture.piece).toBeDefined();
            expect(capture.moveIndex).toBe(0);
        });
    });

    describe('createMockPositionCounts', () => {
        it('should create empty position counts by default', () => {
            const counts = createMockPositionCounts();
            expect(counts).toEqual({});
        });

        it('should apply overrides', () => {
            const counts = createMockPositionCounts({
                positionHash1: 2,
                positionHash2: 3,
            });
            expect(counts).toEqual({
                positionHash1: 2,
                positionHash2: 3,
            });
        });
    });

    describe('createMockChessGame', () => {
        it('should create complete chess game with empty board', () => {
            const game = createMockChessGame();
            expect(game.boardState).toBeDefined();
            expect(game.gameState).toBeDefined();
            expect(game.legalMovesStore).toBeDefined();
            expect(game.moveHistory).toEqual([]);
            expect(game.captures).toEqual([]);
            expect(game.positionCounts).toEqual({});
        });
    });

    describe('createMockStartingChessGame', () => {
        it('should create complete chess game with starting position', () => {
            const game = createMockStartingChessGame();
            expect(game.boardState.board[0]).toBe('r');
            expect(game.gameState.status).toBe('in-progress');
        });
    });
});
