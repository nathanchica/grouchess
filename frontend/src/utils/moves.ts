import invariant from 'tiny-invariant';
import { indexToRowCol, isRowColInBounds, rowColToIndex, getKingIndices, NUM_ROWS, type ChessBoardType } from './board';
import { WHITE_KING_START_INDEX, BLACK_KING_START_INDEX, getColorFromAlias, getEnemyColor, getPiece } from './pieces';
import type { Piece, PieceColor, PieceShortAlias } from './pieces';

type RowColDeltas = Array<[number, number]>;
type CastlePrivilege = {
    canShortCastle: boolean;
    canLongCastle: boolean;
};
export type CastleMetadata = {
    whiteKingHasMoved: boolean;
    whiteShortRookHasMoved: boolean;
    whiteLongRookHasMoved: boolean;
    blackKingHasMoved: boolean;
    blackShortRookHasMoved: boolean;
    blackLongRookHasMoved: boolean;
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
const WHITE_LONG_CASTLE_INDICES = [57, 58, 59];

const BLACK_KING_SHORT_CASTLE_INDEX = 6;
const BLACK_KING_LONG_CASTLE_INDEX = 2;
const BLACK_SHORT_ROOK_START_INDEX = 7;
const BLACK_SHORT_ROOK_END_INDEX = 5;
const BLACK_LONG_ROOK_START_INDEX = 0;
const BLACK_LONG_ROOK_END_INDEX = 3;
const BLACK_SHORT_CASTLE_INDICES = [5, 6];
const BLACK_LONG_CASTLE_INDICES = [1, 2, 3];

export function isSquareAttacked(board: ChessBoardType, squareIndex: number, byColor: PieceColor): boolean {
    const { row, col } = indexToRowCol(squareIndex);

    const isEnemy = (alias: PieceShortAlias | undefined) =>
        Boolean(alias) && getColorFromAlias(alias as PieceShortAlias) === byColor;
    const aliasLower = (alias: PieceShortAlias | undefined) => (alias ? alias.toLowerCase() : undefined);
    const pieceIsAttacker = (alias: PieceShortAlias, attackers: PieceShortAlias[]) =>
        isEnemy(alias) && attackers.includes(aliasLower(alias) as PieceShortAlias);

    const checkDeltas = (deltas: RowColDeltas, attackers: PieceShortAlias[], isRay: boolean = false): boolean => {
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
    if (
        checkDeltas(
            [
                [pawnRowDelta, -1],
                [pawnRowDelta, 1],
            ],
            ['p']
        )
    )
        return true;
    if (checkDeltas(KNIGHT_DELTAS, ['n'])) return true;
    if (checkDeltas([...DIAGONAL_DELTAS, ...STRAIGHT_DELTAS], ['k'])) return true;
    if (checkDeltas(DIAGONAL_DELTAS, ['b', 'q'], true)) return true;
    if (checkDeltas(STRAIGHT_DELTAS, ['r', 'q'], true)) return true;

    return false;
}

export function computeCastleMetadataChangesFromMove(piece: Piece, prevIndex: number): Partial<CastleMetadata> {
    const { type, color } = piece;
    const isWhite = color === 'white';
    const isKing = type === 'king';
    const isRook = type === 'rook';
    const isWhiteShortRook = isWhite && isRook && prevIndex === WHITE_SHORT_ROOK_START_INDEX;
    const isWhiteLongRook = isWhite && isRook && prevIndex === WHITE_LONG_ROOK_START_INDEX;
    const isBlackShortRook = !isWhite && isRook && prevIndex === BLACK_SHORT_ROOK_START_INDEX;
    const isBlackLongRook = !isWhite && isRook && prevIndex === BLACK_LONG_ROOK_START_INDEX;

    return {
        ...(isKing && isWhite ? { whiteKingHasMoved: true } : {}),
        ...(isKing && !isWhite ? { blackKingHasMoved: true } : {}),
        ...(isWhiteShortRook ? { whiteShortRookHasMoved: true } : {}),
        ...(isWhiteLongRook ? { whiteLongRookHasMoved: true } : {}),
        ...(isBlackShortRook ? { blackShortRookHasMoved: true } : {}),
        ...(isBlackLongRook ? { blackLongRookHasMoved: true } : {}),
    };
}

function computeCastlingPrivilege(
    color: PieceColor,
    board: ChessBoardType,
    castleMetadata: CastleMetadata
): CastlePrivilege {
    const isWhite = color === 'white';
    const enemyColor = getEnemyColor(color);

    const {
        whiteKingHasMoved,
        whiteShortRookHasMoved,
        whiteLongRookHasMoved,
        blackKingHasMoved,
        blackShortRookHasMoved,
        blackLongRookHasMoved,
    } = castleMetadata;

    let result: CastlePrivilege = {
        canShortCastle: false,
        canLongCastle: false,
    };

    const { white: whiteKingIndex, black: blackKingIndex } = getKingIndices(board);
    const kingIndex = isWhite ? whiteKingIndex : blackKingIndex;
    const kingStartIndex = isWhite ? WHITE_KING_START_INDEX : BLACK_KING_START_INDEX;
    const kingHasMoved = isWhite ? whiteKingHasMoved : blackKingHasMoved;

    const kingNotInStartIndex = kingIndex !== kingStartIndex;
    const kingHasMovedOrNotInStartIndex = kingHasMoved || kingNotInStartIndex;
    if (kingHasMovedOrNotInStartIndex) return result;

    const kingIsInCheck = isSquareAttacked(board, kingIndex, enemyColor);
    if (kingIsInCheck) return result;

    const areIndicesAllEmptyAndNotAttacked = (indices: number[]) =>
        indices.every((index) => {
            const isEmpty = board[index] === undefined;
            const isAttacked = isSquareAttacked(board, index, enemyColor);
            return isEmpty && !isAttacked;
        });

    const shortCastleIndices = isWhite ? WHITE_SHORT_CASTLE_INDICES : BLACK_SHORT_CASTLE_INDICES;
    const longCastleIndices = isWhite ? WHITE_LONG_CASTLE_INDICES : BLACK_LONG_CASTLE_INDICES;

    const shortCastleIndicesAreValid = areIndicesAllEmptyAndNotAttacked(shortCastleIndices);
    const longCastleIndicesAreValid = areIndicesAllEmptyAndNotAttacked(longCastleIndices);

    const shortRookStartIndex = isWhite ? WHITE_SHORT_ROOK_START_INDEX : BLACK_SHORT_ROOK_START_INDEX;
    const longRookStartIndex = isWhite ? WHITE_LONG_ROOK_START_INDEX : BLACK_LONG_ROOK_START_INDEX;

    const rookAlias: PieceShortAlias = isWhite ? 'R' : 'r';
    const shortRookIsInStartIndex = board[shortRookStartIndex] === rookAlias;
    const longRookIsInStartIndex = board[longRookStartIndex] === rookAlias;

    const shortRookHasNotMoved = isWhite ? !whiteShortRookHasMoved : !blackShortRookHasMoved;
    const longRookHasNotMoved = isWhite ? !whiteLongRookHasMoved : !blackLongRookHasMoved;

    return {
        canShortCastle: shortRookHasNotMoved && shortRookIsInStartIndex && shortCastleIndicesAreValid,
        canLongCastle: longRookHasNotMoved && longRookIsInStartIndex && longCastleIndicesAreValid,
    };
}

export function computeNextChessBoardFromMove(prevIndex: number, nextIndex: number, board: ChessBoardType) {
    const pieceAlias = board[prevIndex];
    invariant(pieceAlias, 'Called computeNextChessBoardFromMove with prevIndex being empty.');

    const { shortAlias, type, color } = getPiece(pieceAlias);
    const isKing = type === 'king';
    const isWhite = color === 'white';

    const nextBoard = [...board];

    // castles. privilege & legality is assumed
    if (isKing) {
        // white short castle
        if (isWhite && prevIndex === WHITE_KING_START_INDEX && nextIndex === WHITE_KING_SHORT_CASTLE_INDEX) {
            nextBoard[WHITE_SHORT_ROOK_START_INDEX] = undefined;
            nextBoard[WHITE_SHORT_ROOK_END_INDEX] = 'R';
        }
        // black short castle
        else if (!isWhite && prevIndex === BLACK_KING_START_INDEX && nextIndex === BLACK_KING_SHORT_CASTLE_INDEX) {
            nextBoard[BLACK_SHORT_ROOK_START_INDEX] = undefined;
            nextBoard[BLACK_SHORT_ROOK_END_INDEX] = 'r';
        }
        // white long castle
        else if (isWhite && prevIndex === WHITE_KING_START_INDEX && nextIndex === WHITE_KING_LONG_CASTLE_INDEX) {
            nextBoard[WHITE_LONG_ROOK_START_INDEX] = undefined;
            nextBoard[WHITE_LONG_ROOK_END_INDEX] = 'R';
        }
        // black long castle
        else if (!isWhite && prevIndex === BLACK_KING_START_INDEX && nextIndex === BLACK_KING_LONG_CASTLE_INDEX) {
            nextBoard[BLACK_LONG_ROOK_START_INDEX] = undefined;
            nextBoard[BLACK_LONG_ROOK_END_INDEX] = 'r';
        }
    }

    nextBoard[prevIndex] = undefined;
    nextBoard[nextIndex] = shortAlias;
    return nextBoard;
}

export function isKingInCheckAfterMove(
    prevIndex: number,
    nextIndex: number,
    board: ChessBoardType,
    kingColor: PieceColor
) {
    const nextBoard = computeNextChessBoardFromMove(prevIndex, nextIndex, board);
    const kingIndex = getKingIndices(nextBoard)[kingColor];
    const enemyColor = getEnemyColor(kingColor);
    return isSquareAttacked(nextBoard, kingIndex, enemyColor);
}

export function computePossibleMovesForIndex(
    targetIndex: number,
    board: ChessBoardType,
    castleMetadata: CastleMetadata
): number[] {
    const pieceAlias = board[targetIndex];
    if (!pieceAlias) return [];

    const { type: pieceType, color } = getPiece(pieceAlias);
    const { row, col } = indexToRowCol(targetIndex);
    const isWhite = color === 'white';

    let possibleMoveIndices: number[] = [];
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
            possibleMoveIndices.push(index);
        }

        // Diagonal captures (ignore en passant for now)
        if (nextRow >= 0 && nextRow < NUM_ROWS) {
            for (const colDelta of [-1, 1]) {
                const captureCol = col + colDelta;
                const rowCol = { row: nextRow, col: captureCol };
                if (!isRowColInBounds(rowCol)) continue;
                const index = rowColToIndex(rowCol);
                const pieceAliasAtIndex = board[index];
                const isEnemyPiece = Boolean(pieceAliasAtIndex && getColorFromAlias(pieceAliasAtIndex) !== color);
                if (isEnemyPiece) {
                    possibleMoveIndices.push(index);
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
                const index = rowColToIndex(rowCol);
                const pieceAliasAtIndex = board[index];
                if (pieceAliasAtIndex !== undefined) {
                    const isEnemyPiece = getColorFromAlias(pieceAliasAtIndex) !== color;
                    if (isEnemyPiece) possibleMoveIndices.push(index);
                    break;
                }
                possibleMoveIndices.push(index);
                rowCol = { row: rowCol.row + rowDelta, col: rowCol.col + colDelta };
            }
        }
    } else if (pieceType === 'king' || pieceType === 'knight') {
        let deltas: RowColDeltas = KNIGHT_DELTAS;
        if (pieceType === 'king') {
            deltas = [...DIAGONAL_DELTAS, ...STRAIGHT_DELTAS];
            const { canShortCastle, canLongCastle } = computeCastlingPrivilege(color, board, castleMetadata);
            if (canShortCastle) {
                possibleMoveIndices.push(isWhite ? WHITE_KING_SHORT_CASTLE_INDEX : BLACK_KING_SHORT_CASTLE_INDEX);
            }
            if (canLongCastle) {
                possibleMoveIndices.push(isWhite ? WHITE_KING_LONG_CASTLE_INDEX : BLACK_KING_LONG_CASTLE_INDEX);
            }
        }
        for (const [rowDelta, colDelta] of deltas) {
            const rowCol = { row: row + rowDelta, col: col + colDelta };
            if (!isRowColInBounds(rowCol)) continue;
            const index = rowColToIndex(rowCol);
            const pieceAliasAtIndex = board[index];
            const isEmpty = pieceAliasAtIndex === undefined;
            const isEnemyPiece = Boolean(pieceAliasAtIndex && getColorFromAlias(pieceAliasAtIndex) !== color);
            if (isEmpty || isEnemyPiece) {
                possibleMoveIndices.push(index);
            }
        }
    }

    const startIndex = targetIndex;
    possibleMoveIndices = possibleMoveIndices.filter(
        (endIndex) => !isKingInCheckAfterMove(startIndex, endIndex, board, color)
    );

    return possibleMoveIndices;
}
