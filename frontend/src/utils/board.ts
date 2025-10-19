import invariant from 'tiny-invariant';

import { isValidAlgebraicNotation } from './notations';
import { isValidPieceShortAlias, type PieceShortAlias, type PieceColor } from './pieces';

export type ChessBoardType = Array<PieceShortAlias | undefined>;

export type GlowingSquareProps = {
    isPreviousMove?: boolean;
    isCheck?: boolean;
    isSelected?: boolean;
    isDraggingOver?: boolean; // mouse/pointer is currently over this square while dragging
    canCapture?: boolean;
    canMove?: boolean;
};
export type RowCol = { row: number; col: number };

export const NUM_SQUARES = 64;
export const NUM_ROWS = 8;
export const NUM_COLS = 8;

export function indexToRowCol(index: number): RowCol {
    return {
        row: Math.floor(index / 8),
        col: index % 8,
    };
}

export function rowColToIndex({ row, col }: RowCol): number {
    if (row < 0 || row >= NUM_ROWS || col < 0 || col >= NUM_COLS) return -1;
    return row * 8 + col;
}

export function isRowColInBounds({ row, col }: RowCol): boolean {
    return row >= 0 && row < NUM_ROWS && col >= 0 && col < NUM_COLS;
}

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

export function isPromotionSquare(endIndex: number, color: PieceColor): boolean {
    const { row } = indexToRowCol(endIndex);
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
            } else if (isValidPieceShortAlias(char)) {
                invariant(col < NUM_COLS, 'Invalid FEN: too many squares in a rank');
                const boardIndex = rowColToIndex({ row, col });
                board[boardIndex] = char as PieceShortAlias;
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
 * Converts algebraic square notation (e.g., "e3") to a board index.
 * Returns -1 for "-" which is used in FEN to denote no en passant target.
 */
export function algebraicNotationToIndex(algebraicNotation: string): number {
    const formattedNotation = algebraicNotation.trim();
    if (formattedNotation === '-') return -1;
    invariant(isValidAlgebraicNotation(formattedNotation), `Invalid square notation: ${algebraicNotation}`);
    const fileCharCode = formattedNotation.charCodeAt(0); // 'a'..'h'
    const rank = Number(formattedNotation[1]); // '1'..'8'
    const col = fileCharCode - 'a'.charCodeAt(0);
    const row = NUM_ROWS - rank;
    return rowColToIndex({ row, col });
}
