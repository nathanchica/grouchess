import invariant from 'tiny-invariant';

import { isValidPieceAlias } from './pieces.js';
import type { ChessBoardType, PieceAlias, PieceColor, RowCol } from './schema.js';
import { NUM_SQUARES, NUM_COLS, NUM_ROWS } from './schema.js';

// Standard initial FEN string for a new chess game
export const INITIAL_CHESS_BOARD_FEN_PLACEMENT = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
export const INITIAL_CHESS_BOARD_FEN = `${INITIAL_CHESS_BOARD_FEN_PLACEMENT} w KQkq - 0 1`;

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

/**
 * Checks if a given index is a pawn promotion square for the given color.
 */
export function isPromotionSquare(squareIndex: number, color: PieceColor): boolean {
    const { row } = indexToRowCol(squareIndex);
    return (color === 'white' && row === 0) || (color === 'black' && row === NUM_ROWS - 1);
}

/**
 * Computes en passant target square. Must only be used for pawn moves.
 * @param startIndex Starting index of pawn move
 * @param endIndex End index of pawn move
 * @returns square index over which a pawn has just passed while moving two squares (null if pawn didn't move 2 squares)
 */
export function computeEnPassantTargetIndex(startIndex: number, endIndex: number): number | null {
    const { row: endRow, col } = indexToRowCol(endIndex);
    const { row: startRow } = indexToRowCol(startIndex);
    if (Math.abs(endRow - startRow) === 2) return rowColToIndex({ row: (startRow + endRow) / 2, col });
    return null;
}

/**
 * Creates a ChessBoardType from the placement part of a FEN string
 */
export function createBoardFromFEN(placementString: string): ChessBoardType {
    invariant(typeof placementString === 'string' && placementString.trim().length > 0, 'Placement must be non-empty');
    const ranks = placementString.trim().split('/');
    invariant(ranks.length === NUM_ROWS, 'Invalid FEN: expected 8 ranks');

    const board: ChessBoardType = Array(NUM_SQUARES).fill(undefined);
    for (let row = 0; row < NUM_ROWS; row++) {
        const rank = ranks[row];
        let col = 0;
        for (let index = 0; index < rank.length; index++) {
            const char = rank[index];
            const digit = char.charCodeAt(0) - 48; // '0' => 0
            if (digit >= 1 && digit <= NUM_COLS) {
                col += digit;
                invariant(col <= NUM_COLS, 'Invalid FEN: too many squares in a rank');
            } else if (isValidPieceAlias(char)) {
                invariant(col < NUM_COLS, 'Invalid FEN: too many squares in a rank');
                const boardIndex = rowColToIndex({ row, col });
                board[boardIndex] = char as PieceAlias;
                col += 1;
            } else {
                invariant(false, `Invalid FEN: unexpected character '${char}'`);
            }
        }
        invariant(col === NUM_COLS, 'Invalid FEN: incomplete rank');
    }

    return board;
}

/**
 * Creates a chess board in the initial starting position
 */
export function createInitialBoard(): ChessBoardType {
    return createBoardFromFEN(INITIAL_CHESS_BOARD_FEN_PLACEMENT);
}

/**
 * Converts algebraic square notation (e.g., "e3") to a board index.
 * Returns -1 for "-" which is used in FEN to denote no en passant target.
 */
export function algebraicNotationToIndex(algebraicNotation: string): number {
    const formattedNotation = algebraicNotation.trim();
    if (formattedNotation === '-') return -1;
    invariant(/^[a-h][1-8]$/.test(formattedNotation), `Invalid square notation: ${algebraicNotation}`);
    const fileCharCode = formattedNotation.charCodeAt(0); // 'a'..'h'
    const rank = Number(formattedNotation[1]); // '1'..'8'
    const col = fileCharCode - 'a'.charCodeAt(0);
    const row = NUM_ROWS - rank;
    return rowColToIndex({ row, col });
}
