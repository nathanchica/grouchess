import { rowColToIndex } from '../board.js';
import { computeAllLegalMoves, computeNextChessBoardFromMove, isKingInCheck, isSquareAttacked } from '../moves.js';
import type { ChessBoardState, ChessBoardType, Move, PieceAlias, PieceColor } from '../schema.js';
import { createMove } from '../utils/moves.js';

const createEmptyBoard = (): ChessBoardType => Array(64).fill(undefined) as ChessBoardType;
const createBoardIndex = (row: number, col: number) => rowColToIndex({ row, col });
const createBoardWithKings = (whiteKingIndex = 60, blackKingIndex = 4): ChessBoardType => {
    const board = createEmptyBoard();
    board[whiteKingIndex] = 'K';
    board[blackKingIndex] = 'k';
    return board;
};

describe('isSquareAttacked', () => {
    it.each([
        {
            scenario: 'white pawn on backward diagonal',
            attackerColor: 'white',
            squareIndex: createBoardIndex(3, 4),
            pieces: [{ alias: 'P', position: createBoardIndex(4, 3) }],
        },
        {
            scenario: 'black pawn on backward diagonal',
            attackerColor: 'black',
            squareIndex: createBoardIndex(4, 4),
            pieces: [{ alias: 'p', position: createBoardIndex(3, 3) }],
        },
        {
            scenario: 'knight jump',
            attackerColor: 'black',
            squareIndex: createBoardIndex(4, 4),
            pieces: [{ alias: 'n', position: createBoardIndex(2, 3) }],
        },
        {
            scenario: 'king adjacency',
            attackerColor: 'white',
            squareIndex: createBoardIndex(4, 4),
            pieces: [{ alias: 'K', position: createBoardIndex(5, 5) }],
        },
        {
            scenario: 'bishop on diagonal ray',
            attackerColor: 'white',
            squareIndex: createBoardIndex(4, 4),
            pieces: [{ alias: 'B', position: createBoardIndex(1, 1) }],
        },
        {
            scenario: 'rook on straight ray',
            attackerColor: 'black',
            squareIndex: createBoardIndex(4, 4),
            pieces: [{ alias: 'r', position: createBoardIndex(0, 4) }],
        },
    ])('detects attack for $scenario', ({ attackerColor, squareIndex, pieces }) => {
        const board = createEmptyBoard();
        pieces.forEach(({ alias, position }) => {
            board[position] = alias as PieceAlias;
        });

        expect(isSquareAttacked(board, squareIndex, attackerColor as PieceColor)).toBe(true);
    });

    it('returns false when a sliding attacker is blocked by another piece', () => {
        const board = createEmptyBoard();
        board[createBoardIndex(0, 4)] = 'r';
        board[createBoardIndex(2, 4)] = 'P';

        expect(isSquareAttacked(board, createBoardIndex(4, 4), 'black')).toBe(false);
    });

    it('returns false when no attacker of the requested color is present', () => {
        const board = createEmptyBoard();
        board[createBoardIndex(2, 3)] = 'N';

        expect(isSquareAttacked(board, createBoardIndex(4, 4), 'black')).toBe(false);
    });
});

describe('isKingInCheck', () => {
    it('returns true when the king is attacked by an opponent piece', () => {
        const board = createBoardWithKings(60, 0);
        board[createBoardIndex(0, 4)] = 'r';

        expect(isKingInCheck(board, 'white')).toBe(true);
    });

    it('returns false when intervening pieces block the attack', () => {
        const board = createBoardWithKings(60, 0);
        board[createBoardIndex(0, 4)] = 'r';
        board[createBoardIndex(6, 4)] = 'P';

        expect(isKingInCheck(board, 'white')).toBe(false);
    });

    it('detects check against the black king', () => {
        const board = createBoardWithKings(60, 0);
        board[createBoardIndex(2, 2)] = 'B';

        expect(isKingInCheck(board, 'black')).toBe(true);
    });
});

describe('computeNextChessBoardFromMove', () => {
    it('moves a piece to the destination square for standard moves', () => {
        const board = createEmptyBoard();
        board[57] = 'N';
        const move = createMove(board, 57, 42, 'standard');

        const nextBoard = computeNextChessBoardFromMove(board, move);

        expect(nextBoard[57]).toBeUndefined();
        expect(nextBoard[42]).toBe('N');
        expect(board[57]).toBe('N');
        expect(board[42]).toBeUndefined();
    });

    it('captures pieces on the destination square', () => {
        const board = createEmptyBoard();
        board[57] = 'N';
        board[42] = 'p';
        const move = createMove(board, 57, 42, 'capture');

        const nextBoard = computeNextChessBoardFromMove(board, move);

        expect(nextBoard[57]).toBeUndefined();
        expect(nextBoard[42]).toBe('N');
        expect(board[42]).toBe('p');
    });

    it('removes the captured pawn for en-passant moves', () => {
        const board = createEmptyBoard();
        board[28] = 'P';
        board[29] = 'p';
        const move = createMove(board, 28, 21, 'en-passant');

        const nextBoard = computeNextChessBoardFromMove(board, move);

        expect(nextBoard[28]).toBeUndefined();
        expect(nextBoard[21]).toBe('P');
        expect(nextBoard[29]).toBeUndefined();
    });

    it('moves the rook appropriately for white short castling', () => {
        const board = createEmptyBoard();
        board[60] = 'K';
        board[63] = 'R';
        const move = createMove(board, 60, 62, 'short-castle');

        const nextBoard = computeNextChessBoardFromMove(board, move);

        expect(nextBoard[60]).toBeUndefined();
        expect(nextBoard[62]).toBe('K');
        expect(nextBoard[63]).toBeUndefined();
        expect(nextBoard[61]).toBe('R');
    });

    it('moves the rook appropriately for black long castling', () => {
        const board = createEmptyBoard();
        board[4] = 'k';
        board[0] = 'r';
        const move = createMove(board, 4, 2, 'long-castle');

        const nextBoard = computeNextChessBoardFromMove(board, move);

        expect(nextBoard[4]).toBeUndefined();
        expect(nextBoard[2]).toBe('k');
        expect(nextBoard[0]).toBeUndefined();
        expect(nextBoard[3]).toBe('r');
    });

    it('moves the rook appropriately for black short castling', () => {
        const board = createEmptyBoard();
        board[4] = 'k';
        board[7] = 'r';
        const move = createMove(board, 4, 6, 'short-castle');

        const nextBoard = computeNextChessBoardFromMove(board, move);

        expect(nextBoard[4]).toBeUndefined();
        expect(nextBoard[6]).toBe('k');
        expect(nextBoard[7]).toBeUndefined();
        expect(nextBoard[5]).toBe('r');
    });

    it('moves the rook appropriately for white long castling', () => {
        const board = createEmptyBoard();
        board[60] = 'K';
        board[56] = 'R';
        const move = createMove(board, 60, 58, 'long-castle');

        const nextBoard = computeNextChessBoardFromMove(board, move);

        expect(nextBoard[60]).toBeUndefined();
        expect(nextBoard[58]).toBe('K');
        expect(nextBoard[56]).toBeUndefined();
        expect(nextBoard[59]).toBe('R');
    });

    it('applies promotion when a pawn promotes on the destination square', () => {
        const board = createEmptyBoard();
        board[8] = 'P';
        const move: Move = { ...createMove(board, 8, 0, 'standard'), promotion: 'Q' };

        const nextBoard = computeNextChessBoardFromMove(board, move);

        expect(nextBoard[8]).toBeUndefined();
        expect(nextBoard[0]).toBe('Q');
    });
});

describe('computeAllLegalMoves', () => {
    it('aggregates moves for the active player and builds lookup maps', () => {
        const board = createEmptyBoard();
        board[60] = 'K';
        board[4] = 'k';
        board[createBoardIndex(6, 2)] = 'N';
        board[createBoardIndex(2, 4)] = 'N';
        board[48] = 'P';
        board[40] = 'n';

        const boardState: ChessBoardState = {
            board,
            playerTurn: 'white',
            castleRightsByColor: {
                white: { short: false, long: false },
                black: { short: false, long: false },
            },
            enPassantTargetIndex: null,
            halfmoveClock: 0,
            fullmoveClock: 1,
        };

        const legalMovesStore = computeAllLegalMoves(boardState);

        expect(Object.keys(legalMovesStore.byStartIndex)).toEqual(expect.arrayContaining(['20', '50', '60']));
        expect(legalMovesStore.byStartIndex['48']).toBeUndefined();
        expect(legalMovesStore.typeAndEndIndexToStartIndex['knight:35']).toEqual(expect.arrayContaining([20, 50]));
        expect(legalMovesStore.allMoves.length).toBeGreaterThan(legalMovesStore.byStartIndex['60'].length);
    });
});
