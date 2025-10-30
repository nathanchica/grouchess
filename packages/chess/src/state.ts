import { IllegalMoveError, InvalidInputError } from '@grouchess/errors';
import invariant from 'tiny-invariant';

import {
    algebraicNotationToIndex,
    computeEnPassantTargetIndex,
    createBoardFromFEN,
    createInitialBoard,
    isPromotionSquare,
} from './board.js';
import { computeCastleRightsChangesFromMove, createInitialCastleRights } from './castles.js';
import { computeForcedDrawStatus, createRepetitionKeyFromBoardState } from './draws.js';
import { computeAllLegalMoves, computeNextChessBoardFromMove, isKingInCheck } from './moves.js';
import { createAlgebraicNotation, isValidFEN } from './notations.js';
import { getColorFromAlias } from './pieces.js';
import {
    CastleRightsByColor,
    ChessBoardState,
    ChessBoardType,
    ChessGame,
    ChessGameState,
    LegalMovesStore,
    Move,
    MoveRecord,
    PieceCapture,
    PieceColor,
} from './schema.js';

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

export function computeNextChessGameAfterMove(prevChessGame: ChessGame, move: Move): ChessGame {
    const { legalMovesStore, boardState, positionCounts, moveHistory, captures } = prevChessGame;
    const { startIndex, endIndex } = move;
    const legalMove = legalMovesStore.byStartIndex[startIndex].find(
        ({ endIndex: legalEndIndex }) => legalEndIndex === endIndex
    );
    if (!legalMove) {
        throw new IllegalMoveError();
    }

    const { board, playerTurn, castleRightsByColor, halfmoveClock, fullmoveClock } = boardState;
    const {
        piece: { type: pieceType, color },
        type: moveType,
    } = legalMove;
    const { promotion } = move;

    let pieceCapture: PieceCapture | null = null;
    if (moveType === 'capture' || moveType === 'en-passant') {
        invariant(legalMove.capturedPiece, `Legal move type:${moveType} expected to have a capturedPiece`);
        pieceCapture = { piece: legalMove.capturedPiece, moveIndex: moveHistory.length };
    }

    const isPawnMove = pieceType === 'pawn';

    // Validate promotion info if applicable
    if (isPawnMove && isPromotionSquare(endIndex, color)) {
        if (!promotion) {
            throw new InvalidInputError('Promotion piece not specified');
        }
        if (getColorFromAlias(promotion) !== color) {
            throw new InvalidInputError('Promotion piece color does not match pawn color');
        }
    }

    const legalMoveWithPromotion: Move = { ...legalMove, promotion };

    const rightsDiff = computeCastleRightsChangesFromMove(legalMoveWithPromotion);
    const nextCastleRights: CastleRightsByColor = {
        white: { ...castleRightsByColor.white, ...(rightsDiff.white ?? {}) },
        black: { ...castleRightsByColor.black, ...(rightsDiff.black ?? {}) },
    };

    const nextBoardState: ChessBoardState = {
        board: computeNextChessBoardFromMove(board, legalMoveWithPromotion),
        playerTurn: playerTurn === 'white' ? 'black' : 'white',
        castleRightsByColor: nextCastleRights,
        enPassantTargetIndex: isPawnMove ? computeEnPassantTargetIndex(startIndex, endIndex) : null,
        halfmoveClock: pieceType === 'pawn' || moveType === 'capture' ? 0 : halfmoveClock + 1,
        fullmoveClock: playerTurn === 'black' ? fullmoveClock + 1 : fullmoveClock,
    };
    const nextLegalMovesStore: LegalMovesStore = computeAllLegalMoves(nextBoardState);
    const positionKey = createRepetitionKeyFromBoardState(nextBoardState);
    const nextPositionCounts =
        nextBoardState.halfmoveClock === 0
            ? { [positionKey]: 1 }
            : { ...positionCounts, [positionKey]: (positionCounts[positionKey] ?? 0) + 1 };
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

export function createChessGameFromFEN(fenString: string): ChessGame {
    if (!isValidFEN(fenString)) {
        throw new InvalidInputError('Invalid FEN string');
    }

    const parts = fenString.trim().split(/\s+/);
    const [placementPart, activeColorPart, castlingPart, enPassantPart, halfmovePart, fullmovePart] = parts;

    const boardState: ChessBoardState = {
        board: createBoardFromFEN(placementPart),
        playerTurn: activeColorPart === 'w' ? 'white' : 'black',
        castleRightsByColor:
            castlingPart === '-'
                ? {
                      white: { short: false, long: false },
                      black: { short: false, long: false },
                  }
                : {
                      white: {
                          short: castlingPart.includes('K'),
                          long: castlingPart.includes('Q'),
                      },
                      black: {
                          short: castlingPart.includes('k'),
                          long: castlingPart.includes('q'),
                      },
                  },
        enPassantTargetIndex: enPassantPart === '-' ? null : algebraicNotationToIndex(enPassantPart),
        halfmoveClock: parseInt(halfmovePart, 10),
        fullmoveClock: parseInt(fullmovePart, 10),
    };
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
