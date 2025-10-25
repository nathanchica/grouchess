import { useEffect, useRef } from 'react';

import { useChessGame } from '../providers/ChessGameProvider';
import { useGameRoom } from '../providers/GameRoomProvider';
import { isDrawStatus } from '../utils/draws';

/**
 * Placeholder until we have a proper backend system maintaining game room states
 */
function GameRoomController() {
    const { room, increasePlayerScore } = useGameRoom();
    const { gameStatus } = useChessGame();
    const prevGameCount = useRef<number | null>(null);

    const { status, winner } = gameStatus;

    /**
     * Increase player scores when current game is over
     */
    useEffect(() => {
        if (!room) return;
        if (prevGameCount.current === room.gameCount) return;

        if (winner) {
            const playerId = room.colorToPlayerId[winner];
            increasePlayerScore(playerId);
            prevGameCount.current = room.gameCount;
        } else if (isDrawStatus(status)) {
            room.players.map(({ id }) => id).forEach((playerId) => increasePlayerScore(playerId, true));
            prevGameCount.current = room.gameCount;
        }
    }, [status, winner, room, increasePlayerScore]);

    return null;
}

export default GameRoomController;
