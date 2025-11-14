import type { PointerEvent } from 'react';

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

export function createMockPointerEvent(
    overrides: Partial<PointerEvent<HTMLDivElement>> = {}
): PointerEvent<HTMLDivElement> {
    return {
        pointerId: 1,
        clientX: 0,
        clientY: 0,
        preventDefault: () => {},
        stopPropagation: () => {},
        ...overrides,
    } as PointerEvent<HTMLDivElement>;
}
