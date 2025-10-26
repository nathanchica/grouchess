import invariant from 'tiny-invariant';

import { aliasToPieceData } from './pieces.js';
import type { ChessBoardType, PieceColor, RowCol } from './schema.js';
import { NUM_SQUARES, NUM_COLS, NUM_ROWS } from './schema.js';

/**
 * r | n | b | q | k | b | n | r  (0 - 7)
 * ------------------------------
 * p | p | p | p | p | p | p | p  (8 - 15)
 * ------------------------------
 *   |   |   |   |   |   |   |    (16 - 23)
 * ------------------------------
 *   |   |   |   |   |   |   |    (24 - 31)
 * ------------------------------
 *   |   |   |   |   |   |   |    (32 - 39)
 * ------------------------------
 *   |   |   |   |   |   |   |    (40 - 47)
 * ------------------------------
 * P | P | P | P | P | P | P | P  (48 - 55)
 * ------------------------------
 * R | N | B | Q | K | B | N | R  (56 - 63)
 */
export function createInitialChessBoard(): ChessBoardType {
    const board: ChessBoardType = Array(NUM_SQUARES).fill(undefined);
    Object.values(aliasToPieceData).forEach(({ alias, startingIndices }) => {
        startingIndices.forEach((index) => {
            board[index] = alias;
        });
    });
    return board;
}

/**
 * Converts a board index (0-63) to a RowCol.
 */
export function indexToRowCol(index: number): RowCol {
    return {
        row: Math.floor(index / 8),
        col: index % 8,
    };
}

/**
 * Checks if a row number is within the bounds of the chess board.
 */
export function isRowInBounds(row: number): boolean {
    return row >= 0 && row < NUM_ROWS;
}

/**
 * Checks if a column number is within the bounds of the chess board.
 */
export function isColInBounds(col: number): boolean {
    return col >= 0 && col < NUM_COLS;
}

/**
 * Checks if a RowCol is within the bounds of the chess board.
 */
export function isRowColInBounds({ row, col }: RowCol): boolean {
    return isRowInBounds(row) && isColInBounds(col);
}

/**
 * Converts a RowCol to a board index. Returns -1 if out of bounds.
 */
export function rowColToIndex({ row, col }: RowCol): number {
    if (!isRowColInBounds({ row, col })) return -1;
    return row * 8 + col;
}

/**
 * Finds the indices of both kings on the board.
 */
export function getKingIndices(board: ChessBoardType): Record<PieceColor, number> {
    let white: number = -1;
    let black: number = -1;
    let index = 0;
    while ((white === -1 || black === -1) && index < NUM_SQUARES) {
        const pieceAlias = board[index];
        if (pieceAlias === 'K') white = index;
        if (pieceAlias === 'k') black = index;
        index++;
    }
    invariant(white > -1, 'White king not found');
    invariant(black > -1, 'Black king not found');
    return {
        white,
        black,
    };
}
