import type { ReactNode } from 'react';

import { indexToRowCol } from '@grouchess/chess';

import { type GlowingSquareProps } from '../../utils/types';

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

const CHESS_SQUARE_BASE_CLASSES =
    'relative aspect-square cursor-pointer flex items-center justify-center transition-colors group';

type Props = {
    index: number;
    glowingSquareProps: GlowingSquareProps;
    hideContent?: boolean;
    onClick: () => void;
    children: ReactNode;
    isFlipped: boolean;
};

function ChessSquare({ index, glowingSquareProps, hideContent = false, onClick, children, isFlipped }: Props) {
    const { row, col } = indexToRowCol(index);
    const isDarkSquare = row % 2 === (col % 2 === 0 ? 1 : 0);
    const { isPreviousMove, isSelected, isDraggingOver, isCheck, canCapture, canMove } = glowingSquareProps;

    let backgroundClasses = isDarkSquare ? 'bg-slate-400' : 'bg-stone-100';
    let highlightClasses = '';
    let hoverClasses = '';
    let overlay: ReactNode | null = null;
    if (isSelected) {
        backgroundClasses = 'bg-emerald-300';
        highlightClasses = '';
    } else {
        if (isCheck) {
            backgroundClasses = isDarkSquare ? 'bg-red-400' : 'bg-red-300';
        } else if (isPreviousMove) {
            backgroundClasses = isDarkSquare ? 'bg-amber-100' : 'bg-orange-100';
        }
        if (canCapture) {
            const borderColor = isDarkSquare ? 'border-emerald-300/90' : 'border-emerald-300/80';
            overlay = (
                <span className="pointer-events-none absolute inset-0 transition-opacity group-hover:opacity-0">
                    <span className={`absolute left-0.5 top-0.5 h-4 w-4 border-t-6 border-l-6 ${borderColor}`} />
                    <span className={`absolute right-0.5 top-0.5 h-4 w-4 border-t-6 border-r-6 ${borderColor}`} />
                    <span className={`absolute left-0.5 bottom-0.5 h-4 w-4 border-b-6 border-l-6 ${borderColor}`} />
                    <span className={`absolute right-0.5 bottom-0.5 h-4 w-4 border-b-6 border-r-6 ${borderColor}`} />
                </span>
            );
            hoverClasses = 'hover:bg-emerald-300';
            if (isDraggingOver) {
                backgroundClasses = 'bg-emerald-300';
            }
        } else if (canMove) {
            const backgroundColor = isDarkSquare ? 'after:bg-emerald-300/90' : 'after:bg-emerald-300/80';
            // Use a responsive, clamped size so the dot scales with the square
            // and stays within sensible bounds. Bump size on xl+ screens.
            highlightClasses = `after:absolute after:left-1/2 after:top-1/2 after:h-[clamp(0.75rem,30%,1.25rem)] after:w-[clamp(0.75rem,30%,1.25rem)] 2xl:after:h-[clamp(1rem,35%,1.5rem)] 2xl:after:w-[clamp(1rem,35%,1.5rem)] after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full ${backgroundColor} after:content-[""] hover:after:opacity-0`;
            // On hover, softly recolor the square to match the dot color and hide the dot
            hoverClasses = 'hover:bg-emerald-300';
            if (isDraggingOver) {
                backgroundClasses = 'bg-emerald-300';
            }
        }
    }

    const legendFontColor = isDarkSquare ? 'text-zinc-100' : 'text-zinc-500';
    const legendBaseClasses = `absolute text-xs font-bold pointer-events-none ${legendFontColor}`;

    const INDEX_TO_ROW_LEGEND = isFlipped ? INDEX_TO_ROW_LEGEND_FLIPPED : INDEX_TO_ROW_LEGEND_NOT_FLIPPED;
    const INDEX_TO_COL_LEGEND = isFlipped ? INDEX_TO_COL_LEGEND_FLIPPED : INDEX_TO_COL_LEGEND_NOT_FLIPPED;

    const rowLegend = INDEX_TO_ROW_LEGEND[index];
    let rowLegendContent: ReactNode = null;
    if (rowLegend) {
        rowLegendContent = (
            <span aria-hidden="true" className={`${legendBaseClasses} top-1 left-1`}>
                {rowLegend}
            </span>
        );
    }
    const colLegend = INDEX_TO_COL_LEGEND[index];
    let colLegendContent: ReactNode = null;
    if (colLegend) {
        colLegendContent = (
            <span aria-hidden="true" className={`${legendBaseClasses} bottom-1 right-1.5`}>
                {colLegend}
            </span>
        );
    }

    return (
        <button
            type="button"
            onClick={onClick}
            className={`${CHESS_SQUARE_BASE_CLASSES} ${backgroundClasses} ${highlightClasses} ${hoverClasses}`}
        >
            {overlay}
            {!hideContent ? children : null}
            {rowLegendContent}
            {colLegendContent}
        </button>
    );
}

export default ChessSquare;
