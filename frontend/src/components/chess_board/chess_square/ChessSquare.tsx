import { memo, type ReactNode } from 'react';

import { indexToAlgebraicNotation } from '@grouchess/chess';

import CaptureOverlay from './CaptureOverlay';
import Legends from './Legends';

import { getLegendsForIndex, getIsDarkSquare } from '../../../utils/square';
import { type GlowingSquareProps } from '../../../utils/types';

const CHESS_SQUARE_BASE_CLASSES =
    'relative aspect-square cursor-pointer flex items-center justify-center transition-colors group';

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
// Use a responsive, clamped size to scale with the square and stays within sensible bounds. Bump size on xl+ screens.
const SELECTABLE_MOVE_DOT_CLASSES = `after:absolute after:left-1/2 after:top-1/2 after:h-[clamp(0.75rem,30%,1.25rem)] after:w-[clamp(0.75rem,30%,1.25rem)] 2xl:after:h-[clamp(1rem,35%,1.5rem)] 2xl:after:w-[clamp(1rem,35%,1.5rem)] after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full ${SELECTABLE_MOVE_DOT_COLOR} after:content-[""] hover:after:opacity-0`;

type Props = {
    index: number;
    glowingSquareProps: GlowingSquareProps;
    hideContent?: boolean;
    onClick: () => void;
    children: ReactNode;
    isFlipped: boolean;
};

function ChessSquare({ index, glowingSquareProps, hideContent = false, onClick, children, isFlipped }: Props) {
    const isDarkSquare = getIsDarkSquare(index);
    const legends = getLegendsForIndex(index, isFlipped);

    const { isPreviousMove, isSelected, isDraggingOver, isCheck, canCapture, canMove } = glowingSquareProps;

    let backgroundClasses = isDarkSquare ? DEFAULT_DARK_SQUARE_COLOR : DEFAULT_LIGHT_SQUARE_COLOR;
    let highlightClasses = '';
    let hoverClasses = '';
    let showCaptureOverlay: boolean = false;

    if (isSelected) {
        backgroundClasses = SELECTED_GLOW_SQUARE_COLOR;
    } else {
        if (isCheck) {
            backgroundClasses = isDarkSquare ? CHECK_GLOW_DARK_SQUARE_COLOR : CHECK_GLOW_LIGHT_SQUARE_COLOR;
        } else if (isPreviousMove) {
            backgroundClasses = isDarkSquare ? PREV_MOVE_GLOW_DARK_SQUARE_COLOR : PREV_MOVE_GLOW_LIGHT_SQUARE_COLOR;
        }
        if (canCapture) {
            showCaptureOverlay = !isDraggingOver;
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

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={indexToAlgebraicNotation(index)}
            className={`${CHESS_SQUARE_BASE_CLASSES} ${backgroundClasses} ${highlightClasses} ${hoverClasses}`}
        >
            {showCaptureOverlay ? <CaptureOverlay isDarkSquare={isDarkSquare} /> : null}
            {!hideContent ? children : null}
            {legends ? (
                <Legends {...legends} isDarkSquare={isDarkSquare} isPreviousMoveSquare={Boolean(isPreviousMove)} />
            ) : null}
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
