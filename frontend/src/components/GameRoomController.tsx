import { useEffect, useRef } from 'react';

import { type PawnPromotion } from '@grouchess/chess';

import { useChessGame, useGameRoom } from '../providers/ChessGameRoomProvider';
import { useGameRoomSocket } from '../providers/GameRoomSocketProvider';

type SendMovePieceInput = { fromIndex: number; toIndex: number; promotion?: PawnPromotion };

/**
 * Synchronizes game room and chess game state and socket events
 */
function GameRoomController() {
    const { chessGame } = useChessGame();
    const { gameRoom, currentPlayerColor } = useGameRoom();
    const { sendMovePiece } = useGameRoomSocket();

    const prevMoveHistoryLength = useRef<number | null>(null);
    const prevSendMovePieceInput = useRef<SendMovePieceInput | null>(null);
    const prevTimelineVersion = useRef<number | null>(chessGame?.timelineVersion ?? null);

    /**
     * Reset previous move history length when timeline version changes
     */
    useEffect(() => {
        if (chessGame?.timelineVersion !== prevTimelineVersion.current) {
            prevMoveHistoryLength.current = null;
            prevSendMovePieceInput.current = null;
        }
        prevTimelineVersion.current = chessGame?.timelineVersion ?? null;
    }, [chessGame?.timelineVersion]);

    /**
     * Send last move by current player to the server
     */
    useEffect(() => {
        if (!gameRoom || !chessGame) return;
        const { moveHistory } = chessGame;
        if (prevMoveHistoryLength.current === moveHistory.length) return;
        const lastMove = moveHistory[moveHistory.length - 1];
        if (!lastMove) return;

        const { move } = lastMove;
        const { piece, startIndex: fromIndex, endIndex: toIndex, promotion } = move;
        const movingPlayerColor = piece.color;
        if (movingPlayerColor === currentPlayerColor) {
            if (
                prevSendMovePieceInput.current &&
                prevSendMovePieceInput.current.fromIndex === fromIndex &&
                prevSendMovePieceInput.current.toIndex === toIndex
            ) {
                return; // Already sent this move
            }
            if (sendMovePiece(fromIndex, toIndex, promotion)) {
                prevMoveHistoryLength.current = moveHistory.length;
                prevSendMovePieceInput.current = { fromIndex, toIndex, promotion };
                prevTimelineVersion.current = chessGame.timelineVersion;
            }
        }
    }, [chessGame, currentPlayerColor, sendMovePiece, gameRoom]);

    return null;
}

export default GameRoomController;
