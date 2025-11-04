import { createInitialChessGame } from '@grouchess/chess';
import { createInitialChessClockState } from '@grouchess/chess-clocks';
import type { TimeControl, ChessGameRoom, Player } from '@grouchess/models';

import type { ChessGameRoomState } from './types';

export function createSelfPlayChessGameRoomState(timeControlOption: TimeControl | null): ChessGameRoomState {
    const player1: Player = {
        id: 'player-1',
        displayName: 'White',
    };
    const player2: Player = {
        id: 'player-2',
        displayName: 'Black',
    };
    const players = [player1, player2];

    let playerIdToDisplayName: ChessGameRoom['playerIdToDisplayName'] = {};
    let playerIdToScore: ChessGameRoom['playerIdToScore'] = {};
    players.forEach(({ id, displayName }) => {
        playerIdToDisplayName[id] = displayName;
        playerIdToScore[id] = 0;
    });

    const gameRoom: ChessGameRoom = {
        id: 'game-room',
        type: 'self',
        timeControl: timeControlOption,
        players,
        playerIdToDisplayName,
        playerIdToScore,
        colorToPlayerId: {
            white: player1.id,
            black: player2.id,
        },
        messages: [],
        gameCount: 1,
    };

    return {
        chessGame: {
            ...createInitialChessGame(),
            timelineVersion: 1,
            previousMoveIndices: [],
            pendingPromotion: null,
        },
        gameRoom,
        clockState: timeControlOption ? createInitialChessClockState(timeControlOption) : null,
        currentPlayerId: player1.id,
    };
}
