import invariant from 'tiny-invariant';

import { getKingIndices, indexToRowCol, isRowColInBounds, isRowInBounds, rowColToIndex } from './board.js';
import { computeCastlingLegality } from './castles.js';
import {
    BLACK_KING_LONG_CASTLE_INDEX,
    BLACK_KING_SHORT_CASTLE_INDEX,
    BLACK_LONG_ROOK_END_INDEX,
    BLACK_LONG_ROOK_START_INDEX,
    BLACK_SHORT_ROOK_END_INDEX,
    BLACK_SHORT_ROOK_START_INDEX,
    BLACK_PAWN_STARTING_ROW,
    WHITE_KING_LONG_CASTLE_INDEX,
    WHITE_KING_SHORT_CASTLE_INDEX,
    WHITE_LONG_ROOK_END_INDEX,
    WHITE_LONG_ROOK_START_INDEX,
    WHITE_SHORT_ROOK_END_INDEX,
    WHITE_SHORT_ROOK_START_INDEX,
    WHITE_PAWN_STARTING_ROW,
} from './constants.js';
import { getPiece, getColorFromAlias, getEnemyColor } from './pieces.js';
import type {
    BoardIndex,
    CastleRights,
    ChessBoardState,
    ChessBoardType,
    LegalMovesStore,
    Move,
    MoveType,
    PieceAlias,
    PieceColor,
    PieceType,
} from './schema.js';

type RowColDeltas = Array<[number, number]>;

const DIAGONAL_DELTAS: RowColDeltas = [
    [1, 1], // down-right
    [1, -1], // down-left
    [-1, -1], // up-left
    [-1, 1], // up-right
];
const STRAIGHT_DELTAS: RowColDeltas = [
    [0, 1], // right
    [0, -1], // left
    [1, 0], // down
    [-1, 0], // up
];
const KNIGHT_DELTAS: RowColDeltas = [
    [2, 1], // down2 right1
    [1, 2], // down1 right2
    [-1, 2], // up1 right2
    [-2, 1], // up2 right1
    [-2, -1], // up2 left1
    [-1, -2], // up1 left2
    [1, -2], // down1 left2
    [2, -1], // down2 left1
];

const ATTACKERS: Record<string, Set<PieceType>> = {
    pawn: new Set(['pawn']),
    knight: new Set(['knight']),
    king: new Set(['king']),
    longDiagonals: new Set(['bishop', 'queen']),
    longStraights: new Set(['rook', 'queen']),
};

const CASTLE_TYPE_MOVES = new Set<MoveType>(['short-castle', 'long-castle']);

/**
 * Creates a Move object representing a move from startIndex to endIndex of the given type.
 */
export function createMove(board: ChessBoardType, startIndex: number, endIndex: number, type: MoveType): Move {
    const pieceAlias = board[startIndex];
    invariant(pieceAlias, 'Called createMove with no piece in startIndex');
    const piece = getPiece(pieceAlias);
    const { color } = piece;

    let enPassantData: Partial<Move> = {};
    if (type === 'en-passant') {
        const { row, col } = indexToRowCol(endIndex);
        const captureIndex = rowColToIndex({ row: color === 'white' ? row + 1 : row - 1, col });
        enPassantData = {
            captureIndex,
            capturedPiece: getPiece(board[captureIndex] as PieceAlias),
        };
    }

    return {
        startIndex,
        endIndex,
        type,
        piece,
        ...(type === 'capture'
            ? {
                  captureIndex: endIndex,
                  capturedPiece: getPiece(board[endIndex] as PieceAlias),
              }
            : {}),
        ...enPassantData,
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

function isKingInCheckAfterMove(board: ChessBoardType, move: Move): boolean {
    const nextBoard = computeNextChessBoardFromMove(board, move);
    return isKingInCheck(nextBoard, move.piece.color);
}

function computePawnLegalMoves(
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
    if (!hasMoved) {
        potentialRows.push(isWhite ? row - 2 : row + 2);
    }

    const legalMoves: Move[] = [];
    // Forward moves (no captures)
    for (const currRow of potentialRows) {
        if (!isRowInBounds(currRow)) continue;
        const index = rowColToIndex({ row: currRow, col });
        if (board[index] != null) break;
        legalMoves.push(createMove(board, startIndex, index, 'standard'));
    }

    // Diagonal captures
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

function computeSlidingPieceLegalMoves(
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

function computeLegalMovesFromRowColDeltas(
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
    } else if (pieceType === 'knight') {
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
