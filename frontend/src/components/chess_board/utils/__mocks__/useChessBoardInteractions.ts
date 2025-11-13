import { createMockPiece } from '@grouchess/test-utils';

import { createMockDragProps } from './interactions';

import type { UseChessBoardInteractionsPayload } from '../useChessBoardInteractions';

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
