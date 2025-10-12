import { indexToRowCol, rowColToIndex, NUM_ROWS, NUM_COLS } from './board';
import { WHITE_KING_START_INDEX, BLACK_KING_START_INDEX } from './pieces';
import type { Piece, PieceColor, ChessBoardType, PieceShortAlias } from './pieces';

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

    const whiteKingIsNotInStartIndex = board[WHITE_KING_START_INDEX] !== 'K';
    const blackKingIsNotInStartIndex = board[BLACK_KING_START_INDEX] !== 'k';

    const whiteKingHasMovedOrNotInStartIndex = whiteKingHasMoved || whiteKingIsNotInStartIndex;
    const blackKingHasMovedOrNotInStartIndex = blackKingHasMoved || blackKingIsNotInStartIndex;

    if ((isWhite && whiteKingHasMovedOrNotInStartIndex) || (!isWhite && blackKingHasMovedOrNotInStartIndex))
        return result;

    const areIndicesAllEmpty = (indices: number[]) => indices.every((index) => board[index] === undefined);

    const shortCastleIndices = isWhite ? WHITE_SHORT_CASTLE_INDICES : BLACK_SHORT_CASTLE_INDICES;
    const longCastleIndices = isWhite ? WHITE_LONG_CASTLE_INDICES : BLACK_LONG_CASTLE_INDICES;

    const shortCastleIndicesAreEmpty = areIndicesAllEmpty(shortCastleIndices);
    const longCastleIndicesAreEmpty = areIndicesAllEmpty(longCastleIndices);

    const shortRookStartIndex = isWhite ? WHITE_SHORT_ROOK_START_INDEX : BLACK_SHORT_ROOK_START_INDEX;
    const longRookStartIndex = isWhite ? WHITE_LONG_ROOK_START_INDEX : BLACK_LONG_ROOK_START_INDEX;

    const rookAlias: PieceShortAlias = isWhite ? 'R' : 'r';
    const shortRookIsInStartIndex = board[shortRookStartIndex] === rookAlias;
    const longRookIsInStartIndex = board[longRookStartIndex] === rookAlias;

    const shortRookHasNotMoved = isWhite ? !whiteShortRookHasMoved : !blackShortRookHasMoved;
    const longRookHasNotMoved = isWhite ? !whiteLongRookHasMoved : !blackLongRookHasMoved;

    // TODO: check if opponent has pieces that can move into castle indices

    return {
        canShortCastle: shortRookHasNotMoved && shortRookIsInStartIndex && shortCastleIndicesAreEmpty,
        canLongCastle: longRookHasNotMoved && longRookIsInStartIndex && longCastleIndicesAreEmpty,
    };
}

export function computePossibleMovesForPiece(
    piece: Piece,
    currIndex: number,
    board: ChessBoardType,
    castleMetadata: CastleMetadata
): number[] {
    const { row, col } = indexToRowCol(currIndex);
    const { type: pieceType, color } = piece;
    const isWhite = color === 'white';

    let possibleMoveIndices: number[] = [];
    if (pieceType === 'pawn') {
        const hasMoved = isWhite ? row !== WHITE_PAWN_STARTING_ROW : row !== BLACK_PAWN_STARTING_ROW;
        const potentialRows = isWhite ? [row - 1] : [row + 1];
        if (!hasMoved) {
            potentialRows.push(isWhite ? row - 2 : row + 2);
        }
        for (const currRow of potentialRows) {
            if (currRow < 0 || currRow >= NUM_ROWS) continue;
            const index = rowColToIndex({ row: currRow, col });
            if (board[index] !== undefined) break;
            possibleMoveIndices.push(index);
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
            let nextRow = row + rowDelta;
            let nextCol = col + colDelta;
            while (nextRow >= 0 && nextRow < NUM_ROWS && nextCol >= 0 && nextCol < NUM_COLS) {
                const index = rowColToIndex({ row: nextRow, col: nextCol });
                if (index < 0) break;
                if (board[index] !== undefined) break;
                possibleMoveIndices.push(index);
                nextRow += rowDelta;
                nextCol += colDelta;
            }
        }
    } else if (pieceType === 'king') {
        const deltas: RowColDeltas = [...DIAGONAL_DELTAS, ...STRAIGHT_DELTAS];
        const { canShortCastle, canLongCastle } = computeCastlingPrivilege(color, board, castleMetadata);

        if (canShortCastle) {
            possibleMoveIndices.push(isWhite ? WHITE_KING_SHORT_CASTLE_INDEX : BLACK_KING_SHORT_CASTLE_INDEX);
        }
        if (canLongCastle) {
            possibleMoveIndices.push(isWhite ? WHITE_KING_LONG_CASTLE_INDEX : BLACK_KING_LONG_CASTLE_INDEX);
        }
        for (const [rowDelta, colDelta] of deltas) {
            const nextRow = row + rowDelta;
            const nextCol = col + colDelta;
            if (nextRow < 0 || nextRow >= NUM_ROWS || nextCol < 0 || nextCol >= NUM_COLS) continue;
            const index = rowColToIndex({ row: nextRow, col: nextCol });
            if (index < 0) continue;
            if (board[index] === undefined) {
                possibleMoveIndices.push(index);
            }
        }
    } else if (pieceType === 'knight') {
        for (const [rowDelta, colDelta] of KNIGHT_DELTAS) {
            const nextRow = row + rowDelta;
            const nextCol = col + colDelta;
            if (nextRow < 0 || nextRow >= NUM_ROWS || nextCol < 0 || nextCol >= NUM_COLS) continue;
            const index = rowColToIndex({ row: nextRow, col: nextCol });
            if (index < 0) continue;
            if (board[index] === undefined) {
                possibleMoveIndices.push(index);
            }
        }
    }

    return possibleMoveIndices;
}

export function computeNextChessBoardFromMove(
    piece: Piece,
    prevIndex: number,
    nextIndex: number,
    board: ChessBoardType
) {
    const { shortAlias, type, color } = piece;
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
