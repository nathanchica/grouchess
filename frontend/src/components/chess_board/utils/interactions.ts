import type { PointerEvent, RefObject } from 'react';

import { getColorFromAlias, getPiece, isRowColInBounds, rowColToIndex } from '@grouchess/chess';
import type { BoardIndex, ChessBoardType, LegalMovesStore, Move, Piece, PieceColor } from '@grouchess/models';

import { getRowColFromXY, getSquareSizeFromBoardRect, xyFromPointerEvent } from './board';

import type { DragProps } from '../../../utils/types';

/**
 * Calculates the CSS transform for positioning the ghost piece.
 */
export function calculateGhostPieceTransform(squareSize: number, x: number, y: number) {
    const offsetX = -squareSize / 2;
    const offsetY = -squareSize / 2;
    return `translate(${x + offsetX}px, ${y + offsetY}px)`;
}

/**
 * Gets the selected piece and its legal moves from the board and legal moves store.
 */
export function getSelectedPieceData(
    board: ChessBoardType,
    selectedIndex: BoardIndex | null,
    legalMovesStore: LegalMovesStore
): {
    selectedPiece: Piece | null;
    legalMovesForSelectedPieceByEndIndex: Record<BoardIndex, Move>;
} {
    if (selectedIndex === null) {
        return {
            selectedPiece: null,
            legalMovesForSelectedPieceByEndIndex: {},
        };
    }

    const pieceAlias = board[selectedIndex];
    const legalMoves = legalMovesStore.byStartIndex[selectedIndex] ?? [];
    const legalMovesForSelectedPieceByEndIndex: Record<BoardIndex, Move> = {};
    legalMoves.forEach((move) => {
        legalMovesForSelectedPieceByEndIndex[move.endIndex] = move;
    });

    return {
        selectedPiece: pieceAlias ? getPiece(pieceAlias) : null,
        legalMovesForSelectedPieceByEndIndex,
    };
}

/**
 * Creates a pointer down event handler for the chess board.
 */
export function createPointerDownEventHandler(
    boardRect: DOMRect,
    boardInteractionIsDisabled: boolean,
    boardIsFlipped: boolean,
    board: ChessBoardType,
    playerTurn: PieceColor,
    selectedPiece: Piece | null,
    legalMovesForSelectedPieceByEndIndex: Record<BoardIndex, Move>,
    movePiece: (move: Move) => void,
    clearSelection: () => void,
    selectIndex: (index: number) => void,
    startDrag: (dragProps: DragProps) => void
) {
    return function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
        if (boardInteractionIsDisabled) return;

        const { x, y } = xyFromPointerEvent(event, boardRect);
        const squareSize = getSquareSizeFromBoardRect(boardRect);
        const rowCol = getRowColFromXY(x, y, squareSize, boardIsFlipped);

        if (!isRowColInBounds(rowCol)) return;

        const boardIndex = rowColToIndex(rowCol);
        const pieceAlias = board[boardIndex];
        const isPossibleMoveSquare = boardIndex in legalMovesForSelectedPieceByEndIndex;

        // If clicking on a possible move square while a piece is selected, execute the move
        if (selectedPiece && isPossibleMoveSquare) {
            movePiece(legalMovesForSelectedPieceByEndIndex[boardIndex]);
            clearSelection();
            return;
        }

        // If clicking on own piece, select it and prepare for potential drag
        if (pieceAlias) {
            if (getColorFromAlias(pieceAlias) === playerTurn) {
                event.preventDefault();
                event.stopPropagation();

                selectIndex(boardIndex);
                startDrag({
                    pointerId: event.pointerId,
                    squareSize,
                    boardRect,
                    initialX: x,
                    initialY: y,
                });
                return;
            }
            // If clicking on opponent piece (non-capture), do nothing
            return;
        }

        // If clicking on empty square (not a possible move square), clear selection
        clearSelection();
    };
}

/**
 * Creates a pointer move event handler for the chess board.
 */
export function createPointerMoveEventHandler(
    ghostPieceRef: RefObject<HTMLDivElement | null>,
    boardInteractionIsDisabled: boolean,
    boardIsFlipped: boolean,
    drag: DragProps | null,
    dragOverIndex: BoardIndex | null,
    updateDragOverIndex: (index: BoardIndex | null) => void
) {
    return function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
        if (boardInteractionIsDisabled || !drag || !ghostPieceRef.current) return;
        if (event.pointerId !== drag.pointerId) return;

        const { squareSize, boardRect } = drag;
        const { x, y } = xyFromPointerEvent(event, boardRect);

        // Update ghost piece position without causing re-renders
        ghostPieceRef.current.style.transform = calculateGhostPieceTransform(squareSize, x, y);

        // Update state only if drag-over index has changed
        const rowCol = getRowColFromXY(x, y, squareSize, boardIsFlipped);
        const newDragOverIndex = isRowColInBounds(rowCol) ? rowColToIndex(rowCol) : null;
        if (newDragOverIndex !== dragOverIndex) {
            updateDragOverIndex(newDragOverIndex);
        }
    };
}

/**
 * Creates a pointer up event handler for the chess board.
 */
export function createPointerUpEventHandler(
    drag: DragProps | null,
    dragOverIndex: BoardIndex | null,
    selectedIndex: BoardIndex | null,
    legalMovesForSelectedPieceByEndIndex: Record<BoardIndex, Move>,
    movePiece: (move: Move) => void,
    clearSelection: () => void,
    clearDragStates: () => void
) {
    return function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
        if (!drag || event.pointerId !== drag.pointerId || selectedIndex === null) return;

        const endIndex = dragOverIndex ?? selectedIndex;

        // Only handle drag behavior (when pointer moved to different square)
        if (endIndex === selectedIndex) {
            clearDragStates();
            return;
        }

        // We dragged to a legal move square
        if (endIndex in legalMovesForSelectedPieceByEndIndex) {
            movePiece(legalMovesForSelectedPieceByEndIndex[endIndex]);
        }

        clearSelection();
        clearDragStates();
    };
}
