import invariant from 'tiny-invariant';

import { indexToRowCol, isRowColInBounds, rowColToIndex, getKingIndices, NUM_ROWS, type ChessBoardType } from './board';
import { getColorFromAlias, getEnemyColor, getPiece } from './pieces';
import type { Piece, PieceColor, PieceShortAlias, PieceType, PawnPromotion } from './pieces';

type RowColDeltas = Array<[number, number]>;
export type CastleRights = {
    canShortCastle: boolean;
    canLongCastle: boolean;
};
export type CastleRightsByColor = Record<PieceColor, CastleRights>;

export type MoveType = 'standard' | 'capture' | 'short-castle' | 'long-castle' | 'en-passant';
export type Move = {
    startIndex: number;
    endIndex: number;
    type: MoveType;
    piece: Piece;
    capturedPiece?: Piece;
    captureIndex?: number;
    // If this move results in a pawn promotion, the chosen piece short alias
    // will be populated once the user selects it (e.g., 'Q' or 'q').
    promotion?: PawnPromotion;
};

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
const WHITE_PAWN_STARTING_ROW = 6;
const BLACK_PAWN_STARTING_ROW = 1;

const WHITE_KING_SHORT_CASTLE_INDEX = 62;
const WHITE_KING_LONG_CASTLE_INDEX = 58;
const WHITE_SHORT_ROOK_START_INDEX = 63;
const WHITE_SHORT_ROOK_END_INDEX = 61;
const WHITE_LONG_ROOK_START_INDEX = 56;
const WHITE_LONG_ROOK_END_INDEX = 59;
const WHITE_SHORT_CASTLE_INDICES = [61, 62];
const WHITE_LONG_CASTLE_EMPTY_INDICES = [57, 58, 59];
const WHITE_LONG_CASTLE_SAFE_INDICES = [58, 59];

const BLACK_KING_SHORT_CASTLE_INDEX = 6;
const BLACK_KING_LONG_CASTLE_INDEX = 2;
const BLACK_SHORT_ROOK_START_INDEX = 7;
const BLACK_SHORT_ROOK_END_INDEX = 5;
const BLACK_LONG_ROOK_START_INDEX = 0;
const BLACK_LONG_ROOK_END_INDEX = 3;
const BLACK_SHORT_CASTLE_INDICES = [5, 6];
const BLACK_LONG_CASTLE_EMPTY_INDICES = [1, 2, 3];
const BLACK_LONG_CASTLE_SAFE_INDICES = [2, 3];

const ROOK_START_INDEX_TO_CASTLE_RIGHT: Record<number, keyof CastleRights> = {
    [WHITE_SHORT_ROOK_START_INDEX]: 'canShortCastle',
    [WHITE_LONG_ROOK_START_INDEX]: 'canLongCastle',
    [BLACK_SHORT_ROOK_START_INDEX]: 'canShortCastle',
    [BLACK_LONG_ROOK_START_INDEX]: 'canLongCastle',
};

const ATTACKERS: Record<string, Set<PieceType>> = {
    pawn: new Set(['pawn']),
    knight: new Set(['knight']),
    king: new Set(['king']),
    longDiagonals: new Set(['bishop', 'queen']),
    longStraights: new Set(['rook', 'queen']),
};

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
            capturedPiece: getPiece(board[captureIndex] as PieceShortAlias),
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
                  capturedPiece: getPiece(board[endIndex] as PieceShortAlias),
              }
            : {}),
        ...enPassantData,
    };
}

export function isSquareAttacked(board: ChessBoardType, squareIndex: number, byColor: PieceColor): boolean {
    const { row, col } = indexToRowCol(squareIndex);

    const pieceIsAttacker = (alias: PieceShortAlias, attackers: Set<PieceType>) =>
        getColorFromAlias(alias) === byColor && attackers.has(getPiece(alias).type);

    const checkDeltas = (deltas: RowColDeltas, attackers: Set<PieceType>, isRay: boolean = false): boolean => {
        for (const [rowDelta, colDelta] of deltas) {
            let rowCol = { row: row + rowDelta, col: col + colDelta };
            if (isRay) {
                while (isRowColInBounds(rowCol)) {
                    const pieceAlias = board[rowColToIndex(rowCol)];
                    if (pieceAlias !== undefined) {
                        if (pieceIsAttacker(pieceAlias, attackers)) return true;
                        break; // blocked by first piece hit
                    }
                    rowCol = { row: rowCol.row + rowDelta, col: rowCol.col + colDelta };
                }
            } else {
                if (!isRowColInBounds(rowCol)) continue;
                const pieceAlias = board[rowColToIndex(rowCol)];
                if (pieceAlias !== undefined && pieceIsAttacker(pieceAlias, attackers)) return true;
            }
        }

        return false;
    };

    // direction FROM which a pawn of this color would attack the target square
    // (i.e., the direction backwards from the target)
    const pawnRowDelta = byColor === 'white' ? 1 : -1;
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

export function isKingInCheck(board: ChessBoardType, color: PieceColor) {
    const kingIndex = getKingIndices(board)[color];
    const enemyColor = getEnemyColor(color);
    return isSquareAttacked(board, kingIndex, enemyColor);
}

function computeCastlingLegality(
    color: PieceColor,
    board: ChessBoardType,
    castleRightsByColor: CastleRightsByColor
): CastleRights {
    const rights = castleRightsByColor[color];

    // return early if no rights to castle (king has moved or both rooks are captured/moved)
    if (!rights.canShortCastle && !rights.canLongCastle) return rights;

    const isWhite = color === 'white';
    const enemyColor = getEnemyColor(color);

    let result: CastleRights = {
        canShortCastle: false,
        canLongCastle: false,
    };

    if (isKingInCheck(board, color)) return result;

    const areIndicesAllEmpty = (indices: number[]) => indices.every((index) => board[index] === undefined);
    const areIndicesAllSafe = (indices: number[]) =>
        indices.every((index) => !isSquareAttacked(board, index, enemyColor));

    const rookAlias: PieceShortAlias = isWhite ? 'R' : 'r';

    const checkLegality = (indicesToBeEmpty: number[], indicesToBeSafe: number[], rookStartIndex: number): boolean => {
        return (
            areIndicesAllEmpty(indicesToBeEmpty) &&
            areIndicesAllSafe(indicesToBeSafe) &&
            board[rookStartIndex] === rookAlias
        );
    };

    let shortCastlingIsLegal = false;
    if (rights.canShortCastle) {
        const shortCastleIndices = isWhite ? WHITE_SHORT_CASTLE_INDICES : BLACK_SHORT_CASTLE_INDICES;
        const shortRookStartIndex = isWhite ? WHITE_SHORT_ROOK_START_INDEX : BLACK_SHORT_ROOK_START_INDEX;
        shortCastlingIsLegal = checkLegality(shortCastleIndices, shortCastleIndices, shortRookStartIndex);
    }

    let longCastlingIsLegal = false;
    if (rights.canLongCastle) {
        const longCastleEmptyIndices = isWhite ? WHITE_LONG_CASTLE_EMPTY_INDICES : BLACK_LONG_CASTLE_EMPTY_INDICES;
        const longCastleSafeIndices = isWhite ? WHITE_LONG_CASTLE_SAFE_INDICES : BLACK_LONG_CASTLE_SAFE_INDICES;
        const longRookStartIndex = isWhite ? WHITE_LONG_ROOK_START_INDEX : BLACK_LONG_ROOK_START_INDEX;
        longCastlingIsLegal = checkLegality(longCastleEmptyIndices, longCastleSafeIndices, longRookStartIndex);
    }

    return {
        canShortCastle: shortCastlingIsLegal,
        canLongCastle: longCastlingIsLegal,
    };
}

type CastleRightsByColorChanges = Partial<Record<PieceColor, Partial<CastleRights>>>;
export function computeCastleRightsChangesFromMove(move: Move): CastleRightsByColorChanges {
    const { startIndex, piece, type, capturedPiece, captureIndex } = move;
    const { type: pieceType, color } = piece;

    let changes: CastleRightsByColorChanges = {};

    // Moving king removes both rights for that color
    if (pieceType === 'king') {
        changes[color] = { canShortCastle: false, canLongCastle: false };
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

export function computeNextChessBoardFromMove(board: ChessBoardType, move: Move): ChessBoardType {
    const { startIndex, endIndex, type, captureIndex, piece } = move;
    const nextBoard = [...board];
    const { shortAlias, color } = piece;
    const isWhite = color === 'white';

    // castles. privilege & legality is assumed
    const rookAlias: PieceShortAlias = isWhite ? 'R' : 'r';
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
    nextBoard[endIndex] = shortAlias;
    return nextBoard;
}

function isKingInCheckAfterMove(board: ChessBoardType, move: Move) {
    const nextBoard = computeNextChessBoardFromMove(board, move);
    return isKingInCheck(nextBoard, move.piece.color);
}

function computeEnPassantTarget(board: ChessBoardType, previousMoveIndices: number[]): number | null {
    if (previousMoveIndices.length !== 2) return null;

    const [startIndex, endIndex] = previousMoveIndices;
    const pieceAlias = board[endIndex];
    if (pieceAlias === undefined) return null;

    const { type, color } = getPiece(pieceAlias);
    if (type !== 'pawn') return null;

    const { row: endRow, col } = indexToRowCol(endIndex);
    const { row: startRow } = indexToRowCol(startIndex);
    if (Math.abs(endRow - startRow) === 2) return rowColToIndex({ row: endRow + (color === 'white' ? 1 : -1), col });
    return null;
}

export function computePossibleMovesForIndex(
    startIndex: number,
    board: ChessBoardType,
    castleRightsByColor: CastleRightsByColor,
    previousMoveIndices: number[]
): Move[] {
    const pieceAlias = board[startIndex];
    if (!pieceAlias) return [];

    const { type: pieceType, color } = getPiece(pieceAlias);
    const { row, col } = indexToRowCol(startIndex);
    const isWhite = color === 'white';

    let possibleMoves: Move[] = [];
    if (pieceType === 'pawn') {
        const hasMoved = isWhite ? row !== WHITE_PAWN_STARTING_ROW : row !== BLACK_PAWN_STARTING_ROW;
        const nextRow = isWhite ? row - 1 : row + 1;
        const potentialRows = [nextRow];
        if (!hasMoved) {
            potentialRows.push(isWhite ? row - 2 : row + 2);
        }
        // Forward moves (no captures)
        for (const currRow of potentialRows) {
            if (currRow < 0 || currRow >= NUM_ROWS) continue;
            const index = rowColToIndex({ row: currRow, col });
            if (board[index] !== undefined) break;
            possibleMoves.push(createMove(board, startIndex, index, 'standard'));
        }

        // Diagonal captures
        if (nextRow >= 0 && nextRow < NUM_ROWS) {
            const enPassantTarget = computeEnPassantTarget(board, previousMoveIndices);
            for (const colDelta of [-1, 1]) {
                const captureCol = col + colDelta;
                const rowCol = { row: nextRow, col: captureCol };
                if (!isRowColInBounds(rowCol)) continue;
                const endIndex = rowColToIndex(rowCol);
                const pieceAliasAtIndex = board[endIndex];
                const isEnemyPiece = Boolean(pieceAliasAtIndex && getColorFromAlias(pieceAliasAtIndex) !== color);
                const isEnPassant = endIndex === enPassantTarget;
                if (isEnemyPiece || isEnPassant) {
                    possibleMoves.push(createMove(board, startIndex, endIndex, isEnPassant ? 'en-passant' : 'capture'));
                }
            }
        }
    } else if (['bishop', 'rook', 'queen'].includes(pieceType)) {
        let deltas: RowColDeltas = [];
        if (['bishop', 'queen'].includes(pieceType)) {
            deltas = [...deltas, ...DIAGONAL_DELTAS];
        }
        if (['rook', 'queen'].includes(pieceType)) {
            deltas = [...deltas, ...STRAIGHT_DELTAS];
        }

        for (const [rowDelta, colDelta] of deltas) {
            let rowCol = { row: row + rowDelta, col: col + colDelta };
            while (isRowColInBounds(rowCol)) {
                const endIndex = rowColToIndex(rowCol);
                const pieceAliasAtIndex = board[endIndex];
                if (pieceAliasAtIndex !== undefined) {
                    const isEnemyPiece = getColorFromAlias(pieceAliasAtIndex) !== color;
                    if (isEnemyPiece) possibleMoves.push(createMove(board, startIndex, endIndex, 'capture'));
                    break;
                }
                possibleMoves.push(createMove(board, startIndex, endIndex, 'standard'));
                rowCol = { row: rowCol.row + rowDelta, col: rowCol.col + colDelta };
            }
        }
    } else if (pieceType === 'king' || pieceType === 'knight') {
        let deltas: RowColDeltas = KNIGHT_DELTAS;
        if (pieceType === 'king') {
            deltas = [...DIAGONAL_DELTAS, ...STRAIGHT_DELTAS];
            const { canShortCastle, canLongCastle } = computeCastlingLegality(color, board, castleRightsByColor);
            if (canShortCastle) {
                const endIndex = isWhite ? WHITE_KING_SHORT_CASTLE_INDEX : BLACK_KING_SHORT_CASTLE_INDEX;
                possibleMoves.push(createMove(board, startIndex, endIndex, 'short-castle'));
            }
            if (canLongCastle) {
                const endIndex = isWhite ? WHITE_KING_LONG_CASTLE_INDEX : BLACK_KING_LONG_CASTLE_INDEX;
                possibleMoves.push(createMove(board, startIndex, endIndex, 'long-castle'));
            }
        }
        for (const [rowDelta, colDelta] of deltas) {
            const rowCol = { row: row + rowDelta, col: col + colDelta };
            if (!isRowColInBounds(rowCol)) continue;
            const endIndex = rowColToIndex(rowCol);
            const pieceAliasAtIndex = board[endIndex];
            const isEmpty = pieceAliasAtIndex === undefined;
            const isEnemyPiece = Boolean(pieceAliasAtIndex && getColorFromAlias(pieceAliasAtIndex) !== color);
            if (isEmpty || isEnemyPiece) {
                possibleMoves.push(createMove(board, startIndex, endIndex, isEnemyPiece ? 'capture' : 'standard'));
            }
        }
    }

    possibleMoves = possibleMoves.filter((move) => !isKingInCheckAfterMove(board, move));

    return possibleMoves;
}
