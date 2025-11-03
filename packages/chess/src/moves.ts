import invariant from 'tiny-invariant';

import { getKingIndices, indexToRowCol, rowColToIndex } from './board.js';
import {
    BLACK_LONG_ROOK_END_INDEX,
    BLACK_LONG_ROOK_START_INDEX,
    BLACK_SHORT_ROOK_END_INDEX,
    BLACK_SHORT_ROOK_START_INDEX,
    WHITE_LONG_ROOK_END_INDEX,
    WHITE_LONG_ROOK_START_INDEX,
    WHITE_SHORT_ROOK_END_INDEX,
    WHITE_SHORT_ROOK_START_INDEX,
} from './constants.js';
import { getPiece, getColorFromAlias, getEnemyColor } from './pieces.js';
import { getTargetsAtIndex } from './precompute.js';
import type {
    ChessBoardState,
    ChessBoardType,
    LegalMovesStore,
    Move,
    PieceAlias,
    PieceColor,
    PieceType,
    SlidingPieceType,
} from './schema.js';
import { computeLegalMovesForIndex } from './utils/moves.js';

function isSquareAttackedByKingOrKnight(
    board: ChessBoardType,
    squareIndex: number,
    attackerColor: PieceColor
): boolean {
    return ['king', 'knight'].some((pieceType) => {
        for (const index of getTargetsAtIndex(squareIndex, pieceType as 'king' | 'knight')) {
            const alias = board[index];
            if (alias && getColorFromAlias(alias) === attackerColor && getPiece(alias).type === pieceType) {
                return true;
            }
        }
        return false;
    });
}

function isSquareAttackedBySlidingPiece(
    board: ChessBoardType,
    squareIndex: number,
    attackerColor: PieceColor
): boolean {
    const slidingPieceTypes: SlidingPieceType[] = ['bishop', 'rook', 'queen'];
    return slidingPieceTypes.some((pieceType) => {
        const directionToTargetIndices = getTargetsAtIndex(squareIndex, pieceType);
        const pieceIsAttacker = (alias: PieceAlias) =>
            getColorFromAlias(alias) === attackerColor && getPiece(alias).type === pieceType;

        return Object.values(directionToTargetIndices).some((targetIndices) => {
            for (const targetIndex of targetIndices) {
                const alias = board[targetIndex];
                if (alias) {
                    if (pieceIsAttacker(alias)) return true;
                    break; // blocked by first piece
                }
            }
            return false;
        });
    });
}

function isSquareAttackedByPawn(board: ChessBoardType, squareIndex: number, attackerColor: PieceColor): boolean {
    const { row, col } = indexToRowCol(squareIndex);
    const pawnRowDelta = attackerColor === 'white' ? 1 : -1;
    return [-1, 1].some((colDelta) => {
        const index = rowColToIndex({ row: row + pawnRowDelta, col: col + colDelta });
        if (index >= 0) {
            const alias = board[index];
            if (alias && getColorFromAlias(alias) === attackerColor && getPiece(alias).type === 'pawn') {
                return true;
            }
        }
        return false;
    });
}

/**
 * Determines if a square is attacked by any piece of the given color.
 */
export function isSquareAttacked(board: ChessBoardType, squareIndex: number, attackerColor: PieceColor): boolean {
    if (isSquareAttackedByPawn(board, squareIndex, attackerColor)) return true;
    if (isSquareAttackedByKingOrKnight(board, squareIndex, attackerColor)) return true;
    if (isSquareAttackedBySlidingPiece(board, squareIndex, attackerColor)) return true;

    return false;
}

/**
 * Determines if the king of the given color is in check.
 */
export function isKingInCheck(board: ChessBoardType, color: PieceColor): boolean {
    const kingIndex = getKingIndices(board)[color];
    const enemyColor = getEnemyColor(color);
    return isSquareAttacked(board, kingIndex, enemyColor);
}

/**
 * Computes the next chess board state after applying the given move. Assumes the move is legal.
 */
export function computeNextChessBoardFromMove(board: ChessBoardType, move: Move): ChessBoardType {
    const { startIndex, endIndex, type, captureIndex, piece, promotion } = move;
    const nextBoard = [...board];
    const { alias, color } = piece;
    const isWhite = color === 'white';

    // castles. privilege & legality is assumed
    const rookAlias: PieceAlias = isWhite ? 'R' : 'r';
    if (type === 'short-castle') {
        const rookStartIndex = isWhite ? WHITE_SHORT_ROOK_START_INDEX : BLACK_SHORT_ROOK_START_INDEX;
        nextBoard[rookStartIndex] = undefined;
        const rookEndIndex = isWhite ? WHITE_SHORT_ROOK_END_INDEX : BLACK_SHORT_ROOK_END_INDEX;
        nextBoard[rookEndIndex] = rookAlias;
    } else if (type === 'long-castle') {
        const rookStartIndex = isWhite ? WHITE_LONG_ROOK_START_INDEX : BLACK_LONG_ROOK_START_INDEX;
        nextBoard[rookStartIndex] = undefined;
        const rookEndIndex = isWhite ? WHITE_LONG_ROOK_END_INDEX : BLACK_LONG_ROOK_END_INDEX;
        nextBoard[rookEndIndex] = rookAlias;
    } else if (type === 'en-passant') {
        invariant(captureIndex, 'Missing captureIndex for en-passant');
        nextBoard[captureIndex] = undefined;
    }

    nextBoard[startIndex] = undefined;
    nextBoard[endIndex] = promotion ?? alias;
    return nextBoard;
}

/**
 * Computes all legal moves for a player given the current board state.
 * @param boardState The current state of the chess board.
 * @returns An object containing all legal moves and various lookup maps.
 */
export function computeAllLegalMoves({
    board,
    playerTurn,
    castleRightsByColor,
    enPassantTargetIndex,
}: ChessBoardState): LegalMovesStore {
    const allMoves: Move[] = [];
    const byStartIndex: Record<string, Move[]> = {};
    const typeAndEndIndexToStartIndex: Record<`${PieceType}:${number}`, number[]> = {};
    const castleRights = castleRightsByColor[playerTurn];

    board.forEach((pieceAlias, index) => {
        if (pieceAlias && getColorFromAlias(pieceAlias) === playerTurn) {
            const movesForIndex = computeLegalMovesForIndex(index, board, castleRights, enPassantTargetIndex);
            if (movesForIndex.length > 0) {
                allMoves.push(...movesForIndex);
                byStartIndex[index] = movesForIndex;
                movesForIndex.forEach((move) => {
                    const { endIndex, piece } = move;

                    const key = `${piece.type}:${endIndex}` as `${PieceType}:${number}`;
                    typeAndEndIndexToStartIndex[key] ??= [];
                    typeAndEndIndexToStartIndex[key].push(move.startIndex);
                });
            }
        }
    });

    return {
        allMoves,
        byStartIndex,
        typeAndEndIndexToStartIndex,
    };
}
