import { IllegalMoveError } from '@grouchess/errors';
import {
    ChessBoardState,
    ChessBoardType,
    ChessGame,
    ChessGameState,
    LegalMovesStore,
    Move,
    MoveRecord,
    PieceCapture,
    PieceColor,
} from '@grouchess/models';

import { createInitialBoard } from './board.js';
import { createInitialCastleRights } from './castles.js';
import { computeForcedDrawStatus, createRepetitionKeyFromBoardState } from './draws.js';
import { computeAllLegalMoves, isKingInCheck } from './moves.js';
import { createAlgebraicNotation } from './notations.js';
import { createBoardStateFromFEN } from './utils/fen.js';
import { validatePromotion } from './utils/moves.js';
import { getNextBoardStateAfterMove, getNextPositionCounts, getPieceCaptureFromMove } from './utils/state.js';

/**
 * Creates the initial board state for a new chess game
 */
export function createInitialBoardState(): ChessBoardState {
    return {
        board: createInitialBoard(),
        playerTurn: 'white',
        castleRightsByColor: createInitialCastleRights(),
        enPassantTargetIndex: null,
        halfmoveClock: 0,
        fullmoveClock: 1,
    };
}

/**
 * Creates the initial chess game state
 */
export function createInitialChessGame(): ChessGame {
    const boardState: ChessBoardState = createInitialBoardState();
    const positionKey = createRepetitionKeyFromBoardState(boardState);
    return {
        boardState,
        gameState: { status: 'in-progress' },
        legalMovesStore: computeAllLegalMoves(boardState),
        moveHistory: [],
        captures: [],
        positionCounts: { [positionKey]: 1 },
    };
}

/**
 * Computes the current game status based on the board state and legal moves
 */
export function computeGameStatus(
    board: ChessBoardType,
    playerTurn: PieceColor,
    halfmoveClock: ChessBoardState['halfmoveClock'],
    legalMovesStore: LegalMovesStore,
    positionCounts: ChessGame['positionCounts']
): ChessGameState {
    const isInCheck = isKingInCheck(board, playerTurn);
    const hasNoLegalMoves = legalMovesStore.allMoves.length === 0;
    if (isInCheck && hasNoLegalMoves) {
        return {
            status: 'checkmate',
            winner: playerTurn === 'white' ? 'black' : 'white',
            check: playerTurn,
        };
    }

    const forcedDrawStatus = computeForcedDrawStatus(board, hasNoLegalMoves, halfmoveClock, positionCounts);
    if (forcedDrawStatus) {
        return { status: forcedDrawStatus };
    } else if (isInCheck) {
        return {
            status: 'in-progress',
            check: playerTurn,
        };
    }

    return { status: 'in-progress' };
}

/**
 * Computes the next chess game state after a move has been made
 */
export function computeNextChessGameAfterMove(prevChessGame: ChessGame, move: Move): ChessGame {
    const { legalMovesStore, boardState, positionCounts, moveHistory, captures } = prevChessGame;
    const { startIndex, endIndex } = move;
    const legalMove = legalMovesStore.byStartIndex[startIndex].find(
        ({ endIndex: legalEndIndex }) => legalEndIndex === endIndex
    );
    if (!legalMove) {
        throw new IllegalMoveError();
    }

    const { promotion } = move;
    const legalMoveWithPromotion: Move = { ...legalMove, promotion };

    validatePromotion(legalMoveWithPromotion);

    const pieceCapture: PieceCapture | null = getPieceCaptureFromMove(legalMove, moveHistory.length);
    const nextBoardState: ChessBoardState = getNextBoardStateAfterMove(boardState, legalMoveWithPromotion);
    const nextLegalMovesStore: LegalMovesStore = computeAllLegalMoves(nextBoardState);
    const nextPositionCounts = getNextPositionCounts(positionCounts, nextBoardState);
    const nextGameState = computeGameStatus(
        nextBoardState.board,
        nextBoardState.playerTurn,
        nextBoardState.halfmoveClock,
        nextLegalMovesStore,
        nextPositionCounts
    );

    /**
     * Create move notation for the move just made using:
     * - post-move game state (effect of the move on the board, check/checkmate, etc.)
     * - pre-move legal moves store (for disambiguation of the move)
     */
    const moveRecord: MoveRecord = {
        move,
        notation: {
            san: createAlgebraicNotation(move, nextGameState, legalMovesStore),
            figurine: createAlgebraicNotation(move, nextGameState, legalMovesStore, true),
        },
    };

    return {
        boardState: nextBoardState,
        gameState: nextGameState,
        legalMovesStore: nextLegalMovesStore,
        moveHistory: [...moveHistory, moveRecord],
        captures: pieceCapture ? [...captures, pieceCapture] : captures,
        positionCounts: nextPositionCounts,
    };
}

/**
 * Creates a chess game from a FEN string
 */
export function createChessGameFromFEN(fenString: string): ChessGame {
    const boardState: ChessBoardState = createBoardStateFromFEN(fenString);
    const positionKey = createRepetitionKeyFromBoardState(boardState);

    return {
        boardState,
        captures: [],
        moveHistory: [],
        gameState: { status: 'in-progress' },
        legalMovesStore: computeAllLegalMoves(boardState),
        positionCounts: { [positionKey]: 1 },
    };
}
