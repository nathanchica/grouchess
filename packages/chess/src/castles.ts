import invariant from 'tiny-invariant';

import {
    BLACK_LONG_CASTLE_EMPTY_INDICES,
    BLACK_LONG_CASTLE_SAFE_INDICES,
    BLACK_LONG_ROOK_START_INDEX,
    BLACK_SHORT_CASTLE_INDICES,
    BLACK_SHORT_ROOK_START_INDEX,
    ROOK_START_INDEX_TO_CASTLE_RIGHT,
    WHITE_LONG_CASTLE_EMPTY_INDICES,
    WHITE_LONG_CASTLE_SAFE_INDICES,
    WHITE_LONG_ROOK_START_INDEX,
    WHITE_SHORT_CASTLE_INDICES,
    WHITE_SHORT_ROOK_START_INDEX,
} from './constants.js';
import { isKingInCheck, isSquareAttacked } from './moves.js';
import { getEnemyColor } from './pieces.js';
import type {
    CastleLegality,
    CastleRights,
    CastleRightsByColor,
    ChessBoardType,
    Move,
    PieceAlias,
    PieceColor,
} from './schema.js';

/**
 * Creates the initial castling rights for a new chess game.
 */
export function createInitialCastleRights(): CastleRightsByColor {
    return {
        white: { short: true, long: true },
        black: { short: true, long: true },
    };
}

/**
 * Computes the legality of castling for the given color in the current position.
 * Checks for castling rights, empty squares, safety of squares, rook presence, and king not in check.
 * Assumes that the king is on its starting square.
 */
export function computeCastlingLegality(
    color: PieceColor,
    board: ChessBoardType,
    castleRights: CastleRights
): CastleLegality {
    let result: CastleLegality = {
        short: false,
        long: false,
    };
    const { short: canShortCastle, long: canLongCastle } = castleRights;

    // return early if no rights to castle (king has moved or both rooks are captured/moved)
    if (!canShortCastle && !canLongCastle) return result;
    // return early if king is in check
    if (isKingInCheck(board, color)) return result;

    const isWhite = color === 'white';
    const enemyColor = getEnemyColor(color);
    const rookAlias: PieceAlias = isWhite ? 'R' : 'r';

    const areIndicesAllEmpty = (indices: number[]) => indices.every((index) => board[index] == null);
    const areIndicesAllSafe = (indices: number[]) =>
        indices.every((index) => !isSquareAttacked(board, index, enemyColor));
    const checkLegality = (indicesToBeEmpty: number[], indicesToBeSafe: number[], rookStartIndex: number): boolean => {
        return (
            areIndicesAllEmpty(indicesToBeEmpty) &&
            areIndicesAllSafe(indicesToBeSafe) &&
            board[rookStartIndex] === rookAlias
        );
    };

    if (canShortCastle) {
        const shortCastleIndices = isWhite ? WHITE_SHORT_CASTLE_INDICES : BLACK_SHORT_CASTLE_INDICES;
        const shortRookStartIndex = isWhite ? WHITE_SHORT_ROOK_START_INDEX : BLACK_SHORT_ROOK_START_INDEX;
        result.short = checkLegality(shortCastleIndices, shortCastleIndices, shortRookStartIndex);
    }

    if (canLongCastle) {
        const longCastleEmptyIndices = isWhite ? WHITE_LONG_CASTLE_EMPTY_INDICES : BLACK_LONG_CASTLE_EMPTY_INDICES;
        const longCastleSafeIndices = isWhite ? WHITE_LONG_CASTLE_SAFE_INDICES : BLACK_LONG_CASTLE_SAFE_INDICES;
        const longRookStartIndex = isWhite ? WHITE_LONG_ROOK_START_INDEX : BLACK_LONG_ROOK_START_INDEX;
        result.long = checkLegality(longCastleEmptyIndices, longCastleSafeIndices, longRookStartIndex);
    }

    return result;
}

type CastleRightsByColorChanges = Partial<Record<PieceColor, Partial<CastleRights>>>;

/**
 * Computes the changes to castling rights resulting from the given move.
 * Covers:
 * - Moving the king revokes both castling rights for that color.
 * - Moving a rook from its starting square revokes the corresponding castling right.
 * - Capturing an opponent's rook on its starting square revokes that side's corresponding castling right.
 * - Does not revoke rights for rook moves from non-starting squares (e.g. promoted rooks)
 * - Shouldn't be able to castle with promoted rook either since that requires the original rook to be captured/moved.
 */
export function computeCastleRightsChangesFromMove(move: Move): CastleRightsByColorChanges {
    const { startIndex, piece, type, capturedPiece, captureIndex } = move;
    const { type: pieceType, color } = piece;

    let changes: CastleRightsByColorChanges = {};

    // Moving king removes both rights for that color
    if (pieceType === 'king') {
        changes[color] = { short: false, long: false };
    }

    // Moving rook from its starting square removes the corresponding right
    let castleRight = ROOK_START_INDEX_TO_CASTLE_RIGHT[startIndex];
    if (pieceType === 'rook' && castleRight) {
        changes[color] = { ...(changes[color] ?? {}), [castleRight]: false };
    }

    // Capturing a rook on its starting square removes that side's right
    if (type === 'capture' && capturedPiece && capturedPiece.type === 'rook') {
        invariant(captureIndex !== undefined, 'Missing captureIndex for rook capture');
        castleRight = ROOK_START_INDEX_TO_CASTLE_RIGHT[captureIndex];
        const { color: affectedColor } = capturedPiece;
        if (castleRight) {
            changes[affectedColor] = { ...(changes[affectedColor] ?? {}), [castleRight]: false };
        }
    }

    return changes;
}
