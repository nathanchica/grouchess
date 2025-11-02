import { InvalidInputError } from '@grouchess/errors';
import invariant from 'tiny-invariant';

import { computeEnPassantTargetIndex, isPromotionSquare } from '../board.js';
import { computeCastleRightsChangesFromMove } from '../castles.js';
import { createRepetitionKeyFromBoardState } from '../draws.js';
import { computeNextChessBoardFromMove } from '../moves.js';
import { getColorFromAlias } from '../pieces.js';
import type { CastleRightsByColor, ChessBoardState, ChessGame, Move, PieceCapture } from '../schema.js';

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
