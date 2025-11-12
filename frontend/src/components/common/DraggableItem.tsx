import { forwardRef, type ReactNode } from 'react';

import type { Position, Rect } from '../../utils/types';

export function calculateStyle(x: number, y: number, width: number, height: number, centered = true) {
    const offsetX = centered ? -width / 2 : 0;
    const offsetY = centered ? -height / 2 : 0;

    return {
        transform: `translate(${x + offsetX}px, ${y + offsetY}px)`,
        width: `${width}px`,
        height: `${height}px`,
    };
}

export type DraggableItemProps = Position &
    Rect & {
        /** Content to render */
        children: ReactNode;
        /** Whether to center the item at (x, y). Default: true */
        centered?: boolean;
        /** Additional CSS class names for the positioned element */
        className?: string;
    };

/**
 * A performance-optimized draggable overlay item that uses CSS transforms
 * for smooth, hardware-accelerated positioning.
 *
 * Uses an absolute overlay container with pointer-events-none to ensure
 * the item doesn't interfere with underlying interactions.
 *
 * Supports ref forwarding to the inner positioned div for direct DOM manipulation.
 */
const DraggableItem = forwardRef<HTMLDivElement, DraggableItemProps>(
    ({ x, y, width, height, children, centered = true, className = '' }, ref) => {
        return (
            <div className="pointer-events-none absolute inset-0 z-10">
                <div
                    ref={ref}
                    className={`will-change-transform absolute ${className}`}
                    style={calculateStyle(x, y, width, height, centered)}
                >
                    {children}
                </div>
            </div>
        );
    }
);

DraggableItem.displayName = 'DraggableItem';

export default DraggableItem;
