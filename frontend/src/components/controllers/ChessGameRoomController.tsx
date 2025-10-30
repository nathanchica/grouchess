import { useCallback, useEffect } from 'react';

import type { GameEndedPayload } from '@grouchess/socket-events';

import { useChessGame } from '../../providers/ChessGameRoomProvider';
import { useSocket } from '../../providers/SocketProvider';

function ChessGameRoomController() {
    const { socket } = useSocket();
    const { endGame } = useChessGame();

    const onGameEnded = useCallback(
        (payload: GameEndedPayload) => {
            endGame({
                reason: payload.reason,
                winner: payload.winner,
                updatedScores: payload.updatedScores,
            });
        },
        [endGame]
    );

    useEffect(() => {
        socket.on('game_ended', onGameEnded);

        return () => {
            socket.off('game_ended', onGameEnded);
        };
    }, [socket, onGameEnded]);

    return null;
}

export default ChessGameRoomController;
