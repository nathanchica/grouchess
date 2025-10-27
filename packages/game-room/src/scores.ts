import { type ChessGame, isDrawStatus } from '@grouchess/chess';
import { InvalidInputError } from '@grouchess/errors';

import type { ChessGameRoom } from './schema.js';

export function computePlayerScores(
    gameRoom: ChessGameRoom,
    gameState: ChessGame['gameState']
): ChessGameRoom['playerIdToScore'] {
    const { playerIdToScore, colorToPlayerId } = gameRoom;
    const { status, winner } = gameState;

    let newPlayerIdToScore = { ...playerIdToScore };
    if (winner) {
        const playerId = colorToPlayerId[winner];
        if (!playerId) throw new InvalidInputError('Winner not found in game room');
        newPlayerIdToScore[playerId] += 1;
    } else if (isDrawStatus(status)) {
        // Draw: each player gets half a point
        Object.keys(playerIdToScore).forEach((playerId) => {
            newPlayerIdToScore[playerId] += 0.5;
        });
    }

    return newPlayerIdToScore;
}
