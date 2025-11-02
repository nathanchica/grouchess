import { InvalidInputError } from '@grouchess/errors';
import invariant from 'tiny-invariant';

import {
    computeEnPassantTargetIndex,
    indexToRowCol,
    isPromotionSquare,
    isRowColInBounds,
    isRowInBounds,
    rowColToIndex,
} from '../board.js';
import { computeCastleRightsChangesFromMove } from '../castles.js';
import { BLACK_PAWN_STARTING_ROW, DIAGONAL_DELTAS, STRAIGHT_DELTAS, WHITE_PAWN_STARTING_ROW } from '../constants.js';
import { createRepetitionKeyFromBoardState } from '../draws.js';
import { createMove, computeNextChessBoardFromMove, isKingInCheck } from '../moves.js';
import { getColorFromAlias } from '../pieces.js';
import type {
    BoardIndex,
    CastleRightsByColor,
    ChessBoardState,
    ChessBoardType,
    ChessGame,
    Move,
    PieceCapture,
    PieceColor,
    PieceType,
    RowColDeltas,
} from '../schema.js';

/**
 * Determines if the king of the given color would be in check after the specified move is made.
 */
export function isKingInCheckAfterMove(board: ChessBoardType, move: Move): boolean {
    const nextBoard = computeNextChessBoardFromMove(board, move);
    return isKingInCheck(nextBoard, move.piece.color);
}

/**
 * Computes all legal pawn moves from the given start index, considering standard moves, captures, and en passant.
 */
export function computePawnLegalMoves(
    board: ChessBoardType,
    startIndex: BoardIndex,
    color: PieceColor,
    enPassantTargetIndex: BoardIndex | null
): Move[] {
    const { row, col } = indexToRowCol(startIndex);
    const isWhite = color === 'white';
    const hasMoved = isWhite ? row !== WHITE_PAWN_STARTING_ROW : row !== BLACK_PAWN_STARTING_ROW;
    const nextRow = isWhite ? row - 1 : row + 1;
    const potentialRows = [nextRow];

    // Add double-step move if pawn hasn't moved yet
    if (!hasMoved) {
        potentialRows.push(isWhite ? row - 2 : row + 2);
    }

    // Generate standard forward moves
    const legalMoves: Move[] = [];
    for (const currRow of potentialRows) {
        if (!isRowInBounds(currRow)) continue;
        const index = rowColToIndex({ row: currRow, col });
        if (board[index] != null) break;
        legalMoves.push(createMove(board, startIndex, index, 'standard'));
    }

    // Generate captures and en passant
    if (isRowInBounds(nextRow)) {
        for (const colDelta of [-1, 1]) {
            const rowCol = { row: nextRow, col: col + colDelta };
            const endIndex = rowColToIndex(rowCol);
            if (endIndex < 0) continue;
            const pieceAliasAtIndex = board[endIndex];
            const isEnemyPiece = Boolean(pieceAliasAtIndex && getColorFromAlias(pieceAliasAtIndex) !== color);
            const isEnPassant = endIndex === enPassantTargetIndex;
            if (isEnemyPiece || isEnPassant) {
                legalMoves.push(createMove(board, startIndex, endIndex, isEnPassant ? 'en-passant' : 'capture'));
            }
        }
    }

    return legalMoves;
}

/**
 * Computes all legal moves for sliding pieces (bishop, rook, queen) from the given start index.
 */
export function computeSlidingPieceLegalMoves(
    board: ChessBoardType,
    startIndex: BoardIndex,
    color: PieceColor,
    pieceType: PieceType
): Move[] {
    const { row, col } = indexToRowCol(startIndex);
    let deltas: RowColDeltas = [];
    if (['bishop', 'queen'].includes(pieceType)) {
        deltas = [...deltas, ...DIAGONAL_DELTAS];
    }
    if (['rook', 'queen'].includes(pieceType)) {
        deltas = [...deltas, ...STRAIGHT_DELTAS];
    }

    const legalMoves: Move[] = [];
    for (const [rowDelta, colDelta] of deltas) {
        let rowCol = { row: row + rowDelta, col: col + colDelta };
        while (isRowColInBounds(rowCol)) {
            const endIndex = rowColToIndex(rowCol);
            const pieceAliasAtIndex = board[endIndex];

            // Stop if we encounter a piece
            if (pieceAliasAtIndex != null) {
                const isEnemyPiece = getColorFromAlias(pieceAliasAtIndex) !== color;
                if (isEnemyPiece) legalMoves.push(createMove(board, startIndex, endIndex, 'capture'));
                break;
            }

            legalMoves.push(createMove(board, startIndex, endIndex, 'standard'));
            rowCol = { row: rowCol.row + rowDelta, col: rowCol.col + colDelta };
        }
    }

    return legalMoves;
}

/**
 * Computes all legal moves for a piece from the given start index based on provided row/column deltas.
 * Used for non-sliding pieces like king and knight.
 */
export function computeLegalMovesFromRowColDeltas(
    board: ChessBoardType,
    startIndex: BoardIndex,
    color: PieceColor,
    deltas: RowColDeltas
): Move[] {
    const { row, col } = indexToRowCol(startIndex);
    const legalMoves: Move[] = [];
    for (const [rowDelta, colDelta] of deltas) {
        const rowCol = { row: row + rowDelta, col: col + colDelta };
        const endIndex = rowColToIndex(rowCol);
        if (endIndex < 0) continue;
        const pieceAliasAtIndex = board[endIndex];
        const isEmpty = pieceAliasAtIndex == null;
        const isEnemyPiece = Boolean(pieceAliasAtIndex && getColorFromAlias(pieceAliasAtIndex) !== color);
        if (isEmpty || isEnemyPiece) {
            legalMoves.push(createMove(board, startIndex, endIndex, isEnemyPiece ? 'capture' : 'standard'));
        }
    }

    return legalMoves;
}

/**
 * Validates the promotion details of a move if it is a pawn promotion move.
 */
export function validatePromotion(move: Move): void {
    const { piece, endIndex, promotion } = move;
    const { type, color } = piece;

    if (type === 'pawn' && isPromotionSquare(endIndex, color)) {
        if (!promotion) {
            throw new InvalidInputError('Promotion piece not specified');
        }
        if (getColorFromAlias(promotion) !== color) {
            throw new InvalidInputError('Promotion piece color does not match pawn color');
        }
    }
}

/**
 * Extracts the captured piece information from a move, if applicable.
 */
export function getPieceCaptureFromMove(move: Move, moveIndex: number): PieceCapture | null {
    const { type: moveType, capturedPiece } = move;
    if (moveType === 'capture' || moveType === 'en-passant') {
        invariant(capturedPiece, `Legal move type:${moveType} expected to have a capturedPiece`);
        return { piece: capturedPiece, moveIndex };
    }
    return null;
}

/**
 * Calculates the next position counts after a move has been made
 * This is used to track repetitions for threefold draw detection
 */
export function getNextPositionCounts(
    prevPositionCounts: ChessGame['positionCounts'],
    nextBoardState: ChessBoardState
): ChessGame['positionCounts'] {
    const positionKey = createRepetitionKeyFromBoardState(nextBoardState);
    return nextBoardState.halfmoveClock === 0
        ? { [positionKey]: 1 }
        : { ...prevPositionCounts, [positionKey]: (prevPositionCounts[positionKey] ?? 0) + 1 };
}

/**
 * Calculates the next castle rights after a move has been made
 */
export function getNextCastleRightsAfterMove(prevCastleRights: CastleRightsByColor, move: Move): CastleRightsByColor {
    const rightsDiff = computeCastleRightsChangesFromMove(move);
    return {
        white: { ...prevCastleRights.white, ...(rightsDiff.white ?? {}) },
        black: { ...prevCastleRights.black, ...(rightsDiff.black ?? {}) },
    };
}

/**
 * Calculates the next board state after a move has been made
 */
export function getNextBoardStateAfterMove(prevBoardState: ChessBoardState, move: Move): ChessBoardState {
    const { board, playerTurn, castleRightsByColor, halfmoveClock, fullmoveClock } = prevBoardState;
    const {
        startIndex,
        endIndex,
        piece: { type: pieceType },
        type: moveType,
    } = move;

    const nextCastleRights = getNextCastleRightsAfterMove(castleRightsByColor, move);

    const isPawnMove = pieceType === 'pawn';
    return {
        board: computeNextChessBoardFromMove(board, move),
        playerTurn: playerTurn === 'white' ? 'black' : 'white',
        castleRightsByColor: nextCastleRights,
        enPassantTargetIndex: isPawnMove ? computeEnPassantTargetIndex(startIndex, endIndex) : null,
        halfmoveClock: isPawnMove || moveType === 'capture' ? 0 : halfmoveClock + 1,
        fullmoveClock: playerTurn === 'black' ? fullmoveClock + 1 : fullmoveClock,
    };
}
