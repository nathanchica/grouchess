export type GlowingSquareProps = {
    isPreviousMove?: boolean;
    isCheck?: boolean;
    isSelected?: boolean;
    isDraggingOver?: boolean; // mouse/pointer is currently over this square while dragging
    canCapture?: boolean;
    canMove?: boolean;
};
