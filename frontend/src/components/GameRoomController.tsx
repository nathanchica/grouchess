import { useEffect, useRef } from 'react';

import { type PawnPromotion } from '@grouchess/chess';

import { useChessClock } from '../providers/ChessClockProvider';
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
    const { resetClocks, startClock, switchClock, isPaused, stopClocks } = useChessClock();

    const prevMoveHistoryLength = useRef<number | null>(null);
    const prevSendMovePieceInput = useRef<SendMovePieceInput | null>(null);
    const prevTimelineVersion = useRef<number | null>(chessGame?.timelineVersion ?? null);

    /**
     * Reset prev refs and clocks when timeline version changes
     */
    useEffect(() => {
        if (chessGame?.timelineVersion !== prevTimelineVersion.current) {
            prevMoveHistoryLength.current = null;
            prevSendMovePieceInput.current = null;
            resetClocks();
        }
        prevTimelineVersion.current = chessGame?.timelineVersion ?? null;
    }, [chessGame?.timelineVersion, resetClocks]);

    /**
     * Process each new move in move history
     */
    useEffect(() => {
        if (!gameRoom || !chessGame) return;
        const { moveHistory } = chessGame;
        if (prevMoveHistoryLength.current === moveHistory.length) return;
        const lastMove = moveHistory[moveHistory.length - 1];
        if (!lastMove) return;
        if (!currentPlayerColor) return;

        prevMoveHistoryLength.current = moveHistory.length;

        const { move } = lastMove;
        const { piece, startIndex: fromIndex, endIndex: toIndex, promotion } = move;
        const movingPlayerColor = piece.color;
        const otherPlayerColor = movingPlayerColor === 'white' ? 'black' : 'white';

        const hasSentMove =
            prevSendMovePieceInput.current &&
            prevSendMovePieceInput.current.fromIndex === fromIndex &&
            prevSendMovePieceInput.current.toIndex === toIndex;

        /**
         * Send last move by current player to the server
         */
        if (movingPlayerColor === currentPlayerColor) {
            if (hasSentMove) {
                return; // Already sent this move
            }
            if (sendMovePiece(fromIndex, toIndex, promotion)) {
                prevSendMovePieceInput.current = { fromIndex, toIndex, promotion };
            }
        }

        /**
         * Update clocks after move is made.
         * Following a custom rule where clocks start after white makes the first move instead of at game start.
         */
        if (isPaused) {
            startClock(otherPlayerColor);
        } else {
            switchClock(otherPlayerColor);
        }
    }, [chessGame, currentPlayerColor, sendMovePiece, gameRoom, isPaused, startClock, switchClock]);

    /**
     * Stop clocks when game is over
     */
    useEffect(() => {
        if (!chessGame) return;
        const { gameState } = chessGame;
        const isGameOver = gameState.status !== 'in-progress';
        if (isGameOver) {
            stopClocks();
        }
    }, [chessGame, stopClocks]);

    return null;
}

export default GameRoomController;
