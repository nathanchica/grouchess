import { useCallback, useEffect, useRef } from 'react';

import type { LegalMovesStore, MoveRecord, PawnPromotion } from '@grouchess/models';
import type { MovePieceInput, PieceMovedPayload } from '@grouchess/socket-events';

import { useChessGame, useGameRoom } from '../../providers/ChessGameRoomProvider';
import { useSocket } from '../../providers/SocketProvider';

/**
 * Synchronizes chess game state with server for move piece events
 */
function ChessMovesController() {
    const { socket, isAuthenticated } = useSocket();
    const { movePiece, chessGame } = useChessGame();
    const { currentPlayerColor } = useGameRoom();

    const prevMoveHistoryLength = useRef<number | null>(null);
    const prevSendMovePieceInput = useRef<MovePieceInput | null>(null);

    const { legalMovesStore, moveHistory } = chessGame;

    /**
     * Keep refs to chess game state values for use in socket event handlers
     */
    const legalMovesStoreRef = useRef<LegalMovesStore>(legalMovesStore);
    useEffect(() => {
        legalMovesStoreRef.current = legalMovesStore;
    }, [legalMovesStore]);

    const onPieceMoved = useCallback(
        ({ fromIndex, toIndex, promotion }: PieceMovedPayload) => {
            if (!legalMovesStoreRef.current) return;
            const move = legalMovesStoreRef.current.byStartIndex[fromIndex]?.find(
                ({ endIndex }) => endIndex === toIndex
            );
            if (move) {
                movePiece({ ...move, promotion });
            } else {
                console.warn('Received illegal move from server:', { fromIndex, toIndex, promotion });
            }
        },
        [movePiece]
    );

    useEffect(() => {
        socket.on('piece_moved', onPieceMoved);
        return () => {
            socket.off('piece_moved', onPieceMoved);
        };
    }, [onPieceMoved, socket]);

    const sendMovePiece = useCallback(
        (fromIndex: number, toIndex: number, promotion?: PawnPromotion): boolean => {
            if (isAuthenticated) {
                socket.emit('move_piece', { fromIndex, toIndex, promotion });
                return true;
            }
            return false;
        },
        [isAuthenticated, socket]
    );

    useEffect(() => {
        if (prevMoveHistoryLength.current === moveHistory.length) return;
        const lastMoveRecord: MoveRecord | undefined = moveHistory[moveHistory.length - 1];
        if (!lastMoveRecord) return;

        const { move } = lastMoveRecord;
        const { piece, startIndex: fromIndex, endIndex: toIndex, promotion } = move;
        const { color: movingPlayerColor } = piece;

        const hasSentMove =
            prevSendMovePieceInput.current &&
            prevSendMovePieceInput.current.fromIndex === fromIndex &&
            prevSendMovePieceInput.current.toIndex === toIndex;

        /**
         * Send last move by current player to the server
         */
        if (movingPlayerColor === currentPlayerColor) {
            if (hasSentMove) return;
            if (sendMovePiece(fromIndex, toIndex, promotion)) {
                prevMoveHistoryLength.current = moveHistory.length;
                prevSendMovePieceInput.current = { fromIndex, toIndex, promotion };
            }
        }
    }, [moveHistory, currentPlayerColor, sendMovePiece]);

    return null;
}

export default ChessMovesController;
