import { useEffect, useRef } from 'react';

import { useChessGame } from '../providers/ChessGameProvider';
import { useGameRoom, type GameRoom, type Player } from '../providers/GameRoomProvider';
import { isDrawStatus } from '../utils/draws';

/**
 * Placeholder until we have a proper backend system maintaining game room states
 */
function GameRoomController() {
    const { room, setRoom, increasePlayerScore } = useGameRoom();
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

    /**
     * Create new room on mount (for now).
     * TODOS:
     * - get room id from url
     * - fetch room info from backend
     */
    useEffect(() => {
        if (room) return;

        const player1: Player = {
            id: 'player-1',
            displayName: 'Player 1',
        };
        const player2: Player = {
            id: 'player-2',
            displayName: 'Player 2',
        };
        const players = [player1, player2];

        let playerIdToDisplayName: GameRoom['playerIdToDisplayName'] = {};
        let playerIdToScore: GameRoom['playerIdToScore'] = {};

        players.forEach(({ id, displayName }) => {
            playerIdToDisplayName[id] = displayName;
            playerIdToScore[id] = 0;
        });

        setRoom({
            id: 'game-room',
            type: 'player-vs-player',
            timeControl: {
                alias: '5|0',
                minutes: 5,
                displayText: '5 min',
                increment: 0,
            },
            players,
            playerIdToDisplayName,
            playerIdToScore,
            colorToPlayerId: {
                white: player1.id,
                black: player2.id,
            },
            messages: [],
            gameCount: 1,
        });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return null;
}

export default GameRoomController;
