import invariant from 'tiny-invariant';

import { getKingIndices, indexToRowCol, isRowColInBounds, rowColToIndex } from './board.js';
import { computeCastlingLegality } from './castles.js';
import {
    ATTACKERS,
    BLACK_KING_LONG_CASTLE_INDEX,
    BLACK_KING_SHORT_CASTLE_INDEX,
    BLACK_LONG_ROOK_END_INDEX,
    BLACK_LONG_ROOK_START_INDEX,
    BLACK_SHORT_ROOK_END_INDEX,
    BLACK_SHORT_ROOK_START_INDEX,
    CASTLE_TYPE_MOVES,
    DIAGONAL_DELTAS,
    KNIGHT_DELTAS,
    STRAIGHT_DELTAS,
    WHITE_KING_LONG_CASTLE_INDEX,
    WHITE_KING_SHORT_CASTLE_INDEX,
    WHITE_LONG_ROOK_END_INDEX,
    WHITE_LONG_ROOK_START_INDEX,
    WHITE_SHORT_ROOK_END_INDEX,
    WHITE_SHORT_ROOK_START_INDEX,
} from './constants.js';
import { getPiece, getColorFromAlias, getEnemyColor } from './pieces.js';
import type {
    CastleRights,
    ChessBoardState,
    ChessBoardType,
    LegalMovesStore,
    Move,
    MoveType,
    PieceAlias,
    PieceColor,
    PieceType,
    RowColDeltas,
} from './schema.js';
import {
    computeLegalMovesFromRowColDeltas,
    computePawnLegalMoves,
    computeSlidingPieceLegalMoves,
    isKingInCheckAfterMove,
} from './utils/moves.js';

/**
 * Creates a Move object representing a move from startIndex to endIndex of the given type.
 */
export function createMove(board: ChessBoardType, startIndex: number, endIndex: number, type: MoveType): Move {
    const pieceAlias = board[startIndex];
    invariant(pieceAlias, 'Called createMove with no piece in startIndex');
    const piece = getPiece(pieceAlias);
    const { color } = piece;

    let captureProps: Pick<Move, 'captureIndex' | 'capturedPiece'> = {};
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
 * Determines if a square is attacked by any piece of the given color.
 */
export function isSquareAttacked(board: ChessBoardType, squareIndex: number, attackerColor: PieceColor): boolean {
    const { row, col } = indexToRowCol(squareIndex);

    const pieceIsAttacker = (alias: PieceAlias, attackers: Set<PieceType>) =>
        getColorFromAlias(alias) === attackerColor && attackers.has(getPiece(alias).type);

    const checkDeltas = (deltas: RowColDeltas, attackers: Set<PieceType>, isRay: boolean = false): boolean => {
        for (const [rowDelta, colDelta] of deltas) {
            let rowCol = { row: row + rowDelta, col: col + colDelta };
            if (isRay) {
                while (isRowColInBounds(rowCol)) {
                    const pieceAlias = board[rowColToIndex(rowCol)];
                    if (pieceAlias != null) {
                        if (pieceIsAttacker(pieceAlias, attackers)) return true;
                        break; // blocked by first piece hit
                    }
                    rowCol = { row: rowCol.row + rowDelta, col: rowCol.col + colDelta };
                }
            } else {
                const pieceAlias = board[rowColToIndex(rowCol)];
                if (pieceAlias != null && pieceIsAttacker(pieceAlias, attackers)) return true;
            }
        }

        return false;
    };

    // direction FROM which a pawn of this color would attack the target square
    // (i.e., the direction backwards from the target)
    const pawnRowDelta = attackerColor === 'white' ? 1 : -1;
    const pawnDeltas: RowColDeltas = [
        [pawnRowDelta, -1],
        [pawnRowDelta, 1],
    ];

    if (checkDeltas(pawnDeltas, ATTACKERS.pawn)) return true;
    if (checkDeltas(KNIGHT_DELTAS, ATTACKERS.knight)) return true;
    if (checkDeltas([...DIAGONAL_DELTAS, ...STRAIGHT_DELTAS], ATTACKERS.king)) return true;
    if (checkDeltas(DIAGONAL_DELTAS, ATTACKERS.longDiagonals, true)) return true;
    if (checkDeltas(STRAIGHT_DELTAS, ATTACKERS.longStraights, true)) return true;

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
        legalMoves = computeSlidingPieceLegalMoves(board, startIndex, color, pieceType);
    } else if (pieceType === 'king') {
        const deltas = [...DIAGONAL_DELTAS, ...STRAIGHT_DELTAS];
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
        legalMoves = [...legalMoves, ...computeLegalMovesFromRowColDeltas(board, startIndex, color, deltas)];
    } else {
        // if not knight, something's wrong
        invariant(pieceType === 'knight', 'Unexpected piece type');
        legalMoves = computeLegalMovesFromRowColDeltas(board, startIndex, color, KNIGHT_DELTAS);
    }

    // filter out moves that would leave own king in check. Castle moves are assumed to be legal already
    legalMoves = legalMoves.filter((move) => CASTLE_TYPE_MOVES.has(move.type) || !isKingInCheckAfterMove(board, move));

    return legalMoves;
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
