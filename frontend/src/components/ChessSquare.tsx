import type { ReactNode } from 'react';

import { indexToRowCol, type GlowingSquareType } from '../utils/board';

const CHESS_SQUARE_BASE_CLASSES =
    'relative aspect-square cursor-pointer flex items-center justify-center transition-colors group';

type Props = {
    index: number;
    glowTypes: Array<GlowingSquareType>;
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
    const isPossibleCapture = glowTypes.includes('possible-capture');
    const isPossibleMove = glowTypes.includes('possible-move');
    const isCheck = glowTypes.includes('check');

    let backgroundClasses = isDarkSquare ? 'bg-slate-500 text-white' : 'bg-stone-50';
    let highlightClasses = '';
    let hoverClasses = '';
    let overlay: ReactNode | null = null;
    if (isSelected) {
        backgroundClasses = isDarkSquare ? 'bg-emerald-600 text-white' : 'bg-emerald-200';
        highlightClasses = '';
    } else {
        if (isCheck) {
            backgroundClasses = isDarkSquare ? 'bg-red-400' : 'bg-red-300';
        } else if (isPreviousMove) {
            backgroundClasses = isDarkSquare ? 'bg-orange-200' : 'bg-amber-100';
        }
        if (isPossibleCapture) {
            const borderColor = isDarkSquare ? 'border-emerald-500/90' : 'border-emerald-300/80';
            overlay = (
                <span className="pointer-events-none absolute inset-0 transition-opacity group-hover:opacity-0">
                    <span className={`absolute left-0.5 top-0.5 h-4 w-4 border-t-6 border-l-6 ${borderColor}`} />
                    <span className={`absolute right-0.5 top-0.5 h-4 w-4 border-t-6 border-r-6 ${borderColor}`} />
                    <span className={`absolute left-0.5 bottom-0.5 h-4 w-4 border-b-6 border-l-6 ${borderColor}`} />
                    <span className={`absolute right-0.5 bottom-0.5 h-4 w-4 border-b-6 border-r-6 ${borderColor}`} />
                </span>
            );
            hoverClasses = isDarkSquare ? 'hover:bg-emerald-500' : 'hover:bg-emerald-300';
            if (isDraggingOver) {
                backgroundClasses = isDarkSquare ? 'bg-emerald-500 text-white' : 'bg-emerald-300';
            }
        } else if (isPossibleMove) {
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
            {overlay}
            {!hideContent ? children : null}
        </button>
    );
}

export default ChessSquare;
