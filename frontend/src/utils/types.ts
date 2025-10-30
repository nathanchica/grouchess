import type { BoardIndex, ChessGame, Move } from '@grouchess/chess';
import type { ChessGameRoom, Player } from '@grouchess/game-room';

export type WaitingRoom = {
    roomId: ChessGameRoom['id'];
    playerId: Player['id'];
    token: string;
    isCreator?: boolean;
};

export type ChessGameUI = ChessGame & {
    // Indices of the squares involved in the previous move used for highlighting
    previousMoveIndices: BoardIndex[];
    // Version number to force re-renders when resetting/loading games
    timelineVersion: number;
    // Pending promotion info (if a pawn has reached the last rank and is awaiting promotion choice)
    pendingPromotion: { move: Move; preChessGame: ChessGame; prePreviousMoveIndices: BoardIndex[] } | null;
};

export type GlowingSquareProps = {
    isPreviousMove?: boolean;
    isCheck?: boolean;
    isSelected?: boolean;
    isDraggingOver?: boolean; // mouse/pointer is currently over this square while dragging
    canCapture?: boolean;
    canMove?: boolean;
};
