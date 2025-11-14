import { useCallback, useEffect, useMemo, useState, type RefObject } from 'react';

import { type BoardIndex, type ChessBoardType, type LegalMovesStore, type Move, type Piece } from '@grouchess/models';

import { getSelectedPieceData } from '../components/chess_board/utils/interactions';
import type { DragProps } from '../utils/types';

export type UseChessBoardInteractionsPayload = {
    dragOverIndex: BoardIndex | null;
    drag: DragProps | null;
    selectedIndex: number | null;
    selectedPiece: Piece | null;
    legalMovesForSelectedPieceByEndIndex: Record<BoardIndex, Move>;
    clearSelection: () => void;
    clearDragStates: () => void;
    selectIndex: (index: number) => void;
    startDrag: (dragProps: DragProps) => void;
    updateDragOverIndex: (index: BoardIndex | null) => void;
};

export type UseChessBoardInteractionsParams = {
    boardRef: RefObject<HTMLDivElement | null>;
    board: ChessBoardType;
    legalMovesStore: LegalMovesStore;
};

export function useChessBoardInteractions({
    boardRef,
    board,
    legalMovesStore,
}: UseChessBoardInteractionsParams): UseChessBoardInteractionsPayload {
    const [dragOverIndex, setDragOverIndex] = useState<BoardIndex | null>(null);
    const [drag, setDrag] = useState<DragProps | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    // Memoize derived values to only recompute when selectedIndex changes
    const { selectedPiece, legalMovesForSelectedPieceByEndIndex } = useMemo(
        () => getSelectedPieceData(board, selectedIndex, legalMovesStore),
        [selectedIndex, board, legalMovesStore]
    );

    const clearSelection = useCallback(() => {
        setSelectedIndex(null);
    }, []);

    const clearDragStates = useCallback(() => {
        setDrag(null);
        setDragOverIndex(null);
    }, []);

    const selectIndex = useCallback((index: number) => {
        setSelectedIndex(index);
        setDragOverIndex(index);
    }, []);

    const startDrag = useCallback((dragProps: DragProps) => {
        setDrag(dragProps);
    }, []);

    const updateDragOverIndex = useCallback((index: BoardIndex | null) => {
        setDragOverIndex(index);
    }, []);

    useEffect(() => {
        if (!drag) return;

        const boardElement = boardRef.current;
        const pointerId = drag.pointerId;

        if (!boardElement) return;

        try {
            boardElement.setPointerCapture(pointerId);
        } catch {
            // Ignore errors if pointer capture is not supported or fails
        }

        return () => {
            try {
                boardElement.releasePointerCapture(pointerId);
            } catch {
                // Ignore errors if pointer release is not supported or fails
            }
        };
    }, [boardRef, drag]);

    return {
        dragOverIndex,
        drag,
        selectedIndex,
        selectedPiece,
        legalMovesForSelectedPieceByEndIndex,
        clearSelection,
        clearDragStates,
        selectIndex,
        startDrag,
        updateDragOverIndex,
    };
}
