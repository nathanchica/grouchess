import type { BoardIndex, ChessGame, Move } from '@grouchess/models';

export type PendingPromotion = {
    move: Move;
    preChessGame: ChessGame;
    prePreviousMoveIndices: BoardIndex[];
};

export type ChessGameUI = ChessGame & {
    // Indices of the squares involved in the previous move used for highlighting
    previousMoveIndices: BoardIndex[];
    // Version number to force re-renders when resetting/loading games
    timelineVersion: number;
    // Pending promotion info (if a pawn has reached the last rank and is awaiting promotion choice)
    pendingPromotion: PendingPromotion | null;
};

export type GlowingSquareProps = {
    isPreviousMove?: boolean;
    isCheck?: boolean;
    isSelected?: boolean;
    isDraggingOver?: boolean; // mouse/pointer is currently over this square while dragging
    canCapture?: boolean;
    canMove?: boolean;
};

export type GlowingSquarePropsByIndex = Record<number, GlowingSquareProps>;

export type DragProps = {
    pointerId: number;
    squareSize: number;
    boardRect: DOMRect; // cached to avoid layout thrashing on pointer move
    initialX: number; // initial pointer X for first render
    initialY: number; // initial pointer Y for first render
};

export type ChessSquareLegends = {
    rowLegend?: string;
    colLegend?: string;
};

export type Position = {
    x: number;
    y: number;
};

export type Rect = {
    width: number;
    height: number;
};
