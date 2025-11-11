import { indexToAlgebraicNotation } from '@grouchess/chess';
import type { BoardIndex, PieceAlias } from '@grouchess/models';

import { aliasToPieceImageData } from './pieces';
import type { ChessSquareLegends, GlowingSquareProps } from './types';

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
 * Gets the row and column legends for a square at a given board index, considering whether the board is flipped.
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
 * Generates an accessible label for a chess square that describes its position, piece, and state.
 * Used for screen reader accessibility.
 */
export function getSquareAriaLabel(
    boardIndex: BoardIndex,
    pieceAlias: PieceAlias | null,
    glowingSquareProps: GlowingSquareProps
): string {
    const squareName = indexToAlgebraicNotation(boardIndex);
    const parts: string[] = [squareName];

    // Describe the piece on this square using the same alt text as the images
    if (pieceAlias) {
        parts.push(aliasToPieceImageData[pieceAlias].altText);
    } else {
        parts.push('empty');
    }

    // Add state information
    const { isCheck, isSelected, canCapture, canMove, isPreviousMove } = glowingSquareProps;

    if (isCheck) {
        parts.push('in check');
    }

    if (isSelected) {
        parts.push('selected');
    }

    if (canCapture) {
        // The piece described above can be captured
        parts.push('can be captured');
    } else if (canMove) {
        parts.push('can move here');
    }

    if (isPreviousMove) {
        parts.push('previous move');
    }

    return parts.join(', ');
}
