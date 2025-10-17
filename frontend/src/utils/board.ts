import invariant from 'tiny-invariant';

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
