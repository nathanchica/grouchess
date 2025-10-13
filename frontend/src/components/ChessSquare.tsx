import type { ReactNode } from 'react';

import { indexToRowCol, type GlowingSquare } from '../utils/board';

const CHESS_SQUARE_BASE_CLASSES =
    'relative aspect-square cursor-pointer flex items-center justify-center transition-colors';

type Props = {
    index: number;
    glowTypes: Array<GlowingSquare['type']>;
    isSelected: boolean;
    isDraggingOver: boolean; // mouse/pointer is currently over this square while dragging
    hideContent?: boolean;
    onClick: () => void;
    children: ReactNode;
};

function ChessSquare({ index, glowTypes, isSelected, isDraggingOver, hideContent = false, onClick, children }: Props) {
    const { row, col } = indexToRowCol(index);
    const isDarkSquare = row % 2 === (col % 2 === 0 ? 1 : 0);
    const isPreviousMove = glowTypes.includes('previous-move');
    const isPossibleMove = glowTypes.includes('possible-move');
    const isCheck = glowTypes.includes('check');

    let backgroundClasses = isDarkSquare ? 'bg-slate-500 text-white' : 'bg-stone-50';
    let highlightClasses = '';
    let hoverClasses = '';
    if (isSelected) {
        backgroundClasses = isDarkSquare ? 'bg-emerald-600 text-white' : 'bg-emerald-200';
        highlightClasses = '';
    } else {
        if (isCheck) {
            backgroundClasses = isDarkSquare ? 'bg-red-700 text-white' : 'bg-red-200';
        } else if (isPreviousMove) {
            backgroundClasses = isDarkSquare ? 'bg-purple-300 text-white' : 'bg-purple-200';
        }
        if (isPossibleMove) {
            const backgroundColor = isDarkSquare ? 'after:bg-emerald-500/90' : 'after:bg-emerald-300/80';
            highlightClasses = `after:absolute after:left-1/2 after:top-1/2 after:h-6 after:w-6 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full ${backgroundColor} after:content-[""] hover:after:opacity-0`;
            // On hover, softly recolor the square to match the dot color and hide the dot
            hoverClasses = isDarkSquare ? 'hover:bg-emerald-500' : 'hover:bg-emerald-300';
            if (isDraggingOver) {
                backgroundClasses = isDarkSquare ? 'bg-emerald-500 text-white' : 'bg-emerald-300';
            }
        }
    }

    return (
        <button
            key={`square-${index}`}
            type="button"
            onClick={onClick}
            className={`${CHESS_SQUARE_BASE_CLASSES} ${backgroundClasses} ${highlightClasses} ${hoverClasses}`}
        >
            {!hideContent ? children : null}
        </button>
    );
}

export default ChessSquare;
