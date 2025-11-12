import { useCallback, useMemo, useState, type PointerEvent, type RefObject } from 'react';

import { getKingIndices, getPiece, isRowColInBounds, rowColToIndex } from '@grouchess/chess';
import {
    NUM_COLS,
    type BoardIndex,
    type ChessBoardType,
    type LegalMovesStore,
    type Move,
    type Piece,
    type PieceAlias,
    type PieceColor,
} from '@grouchess/models';

import { getRowColFromXY, xyFromPointerEvent } from '../utils/board';
import type { GlowingSquareProps } from '../utils/types';

export type GlowingSquarePropsByIndex = Record<number, GlowingSquareProps>;

export function getSquareSizeFromBoardRect(boardRect: DOMRect): number {
    return boardRect.width / NUM_COLS;
}

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

export type DragProps = {
    pointerId: number;
    squareSize: number;
    boardRect: DOMRect; // cached to avoid layout thrashing on pointer move
    initialX: number; // initial pointer X for first render
    initialY: number; // initial pointer Y for first render
};

export type UseChessBoardInteractionsPayload = {
    dragOverIndex: BoardIndex | null;
    drag: DragProps | null;
    selectedIndex: number | null;
    selectedPiece: Piece | null;
    glowingSquarePropsByIndex: GlowingSquarePropsByIndex;
    getSquareSize: () => number;
    clearSelection: () => void;
    clearDragStates: () => void;
    handlePointerDown: (event: PointerEvent<HTMLDivElement>) => void;
    handlePointerMove: (event: PointerEvent<HTMLDivElement>) => void;
    handlePointerUp: (event: PointerEvent<HTMLDivElement>) => void;
};

export type UseChessBoardInteractionsParams = {
    boardRef: RefObject<HTMLDivElement | null>;
    ghostPieceRef: RefObject<HTMLDivElement | null>;
    board: ChessBoardType;
    playerTurn: PieceColor;
    legalMovesStore: LegalMovesStore;
    checkedColor: PieceColor | undefined;
    previousMoveIndices: number[];
    boardInteractionIsDisabled: boolean;
    boardIsFlipped: boolean;
    movePiece: (move: Move) => void;
};

export function useChessBoardInteractions({
    boardRef,
    ghostPieceRef,
    board,
    playerTurn,
    legalMovesStore,
    checkedColor,
    previousMoveIndices,
    boardInteractionIsDisabled,
    boardIsFlipped,
    movePiece,
}: UseChessBoardInteractionsParams): UseChessBoardInteractionsPayload {
    const [dragOverIndex, setDragOverIndex] = useState<BoardIndex | null>(null);
    const [drag, setDrag] = useState<DragProps | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    // Memoize derived values to only recompute when selectedIndex and the other deps changes
    const { selectedPiece, indexToMoveDataForSelectedPiece, baseGlowingSquarePropsByIndex } = useMemo(() => {
        const legalMoves = selectedIndex !== null ? (legalMovesStore.byStartIndex[selectedIndex] ?? []) : [];
        return calculateSelectedPieceAndGlowingSquares(
            board,
            previousMoveIndices,
            checkedColor,
            selectedIndex,
            legalMoves
        );
    }, [selectedIndex, board, previousMoveIndices, checkedColor, legalMovesStore.byStartIndex]);

    // Attach isDraggingOver to glowingSquareProps here to account for drag state
    const glowingSquarePropsByIndex = useMemo(
        () =>
            Object.entries(baseGlowingSquarePropsByIndex).reduce((result, [key, value]) => {
                const index = Number(key);
                result[index] = {
                    ...value,
                    isDraggingOver: Boolean(drag && dragOverIndex === index),
                };
                return result;
            }, {} as GlowingSquarePropsByIndex),
        [baseGlowingSquarePropsByIndex, drag, dragOverIndex]
    );

    const clearSelection = useCallback(() => {
        setSelectedIndex(null);
    }, []);

    const clearDragStates = useCallback(() => {
        setDrag(null);
        setDragOverIndex(null);
    }, []);

    const getSquareSize = useCallback((): number => {
        const boardRect = boardRef.current?.getBoundingClientRect();
        if (!boardRect) {
            return 0;
        }
        return getSquareSizeFromBoardRect(boardRect);
    }, [boardRef]);

    const handlePointerDown = useCallback(
        (event: PointerEvent<HTMLDivElement>) => {
            if (boardInteractionIsDisabled || !boardRef.current) return;

            const boardRect = boardRef.current.getBoundingClientRect();
            const { x, y } = xyFromPointerEvent(event, boardRect);
            const squareSize = getSquareSizeFromBoardRect(boardRect);
            const rowCol = getRowColFromXY(x, y, squareSize, boardIsFlipped);

            if (!isRowColInBounds(rowCol)) return;

            const boardIndex = rowColToIndex(rowCol);
            const pieceAlias = board[boardIndex];
            const isPossibleMoveSquare = boardIndex in indexToMoveDataForSelectedPiece;

            // If clicking on a possible move square while a piece is selected, execute the move
            if (selectedPiece && isPossibleMoveSquare) {
                movePiece(indexToMoveDataForSelectedPiece[boardIndex]);
                clearSelection();
                return;
            }

            // If clicking on own piece, select it and prepare for potential drag
            if (pieceAlias) {
                const piece = getPiece(pieceAlias);
                if (piece.color === playerTurn) {
                    event.preventDefault();
                    event.stopPropagation();

                    try {
                        boardRef.current.setPointerCapture(event.pointerId);
                    } catch {
                        // ignore errors
                    }

                    setSelectedIndex(boardIndex);
                    setDrag({
                        pointerId: event.pointerId,
                        squareSize,
                        boardRect,
                        initialX: x,
                        initialY: y,
                    });
                    setDragOverIndex(boardIndex);
                    return;
                }
                // If clicking on opponent piece (non-capture), do nothing
                return;
            }

            // If clicking on empty square (not a possible move square), clear selection
            clearSelection();
        },
        [
            board,
            boardInteractionIsDisabled,
            boardIsFlipped,
            clearSelection,
            indexToMoveDataForSelectedPiece,
            movePiece,
            playerTurn,
            selectedPiece,
            boardRef,
        ]
    );

    const handlePointerMove = useCallback(
        (event: PointerEvent<HTMLDivElement>) => {
            if (boardInteractionIsDisabled || !drag || !ghostPieceRef.current) return;
            if (event.pointerId !== drag.pointerId) return;

            const { squareSize, boardRect } = drag;
            const { x, y } = xyFromPointerEvent(event, boardRect);

            // Update ghost position directly without re-render
            ghostPieceRef.current.style.transform = calculateGhostPieceTransform(squareSize, x, y);

            // Only update state when hovering over a different square
            const rowCol = getRowColFromXY(x, y, squareSize, boardIsFlipped);
            const newDragOverIndex = isRowColInBounds(rowCol) ? rowColToIndex(rowCol) : null;
            if (newDragOverIndex !== dragOverIndex) {
                setDragOverIndex(newDragOverIndex);
            }
        },
        [boardInteractionIsDisabled, drag, dragOverIndex, boardIsFlipped, ghostPieceRef]
    );

    const handlePointerUp = useCallback(
        (event: PointerEvent<HTMLDivElement>) => {
            if (!drag || event.pointerId !== drag.pointerId || selectedIndex === null) return;

            const endIndex = dragOverIndex ?? selectedIndex;

            // Only handle drag behavior (when pointer moved to different square)
            if (endIndex === selectedIndex) {
                clearDragStates();
                return;
            }

            // We dragged to a legal move square
            if (endIndex in indexToMoveDataForSelectedPiece) {
                movePiece(indexToMoveDataForSelectedPiece[endIndex]);
            }

            clearSelection();
            clearDragStates();
        },
        [
            drag,
            dragOverIndex,
            selectedIndex,
            indexToMoveDataForSelectedPiece,
            movePiece,
            clearSelection,
            clearDragStates,
        ]
    );

    return {
        dragOverIndex,
        drag,
        selectedIndex,
        selectedPiece,
        glowingSquarePropsByIndex,
        getSquareSize,
        clearSelection,
        clearDragStates,
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
    };
}
