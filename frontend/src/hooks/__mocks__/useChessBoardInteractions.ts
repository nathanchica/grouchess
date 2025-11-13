import { createMockPiece } from '@grouchess/test-utils';

import type { DragProps, UseChessBoardInteractionsPayload } from '../useChessBoardInteractions';

export function createMockDragProps(overrides: Partial<DragProps> = {}): DragProps {
    return {
        pointerId: 1,
        squareSize: 60,
        initialX: 0,
        initialY: 0,
        boardRect: new DOMRect(0, 0, 480, 480),
        ...overrides,
    };
}

export function createMockUseChessBoardInteractionsPayload(
    overrides: Partial<UseChessBoardInteractionsPayload> = {}
): UseChessBoardInteractionsPayload {
    return {
        dragOverIndex: null,
        drag: null,
        selectedIndex: null,
        selectedPiece: null,
        glowingSquarePropsByIndex: {},
        getSquareSize: () => 60,
        clearSelection: () => {},
        clearDragStates: () => {},
        handlePointerDown: () => {},
        handlePointerMove: () => {},
        handlePointerUp: () => {},
        ...overrides,
    };
}

export function createMockUseChessBoardInteractionsPayloadWithSelectedPiece(
    overrides: Partial<UseChessBoardInteractionsPayload> = {}
): UseChessBoardInteractionsPayload {
    return createMockUseChessBoardInteractionsPayload({
        selectedIndex: 0,
        selectedPiece: createMockPiece({ alias: 'N' }),
        drag: createMockDragProps(),
        glowingSquarePropsByIndex: {
            0: {
                isSelected: true,
                isDraggingOver: true,
            },
        },
        ...overrides,
    });
}
