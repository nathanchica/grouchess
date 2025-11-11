import type { PointerEvent } from 'react';

import { NUM_COLS, NUM_ROWS, type RowCol } from '@grouchess/models';

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
