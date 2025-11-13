import type { DragProps } from '../../../../utils/types';

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
