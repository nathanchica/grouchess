import { getKingIndices } from '@grouchess/chess';
import type { ChessBoardType, Move, PieceColor } from '@grouchess/models';

import type { GlowingSquarePropsByIndex } from '../../../utils/types';

/**
 * Calculates the glowing square properties for the chess board.
 */
export function calculateGlowingSquares(
    board: ChessBoardType,
    previousMoveIndices: number[],
    checkedColor: PieceColor | undefined,
    selectedIndex: number | null,
    legalMovesForSelectedPiece: Move[]
): GlowingSquarePropsByIndex {
    let glowingSquarePropsByIndex: GlowingSquarePropsByIndex = {};
    previousMoveIndices.forEach((index) => {
        glowingSquarePropsByIndex[index] = { isPreviousMove: true };
    });

    if (checkedColor !== undefined) {
        const kingIndex = getKingIndices(board)[checkedColor];
        glowingSquarePropsByIndex[kingIndex] ??= {};
        glowingSquarePropsByIndex[kingIndex].isCheck = true;
    }

    legalMovesForSelectedPiece.forEach(({ endIndex, type }) => {
        glowingSquarePropsByIndex[endIndex] ??= {};
        glowingSquarePropsByIndex[endIndex] = {
            ...glowingSquarePropsByIndex[endIndex],
            ...(type === 'capture' ? { canCapture: true } : { canMove: true }),
        };
    });

    if (selectedIndex !== null) {
        glowingSquarePropsByIndex[selectedIndex] ??= {};
        glowingSquarePropsByIndex[selectedIndex].isSelected = true;
    }

    return glowingSquarePropsByIndex;
}

/**
 * Updates the glowing square properties to reflect the current drag-over index.
 */
export function updateGlowingSquaresForDragOver(
    glowingSquarePropsByIndex: GlowingSquarePropsByIndex,
    dragOverIndex: number | null
): GlowingSquarePropsByIndex {
    return Object.entries(glowingSquarePropsByIndex).reduce((result, [key, value]) => {
        const index = Number(key);
        result[index] = {
            ...value,
            isDraggingOver: Boolean(dragOverIndex === index),
        };
        return result;
    }, {} as GlowingSquarePropsByIndex);
}
