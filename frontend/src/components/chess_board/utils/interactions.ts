import { getPiece, getKingIndices } from '@grouchess/chess';
import { type ChessBoardType, type Move, type Piece, type PieceAlias, type PieceColor } from '@grouchess/models';

import type { GlowingSquarePropsByIndex } from '../../../utils/types';

export function calculateGhostPieceTransform(squareSize: number, x: number, y: number) {
    const offsetX = -squareSize / 2;
    const offsetY = -squareSize / 2;
    return `translate(${x + offsetX}px, ${y + offsetY}px)`;
}

export function calculateSelectedPieceAndGlowingSquares(
    board: ChessBoardType,
    previousMoveIndices: number[],
    checkedColor: PieceColor | undefined,
    selectedIndex: number | null,
    legalMovesForSelectedPiece: Move[]
): {
    selectedPiece: Piece | null;
    indexToMoveDataForSelectedPiece: Record<number, Move>;
    baseGlowingSquarePropsByIndex: GlowingSquarePropsByIndex;
} {
    let baseGlowingSquarePropsByIndex: GlowingSquarePropsByIndex = {};
    previousMoveIndices.forEach((index) => {
        baseGlowingSquarePropsByIndex[index] = { isPreviousMove: true };
    });

    if (checkedColor !== undefined) {
        const kingIndex = getKingIndices(board)[checkedColor];
        baseGlowingSquarePropsByIndex[kingIndex] ??= {};
        baseGlowingSquarePropsByIndex[kingIndex].isCheck = true;
    }

    if (selectedIndex === null) {
        return {
            selectedPiece: null,
            indexToMoveDataForSelectedPiece: {} as Record<number, Move>,
            baseGlowingSquarePropsByIndex,
        };
    }

    legalMovesForSelectedPiece.forEach(({ endIndex, type }) => {
        baseGlowingSquarePropsByIndex[endIndex] ??= {};
        baseGlowingSquarePropsByIndex[endIndex] = {
            ...baseGlowingSquarePropsByIndex[endIndex],
            ...(type === 'capture' ? { canCapture: true } : { canMove: true }),
        };
    });

    baseGlowingSquarePropsByIndex[selectedIndex] ??= {};
    baseGlowingSquarePropsByIndex[selectedIndex].isSelected = true;

    const indexToMoveDataForSelectedPiece: Record<number, Move> = {};
    legalMovesForSelectedPiece.forEach((move) => {
        indexToMoveDataForSelectedPiece[move.endIndex] = move;
    });

    return {
        selectedPiece: getPiece(board[selectedIndex] as PieceAlias),
        indexToMoveDataForSelectedPiece,
        baseGlowingSquarePropsByIndex,
    };
}
