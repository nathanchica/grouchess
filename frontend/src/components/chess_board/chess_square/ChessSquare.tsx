import { memo, type ReactNode } from 'react';

import { indexToRowCol } from '@grouchess/chess';

import CaptureOverlay from './CaptureOverlay';
import Legends from './Legends';

import { type GlowingSquareProps } from '../../../utils/types';

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
    let showCaptureOverlay: boolean = false;

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
            showCaptureOverlay = !isDraggingOver;
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

    return (
        <button
            type="button"
            onClick={onClick}
            className={`${CHESS_SQUARE_BASE_CLASSES} ${backgroundClasses} ${highlightClasses} ${hoverClasses}`}
        >
            {showCaptureOverlay && <CaptureOverlay isDarkSquare={isDarkSquare} />}
            {!hideContent ? children : null}

            <Legends
                boardIndex={index}
                isDarkSquare={isDarkSquare}
                isPreviousMoveSquare={Boolean(isPreviousMove)}
                isFlippedBoard={isFlipped}
            />
        </button>
    );
}

export function arePropsEqual(prevProps: Props, nextProps: Props): boolean {
    // Compare primitive props
    if (
        prevProps.index !== nextProps.index ||
        prevProps.hideContent !== nextProps.hideContent ||
        prevProps.isFlipped !== nextProps.isFlipped ||
        prevProps.onClick !== nextProps.onClick ||
        prevProps.children !== nextProps.children
    ) {
        return false;
    }

    // Shallow compare glowingSquareProps object
    const prevGlowing = prevProps.glowingSquareProps;
    const nextGlowing = nextProps.glowingSquareProps;

    return (
        prevGlowing.isPreviousMove === nextGlowing.isPreviousMove &&
        prevGlowing.isSelected === nextGlowing.isSelected &&
        prevGlowing.isDraggingOver === nextGlowing.isDraggingOver &&
        prevGlowing.isCheck === nextGlowing.isCheck &&
        prevGlowing.canCapture === nextGlowing.canCapture &&
        prevGlowing.canMove === nextGlowing.canMove
    );
}

export default memo(ChessSquare, arePropsEqual);
