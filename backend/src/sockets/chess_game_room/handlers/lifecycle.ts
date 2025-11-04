import type { ChessGameState } from '@grouchess/models';

import { HandlerContext } from '../types.js';
import { createNoInputEventHandler } from '../utils.js';

function onWaitForGame({ io, socket, roomId, services, targets, sendErrorEvent, createNewMessage }: HandlerContext) {
    const { chessGameService, chessClockService, gameRoomService } = services;
    const { gameRoom: gameRoomTarget } = targets;

    const gameRoom = gameRoomService.getGameRoomById(roomId);
    if (!gameRoom) {
        sendErrorEvent('Game room not found');
        return;
    }

    const { colorToPlayerId, timeControl } = gameRoom;

    // Game in progress (player rejoining)
    const currentChessGame = chessGameService.getChessGameForRoom(roomId);
    if (currentChessGame) {
        createNewMessage('player-rejoined-room');
        socket.emit('game_room_ready');
        return;
    }

    // If room is now full: create chess game, initialize clock, and notify all players
    if (colorToPlayerId.white && colorToPlayerId.black) {
        chessGameService.createChessGameForRoom(roomId);
        gameRoomService.startNewGameInRoom(roomId);
        if (timeControl) {
            chessClockService.initializeClockForRoom(roomId, timeControl);
        }

        io.to(gameRoomTarget).emit('game_room_ready');
    }
}

function onResign({ services, roomId, playerId, endChessGame }: HandlerContext) {
    const { gameRoomService } = services;

    const resigningColor = gameRoomService.getPlayerColor(roomId, playerId);
    const winningColor = resigningColor === 'white' ? 'black' : 'white';
    const resignedGameState: ChessGameState = {
        status: 'resigned',
        winner: winningColor,
    };

    endChessGame(resignedGameState);
}

export function registerLifecycleHandlers(context: HandlerContext) {
    const { socket } = context;

    socket.on(
        'wait_for_game',
        createNoInputEventHandler({
            eventName: 'wait_for_game',
            context,
            failureMessage: 'Failed to join room',
            handlerFunction: onWaitForGame,
        })
    );

    socket.on(
        'resign',
        createNoInputEventHandler({
            eventName: 'resign',
            context,
            failureMessage: 'Failed to resign',
            handlerFunction: onResign,
        })
    );
}
