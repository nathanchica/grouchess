import { createMockPiece } from '@grouchess/test-utils';

import { createMockDragProps } from '../../components/chess_board/utils/__mocks__/interactions';
import type { UseChessBoardInteractionsPayload } from '../useChessBoardInteractions';

export function createMockUseChessBoardInteractionsPayload(
    overrides: Partial<UseChessBoardInteractionsPayload> = {}
): UseChessBoardInteractionsPayload {
    return {
        dragOverIndex: null,
        drag: null,
        selectedIndex: null,
        selectedPiece: null,
        legalMovesForSelectedPieceByEndIndex: {},
        clearSelection: () => {},
        clearDragStates: () => {},
        selectIndex: () => {},
        startDrag: () => {},
        updateDragOverIndex: () => {},
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
        legalMovesForSelectedPieceByEndIndex: {},
        ...overrides,
    });
}
