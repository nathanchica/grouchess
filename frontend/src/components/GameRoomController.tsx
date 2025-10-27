import { useEffect, useRef } from 'react';

import type { PawnPromotion } from '@grouchess/chess';

import { useChessGame } from '../providers/ChessGameProvider';
import { useGameRoom } from '../providers/GameRoomProvider';
import { useGameRoomSocket } from '../providers/GameRoomSocketProvider';
import { isDrawStatus } from '../utils/draws';

type SendMovePieceInput = { fromIndex: number; toIndex: number; promotion?: PawnPromotion };

/**
 * Synchronizes game room and chess game state and socket events
 */
function GameRoomController() {
    const { room, increasePlayerScore, currentPlayerColor } = useGameRoom();
    const { gameStatus, moveHistory, legalMovesStore, movePiece } = useChessGame();
    const { sendMovePiece, lastPieceMovedPayload } = useGameRoomSocket();
    const prevGameCount = useRef<number | null>(null);
    const prevLastPieceMovedPayload = useRef<typeof lastPieceMovedPayload>(null);
    const prevSendMovePieceInput = useRef<SendMovePieceInput | null>(null);

    const { status, winner } = gameStatus;

    /**
     * Handle end of game
     */
    useEffect(() => {
        if (!room) return;
        if (prevGameCount.current === room.gameCount) return;

        // Increase player scores when current game is over
        // TODO: Move this logic to backend
        if (winner) {
            const playerId = room.colorToPlayerId[winner];
            increasePlayerScore(playerId);
            prevGameCount.current = room.gameCount;
        } else if (isDrawStatus(status)) {
            room.players.map(({ id }) => id).forEach((playerId) => increasePlayerScore(playerId, true));
            prevGameCount.current = room.gameCount;
        }

        // Reset prevLastPieceMovedPayload and prevSendMovePieceInput for new game
        prevLastPieceMovedPayload.current = null;
        prevSendMovePieceInput.current = null;
    }, [status, winner, room, increasePlayerScore]);

    /**
     * Send last move by current player to the server
     */
    useEffect(() => {
        if (!room) return;
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
                prevSendMovePieceInput.current = { fromIndex, toIndex, promotion };
            }
        }
    }, [moveHistory, currentPlayerColor, sendMovePiece, room]);

    /**
     * Apply move received from server
     */
    useEffect(() => {
        if (!room) return;
        if (!lastPieceMovedPayload || lastPieceMovedPayload === prevLastPieceMovedPayload.current) return;

        const { fromIndex, toIndex, promotion } = lastPieceMovedPayload;
        const move = legalMovesStore.byStartIndex[fromIndex]?.find(({ endIndex }) => endIndex === toIndex);
        if (move) {
            movePiece({ ...move, promotion });
            prevLastPieceMovedPayload.current = lastPieceMovedPayload;
        } else {
            console.warn('Received illegal move from server:', { fromIndex, toIndex, promotion });
        }
    }, [lastPieceMovedPayload, legalMovesStore, movePiece, room]);

    return null;
}

export default GameRoomController;
