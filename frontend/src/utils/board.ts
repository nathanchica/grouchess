import type { PieceShortAlias } from './pieces';

export type ChessBoardType = Array<PieceShortAlias | undefined>;

export type GlowingSquare = {
    type: 'previous-move' | 'possible-move' | 'check';
    index: number;
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
