import type { BoardIndex, ChessBoardType, LegalMovesStore, PieceColor } from '@grouchess/models';

import { useChessGame, useGameRoom, type ChessGameContextType } from '../providers/ChessGameRoomProvider';
import type { PendingPromotion } from '../utils/types';

export type UseChessBoardPayload = {
    board: ChessBoardType;
    playerTurn: PieceColor;
    previousMoveIndices: BoardIndex[];
    legalMovesStore: LegalMovesStore;
    boardIsFlipped: boolean;
    boardInteractionIsDisabled: boolean;
    pendingPromotion: PendingPromotion | null;
    checkedColor: PieceColor | undefined;
    movePiece: ChessGameContextType['movePiece'];
};

/**
 * Custom hook to extract and compute chess board related states and actions.
 */
export function useChessBoard() {
    const { chessGame, movePiece } = useChessGame();
    const { gameRoom, currentPlayerColor } = useGameRoom();

    const { boardState, previousMoveIndices, pendingPromotion, gameState, legalMovesStore } = chessGame;
    const { board, playerTurn } = boardState;
    const { type: roomType } = gameRoom;
    const boardIsFlipped = currentPlayerColor === 'black';
    const isCurrentPlayerTurn = roomType === 'self' || currentPlayerColor === playerTurn;
    const { status, check: checkedColor } = gameState;
    const isGameOver = status !== 'in-progress';
    const boardInteractionIsDisabled = Boolean(pendingPromotion) || isGameOver || !isCurrentPlayerTurn;

    return {
        board,
        playerTurn,
        previousMoveIndices,
        legalMovesStore,
        boardIsFlipped,
        boardInteractionIsDisabled,
        pendingPromotion,
        checkedColor,
        movePiece,
    };
}
