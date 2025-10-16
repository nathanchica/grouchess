import type { PieceShortAlias, PieceColor } from './pieces';

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
    return {
        white: board.findIndex((alias) => alias === 'K'),
        black: board.findIndex((alias) => alias === 'k'),
    };
}
