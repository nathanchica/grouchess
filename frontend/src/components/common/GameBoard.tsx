import { forwardRef, type PointerEvent, type ReactNode } from 'react';

export type GameBoardProps = {
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
    onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (event: PointerEvent<HTMLDivElement>) => void;
    children: ReactNode;
};

/**
 * 8x8 Game board grid container handling pointer events.
 */
const GameBoard = forwardRef<HTMLDivElement, GameBoardProps>(
    ({ onPointerDown, onPointerMove, onPointerUp, onPointerCancel, children }, ref) => {
        return (
            <div
                ref={ref}
                role="grid"
                className="relative select-none touch-none grid grid-cols-8 rounded-lg overflow-hidden shadow-2xl shadow-white/25"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
            >
                {children}
            </div>
        );
    }
);

GameBoard.displayName = 'GameBoard';

export default GameBoard;
