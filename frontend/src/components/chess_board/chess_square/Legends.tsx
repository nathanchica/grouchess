import { memo, type ReactNode } from 'react';

import type { BoardIndex } from '@grouchess/models';

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

export type LegendsProps = {
    boardIndex: BoardIndex;
    isDarkSquare: boolean;
    isPreviousMoveSquare: boolean;
    isFlippedBoard: boolean;
};

/**
 * Renders the row and column legends for a chess square.
 */
function Legends({ boardIndex, isDarkSquare, isPreviousMoveSquare, isFlippedBoard }: LegendsProps) {
    let legendFontColor = isDarkSquare ? 'text-zinc-100' : 'text-zinc-500';
    if (isPreviousMoveSquare) legendFontColor = 'text-zinc-500';
    const legendBaseClasses = `absolute text-xs font-bold pointer-events-none ${legendFontColor}`;

    const INDEX_TO_ROW_LEGEND = isFlippedBoard ? INDEX_TO_ROW_LEGEND_FLIPPED : INDEX_TO_ROW_LEGEND_NOT_FLIPPED;
    const INDEX_TO_COL_LEGEND = isFlippedBoard ? INDEX_TO_COL_LEGEND_FLIPPED : INDEX_TO_COL_LEGEND_NOT_FLIPPED;

    const rowLegend = INDEX_TO_ROW_LEGEND[boardIndex];
    const colLegend = INDEX_TO_COL_LEGEND[boardIndex];

    let rowLegendContent: ReactNode = null;
    if (rowLegend) {
        rowLegendContent = (
            <span aria-hidden="true" className={`${legendBaseClasses} top-1 left-1`}>
                {rowLegend}
            </span>
        );
    }

    let colLegendContent: ReactNode = null;
    if (colLegend) {
        colLegendContent = (
            <span aria-hidden="true" className={`${legendBaseClasses} bottom-1 right-1.5`}>
                {colLegend}
            </span>
        );
    }

    return (
        <>
            {rowLegendContent}
            {colLegendContent}
        </>
    );
}

export default memo(Legends);
