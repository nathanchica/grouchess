import { InvalidInputError } from '@grouchess/errors';
import type {
    BoardIndex,
    CastleRights,
    ChessBoardType,
    Move,
    MoveType,
    PieceAlias,
    PieceColor,
    SlidingPieceType,
} from '@grouchess/models';
import invariant from 'tiny-invariant';

import { indexToRowCol, isPromotionSquare, isRowInBounds, rowColToIndex } from '../board.js';
import { computeCastlingLegality } from '../castles.js';
import {
    BLACK_KING_LONG_CASTLE_INDEX,
    BLACK_KING_SHORT_CASTLE_INDEX,
    BLACK_PAWN_STARTING_ROW,
    CASTLE_TYPE_MOVES,
    WHITE_PAWN_STARTING_ROW,
    WHITE_KING_LONG_CASTLE_INDEX,
    WHITE_KING_SHORT_CASTLE_INDEX,
} from '../constants.js';
import { computeNextChessBoardFromMove, isKingInCheck } from '../moves.js';
import { getColorFromAlias, getPiece } from '../pieces.js';
import { getTargetsAtIndex } from '../precompute.js';

/**
 * Creates a Move object representing a move from startIndex to endIndex of the given type.
 */
export function createMove(board: ChessBoardType, startIndex: number, endIndex: number, type: MoveType): Move {
    const pieceAlias = board[startIndex];
    invariant(pieceAlias, 'Called createMove with no piece in startIndex');
    const piece = getPiece(pieceAlias);
    const { color } = piece;

    let captureProps: Pick<Move, 'captureIndex' | 'capturedPiece'> = {
        captureIndex: undefined,
        capturedPiece: undefined,
    };
    if (type === 'en-passant') {
        const { row, col } = indexToRowCol(endIndex);
        const captureIndex = rowColToIndex({ row: color === 'white' ? row + 1 : row - 1, col });
        captureProps = {
            captureIndex,
            capturedPiece: getPiece(board[captureIndex] as PieceAlias),
        };
    } else if (type === 'capture') {
        captureProps = {
            captureIndex: endIndex,
            capturedPiece: getPiece(board[endIndex] as PieceAlias),
        };
    }

    return {
        startIndex,
        endIndex,
        type,
        piece,
        ...captureProps,
    };
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
    pieceType: SlidingPieceType
): Move[] {
    const legalMoves: Move[] = [];
    const directionToTargetIndices = getTargetsAtIndex(startIndex, pieceType);

    Object.values(directionToTargetIndices).forEach((targetIndices) => {
        for (const targetIndex of targetIndices) {
            const pieceAliasAtIndex = board[targetIndex];
            if (pieceAliasAtIndex != null) {
                const isEnemyPiece = getColorFromAlias(pieceAliasAtIndex) !== color;
                if (isEnemyPiece) legalMoves.push(createMove(board, startIndex, targetIndex, 'capture'));
                break; // stop on first blocker in this direction
            }
            legalMoves.push(createMove(board, startIndex, targetIndex, 'standard'));
        }
    });

    return legalMoves;
}

/**
 * Computes all legal moves for king or knight from the given start index.
 */
export function computeLegalMovesForIndexForKingOrKnight(
    startIndex: number,
    board: ChessBoardType,
    pieceType: 'king' | 'knight',
    color: PieceColor
): Move[] {
    const legalMoves: Move[] = [];
    for (const endIndex of getTargetsAtIndex(startIndex, pieceType)) {
        const alias = board[endIndex];
        if (alias == null) {
            legalMoves.push(createMove(board, startIndex, endIndex, 'standard'));
        } else if (getColorFromAlias(alias) !== color) {
            legalMoves.push(createMove(board, startIndex, endIndex, 'capture'));
        }
    }
    return legalMoves;
}

/**
 * Determines if the king of the given color would be in check after the specified move is made.
 */
export function isKingInCheckAfterMove(board: ChessBoardType, move: Move): boolean {
    const nextBoard = computeNextChessBoardFromMove(board, move);
    return isKingInCheck(nextBoard, move.piece.color);
}

/**
 * Computes all legal moves for the piece at the given startIndex.
 */
export function computeLegalMovesForIndex(
    startIndex: number,
    board: ChessBoardType,
    castleRights: CastleRights,
    enPassantTargetIndex: number | null
): Move[] {
    const pieceAlias = board[startIndex];
    if (!pieceAlias) return [];

    const { type: pieceType, color } = getPiece(pieceAlias);

    let legalMoves: Move[] = [];
    if (pieceType === 'pawn') {
        legalMoves = computePawnLegalMoves(board, startIndex, color, enPassantTargetIndex);
    } else if (['bishop', 'rook', 'queen'].includes(pieceType)) {
        legalMoves = computeSlidingPieceLegalMoves(board, startIndex, color, pieceType as SlidingPieceType);
    } else if (pieceType === 'king') {
        const isWhite = color === 'white';
        const { short: canShortCastle, long: canLongCastle } = computeCastlingLegality(color, board, castleRights);
        if (canShortCastle) {
            const endIndex = isWhite ? WHITE_KING_SHORT_CASTLE_INDEX : BLACK_KING_SHORT_CASTLE_INDEX;
            legalMoves.push(createMove(board, startIndex, endIndex, 'short-castle'));
        }
        if (canLongCastle) {
            const endIndex = isWhite ? WHITE_KING_LONG_CASTLE_INDEX : BLACK_KING_LONG_CASTLE_INDEX;
            legalMoves.push(createMove(board, startIndex, endIndex, 'long-castle'));
        }

        const kingMoves = computeLegalMovesForIndexForKingOrKnight(startIndex, board, 'king', color);
        legalMoves = [...legalMoves, ...kingMoves];
    } else {
        invariant(pieceType === 'knight', 'Unexpected piece type');
        const knightMoves = computeLegalMovesForIndexForKingOrKnight(startIndex, board, 'knight', color);
        legalMoves = [...legalMoves, ...knightMoves];
    }

    // filter out moves that would leave own king in check. Castle moves are assumed to be legal already
    legalMoves = legalMoves.filter((move) => CASTLE_TYPE_MOVES.has(move.type) || !isKingInCheckAfterMove(board, move));

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
