import type { PointerEvent } from 'react';

import { NUM_COLS, NUM_ROWS, type RowCol } from '@grouchess/models';

import type { ChessSquareLegends } from './types';

// When not flipped (white's perspective): bottom row is row 7, left column is col 0
const INDEX_TO_COL_LEGEND_NOT_FLIPPED: Partial<Record<number, string>> = {
    56: 'a',
    57: 'b',
    58: 'c',
    59: 'd',
    60: 'e',
    61: 'f',
    62: 'g',
    63: 'h',
};
const INDEX_TO_ROW_LEGEND_NOT_FLIPPED: Partial<Record<number, string>> = {
    0: '8',
    8: '7',
    16: '6',
    24: '5',
    32: '4',
    40: '3',
    48: '2',
    56: '1',
};

// When flipped (black's perspective): bottom row is row 0, left column is col 7
const INDEX_TO_COL_LEGEND_FLIPPED: Partial<Record<number, string>> = {
    0: 'a',
    1: 'b',
    2: 'c',
    3: 'd',
    4: 'e',
    5: 'f',
    6: 'g',
    7: 'h',
};
const INDEX_TO_ROW_LEGEND_FLIPPED: Partial<Record<number, string>> = {
    7: '8',
    15: '7',
    23: '6',
    31: '5',
    39: '4',
    47: '3',
    55: '2',
    63: '1',
};

/**
 * Gets the row and column legends for a given board index, considering whether the board is flipped.
 * Returns null if there are no legends for the given index.
 */
export function getLegendsForIndex(index: number, isFlippedBoard: boolean): ChessSquareLegends | null {
    const INDEX_TO_ROW_LEGEND = isFlippedBoard ? INDEX_TO_ROW_LEGEND_FLIPPED : INDEX_TO_ROW_LEGEND_NOT_FLIPPED;
    const INDEX_TO_COL_LEGEND = isFlippedBoard ? INDEX_TO_COL_LEGEND_FLIPPED : INDEX_TO_COL_LEGEND_NOT_FLIPPED;

    const rowLegend = INDEX_TO_ROW_LEGEND[index];
    const colLegend = INDEX_TO_COL_LEGEND[index];

    if (!rowLegend && !colLegend) {
        return null;
    }

    return { rowLegend, colLegend };
}

/**
 * Gets the row and column on the board from x and y coordinates.
 */
export function getRowColFromXY(x: number, y: number, squareSize: number, isFlipped: boolean): RowCol {
    const row = Math.floor(y / squareSize);
    const col = Math.floor(x / squareSize);

    return isFlipped ? { row: NUM_ROWS - 1 - row, col: NUM_COLS - 1 - col } : { row, col };
}

/**
 * Gets the x and y coordinates relative to the top-left of the target element from a pointer event.
 */
export function xyFromPointerEvent(
    event: PointerEvent<HTMLDivElement> | PointerEvent<HTMLImageElement>,
    rect: DOMRect
): { x: number; y: number } {
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
    };
}
