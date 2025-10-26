import type { CastleRights, Move, PieceColor } from '@grouchess/chess';
import invariant from 'tiny-invariant';

const WHITE_SHORT_ROOK_START_INDEX = 63;
const WHITE_LONG_ROOK_START_INDEX = 56;

const BLACK_SHORT_ROOK_START_INDEX = 7;
const BLACK_LONG_ROOK_START_INDEX = 0;

const ROOK_START_INDEX_TO_CASTLE_RIGHT: Record<number, keyof CastleRights> = {
    [WHITE_SHORT_ROOK_START_INDEX]: 'short',
    [WHITE_LONG_ROOK_START_INDEX]: 'long',
    [BLACK_SHORT_ROOK_START_INDEX]: 'short',
    [BLACK_LONG_ROOK_START_INDEX]: 'long',
};

type CastleRightsByColorChanges = Partial<Record<PieceColor, Partial<CastleRights>>>;
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
