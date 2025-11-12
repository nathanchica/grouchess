import { memo, type ReactNode } from 'react';

import { indexToAlgebraicNotation } from '@grouchess/chess';

import CaptureOverlay from './CaptureOverlay';
import Legends from './Legends';

import { getLegendsForIndex, getIsDarkSquare, getSquareVisualClasses } from '../../../utils/square';
import { type GlowingSquareProps } from '../../../utils/types';

const CHESS_SQUARE_BASE_CLASSES =
    'relative aspect-square cursor-pointer flex items-center justify-center transition-colors group';

export type ChessSquareProps = {
    index: number;
    glowingSquareProps: GlowingSquareProps;
    hideContent?: boolean;
    children: ReactNode;
    isFlipped: boolean;
};

function ChessSquare({ index, glowingSquareProps, hideContent = false, children, isFlipped }: ChessSquareProps) {
    const isDarkSquare = getIsDarkSquare(index);
    const legends = getLegendsForIndex(index, isFlipped);

    const { isPreviousMove, isSelected, canCapture } = glowingSquareProps;
    const squareVisualClasses = getSquareVisualClasses(glowingSquareProps, isDarkSquare);
    const showCaptureOverlay = !isSelected && Boolean(canCapture);

    return (
        <div
            role="gridcell"
            aria-label={indexToAlgebraicNotation(index)}
            className={`${CHESS_SQUARE_BASE_CLASSES} ${squareVisualClasses}`}
        >
            {showCaptureOverlay ? <CaptureOverlay isDarkSquare={isDarkSquare} /> : null}
            {!hideContent ? children : null}
            {legends ? (
                <Legends {...legends} isDarkSquare={isDarkSquare} isPreviousMoveSquare={Boolean(isPreviousMove)} />
            ) : null}
        </div>
    );
}

export function arePropsEqual(prevProps: ChessSquareProps, nextProps: ChessSquareProps): boolean {
    // Compare primitive props
    if (
        prevProps.index !== nextProps.index ||
        prevProps.hideContent !== nextProps.hideContent ||
        prevProps.isFlipped !== nextProps.isFlipped ||
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
