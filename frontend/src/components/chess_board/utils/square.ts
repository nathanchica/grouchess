import { indexToRowCol } from '@grouchess/chess';
import type { BoardIndex } from '@grouchess/models';

import type { ChessSquareLegends, GlowingSquareProps } from '../../../utils/types';

const DEFAULT_DARK_SQUARE_COLOR = 'bg-slate-400';
const DEFAULT_LIGHT_SQUARE_COLOR = 'bg-stone-200';

const CHECK_GLOW_DARK_SQUARE_COLOR = 'bg-red-400';
const CHECK_GLOW_LIGHT_SQUARE_COLOR = 'bg-red-300';

const PREV_MOVE_GLOW_DARK_SQUARE_COLOR = 'bg-amber-100/85';
const PREV_MOVE_GLOW_LIGHT_SQUARE_COLOR = 'bg-amber-100/90';

const SELECTED_GLOW_SQUARE_COLOR = 'bg-emerald-300';
const HOVER_SELECTABLE_SQUARE_COLOR = 'hover:bg-emerald-300';
const DRAG_OVER_SELECTABLE_SQUARE_COLOR = 'bg-emerald-300';

const SELECTABLE_MOVE_DOT_COLOR = 'after:bg-emerald-300/80';
// Use a responsive, clamped size to scale with the square and stay within sensible bounds. Bump size on xl+ screens.
const SELECTABLE_MOVE_DOT_CLASSES = `after:absolute after:left-1/2 after:top-1/2 after:h-[clamp(0.75rem,30%,1.25rem)] after:w-[clamp(0.75rem,30%,1.25rem)] 2xl:after:h-[clamp(1rem,35%,1.5rem)] 2xl:after:w-[clamp(1rem,35%,1.5rem)] after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full ${SELECTABLE_MOVE_DOT_COLOR} after:content-[""] hover:after:opacity-0`;

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
 * Returns the Tailwind classes that control the glow/background/hover visuals for a chess square.
 */
export function getSquareVisualClasses(glowingSquareProps: GlowingSquareProps, isDarkSquare: boolean): string {
    const {
        isPreviousMove = false,
        isSelected = false,
        isDraggingOver = false,
        isCheck = false,
        canCapture = false,
        canMove = false,
    } = glowingSquareProps;

    let backgroundClasses = isDarkSquare ? DEFAULT_DARK_SQUARE_COLOR : DEFAULT_LIGHT_SQUARE_COLOR;
    let highlightClasses = '';
    let hoverClasses = '';

    if (isSelected) {
        backgroundClasses = SELECTED_GLOW_SQUARE_COLOR;
    } else {
        if (isCheck) {
            backgroundClasses = isDarkSquare ? CHECK_GLOW_DARK_SQUARE_COLOR : CHECK_GLOW_LIGHT_SQUARE_COLOR;
        } else if (isPreviousMove) {
            backgroundClasses = isDarkSquare ? PREV_MOVE_GLOW_DARK_SQUARE_COLOR : PREV_MOVE_GLOW_LIGHT_SQUARE_COLOR;
        }

        if (canCapture) {
            hoverClasses = HOVER_SELECTABLE_SQUARE_COLOR;
            if (isDraggingOver) {
                backgroundClasses = SELECTED_GLOW_SQUARE_COLOR;
            }
        } else if (canMove) {
            highlightClasses = SELECTABLE_MOVE_DOT_CLASSES;
            hoverClasses = HOVER_SELECTABLE_SQUARE_COLOR;
            if (isDraggingOver) {
                backgroundClasses = DRAG_OVER_SELECTABLE_SQUARE_COLOR;
            }
        }
    }

    return [backgroundClasses, highlightClasses, hoverClasses].filter(Boolean).join(' ');
}

/**
 * Determines if a square at a given board index is a dark square.
 */
export function getIsDarkSquare(index: BoardIndex): boolean {
    const { row, col } = indexToRowCol(index);
    return row % 2 === (col % 2 === 0 ? 1 : 0);
}
