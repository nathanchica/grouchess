import { HandlerContext } from '../types.js';
import { createNoInputEventHandler } from '../utils.js';

function onDisconnect({ roomId, playerId, services, createNewMessage }: HandlerContext) {
    const { gameRoomService, playerService, chessGameService, chessClockService, messageService } = services;

    playerService.updateStatus(playerId, false);
    createNewMessage('player-left-room');

    const gameRoom = gameRoomService.getGameRoomById(roomId);
    if (!gameRoom) {
        return;
    }

    // If all players are offline, clean up the game room and associated data
    const { players } = gameRoom;
    const playerIds = players.map(({ id }) => id);
    if (playerIds.every((id) => playerService.getPlayerStatus(id) === 'offline')) {
        chessGameService.deleteChessGameForRoom(roomId);
        chessClockService.deleteClockForRoom(roomId);
        messageService.deleteMessagesForRoom(roomId);
        playerIds.forEach((id) => playerService.deletePlayer(id));
        gameRoomService.deleteGameRoom(roomId);
    }
}

export function registerDisconnectHandler(context: HandlerContext) {
    const { socket } = context;

    socket.on(
        'disconnect',
        createNoInputEventHandler({
            eventName: 'disconnect',
            context,
            failureMessage: 'Error during disconnect',
            handlerFunction: onDisconnect,
        })
    );
}
