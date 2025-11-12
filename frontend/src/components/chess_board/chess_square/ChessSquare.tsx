import { memo, type ReactNode } from 'react';

import { indexToAlgebraicNotation } from '@grouchess/chess';

import CaptureOverlay from './CaptureOverlay';
import Legends, { type LegendVariant } from './Legends';

import { getLegendsForIndex, getIsDarkSquare, getSquareVisualClasses } from '../../../utils/square';
import { type GlowingSquareProps } from '../../../utils/types';

const CHESS_SQUARE_BASE_CLASSES =
    'relative aspect-square cursor-pointer flex items-center justify-center transition-colors group';

export type ChessSquareProps = {
    index: number;
    glowingSquareProps?: GlowingSquareProps;
    children: ReactNode;
    isFlipped: boolean;
};

function ChessSquare({ index, glowingSquareProps = {}, children, isFlipped }: ChessSquareProps) {
    const isDarkSquare = getIsDarkSquare(index);
    const legends = getLegendsForIndex(index, isFlipped);

    const { isSelected, canCapture, isPreviousMove, isDraggingOver } = glowingSquareProps;
    const squareVisualClasses = getSquareVisualClasses(glowingSquareProps, isDarkSquare);
    const showCaptureOverlay = !isSelected && Boolean(canCapture);

    const shouldUseDarkLegends = isPreviousMove || isSelected || !isDarkSquare || isDraggingOver;
    const legendVariant: LegendVariant = shouldUseDarkLegends ? 'dark' : 'light';

    return (
        <div
            role="gridcell"
            aria-label={indexToAlgebraicNotation(index)}
            className={`${CHESS_SQUARE_BASE_CLASSES} ${squareVisualClasses}`}
        >
            {showCaptureOverlay ? <CaptureOverlay isDarkSquare={isDarkSquare} /> : null}
            {children}
            {legends ? <Legends {...legends} variant={legendVariant} /> : null}
        </div>
    );
}

export function arePropsEqual(prevProps: ChessSquareProps, nextProps: ChessSquareProps): boolean {
    // Compare primitive props
    if (
        prevProps.index !== nextProps.index ||
        prevProps.isFlipped !== nextProps.isFlipped ||
        prevProps.children !== nextProps.children
    ) {
        return false;
    }

    // Shallow compare glowingSquareProps object
    const prevGlowing = prevProps.glowingSquareProps;
    const nextGlowing = nextProps.glowingSquareProps;

    // if both are undefined or same reference
    if (prevGlowing === nextGlowing) {
        return true;
    }

    // if one is undefined
    if (!prevGlowing || !nextGlowing) {
        return false;
    }

    // Both are defined, compare their properties
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
