import { HandlerContext } from '../types.js';
import { createNoInputEventHandler } from '../utils.js';

function onOfferRematch({ io, roomId, playerId, services, targets, sendErrorEvent, createNewMessage }: HandlerContext) {
    const { chessGameService, chessClockService, gameRoomService } = services;
    const { gameRoom: gameRoomTarget } = targets;

    const chessGame = chessGameService.getChessGameForRoom(roomId);
    if (!chessGame) {
        sendErrorEvent('Game has not started yet');
        return;
    }

    if (chessGame.gameState.status === 'in-progress') {
        sendErrorEvent('Game is still in progress');
        return;
    }

    const gameRoomOffers = gameRoomService.getOffersForGameRoom(roomId);
    if (!gameRoomOffers) {
        sendErrorEvent('Game room not found');
        return;
    }
    const { 'rematch-offer': rematchOfferMessage } = gameRoomOffers;
    if (!rematchOfferMessage) {
        createNewMessage('rematch-offer');
        return;
    }
    if (rematchOfferMessage.authorId === playerId) {
        sendErrorEvent('You have already offered a rematch');
        return;
    }

    // Both players have offered a rematch: start new game
    const message = gameRoomService.acceptRematch(roomId, playerId);
    if (!message) {
        sendErrorEvent('Failed to accept rematch offer');
        return;
    }

    gameRoomService.startNewGameInRoom(roomId);
    gameRoomService.swapPlayerColors(roomId);

    const gameRoom = gameRoomService.getGameRoomById(roomId);
    if (!gameRoom) {
        sendErrorEvent('Game room not found after starting rematch');
        return;
    }
    const { timeControl } = gameRoom;
    chessGameService.createChessGameForRoom(roomId);
    if (timeControl) {
        chessClockService.resetClock(roomId);
    }

    io.to(gameRoomTarget).emit('rematch_accepted', { message });
    io.to(gameRoomTarget).emit('game_room_ready');
}

function onDeclineRematch({ io, roomId, playerId, services, targets, sendErrorEvent }: HandlerContext) {
    const { gameRoomService } = services;
    const { gameRoom: gameRoomTarget } = targets;

    const message = gameRoomService.declineRematch(roomId, playerId);
    if (!message) {
        sendErrorEvent('Failed to decline rematch offer');
        return;
    }
    io.to(gameRoomTarget).emit('rematch_declined', { message });
}

function onOfferDraw({ roomId, services, sendErrorEvent, createNewMessage }: HandlerContext) {
    const { chessGameService } = services;

    const chessGame = chessGameService.getChessGameForRoom(roomId);
    if (!chessGame) {
        sendErrorEvent('Game has not started yet');
        return;
    }

    if (chessGame.gameState.status !== 'in-progress') {
        sendErrorEvent('Game is already over');
        return;
    }

    createNewMessage('draw-offer');
}

function onDeclineDraw({ io, roomId, playerId, services, targets, sendErrorEvent }: HandlerContext) {
    const { gameRoomService } = services;
    const { gameRoom: gameRoomTarget } = targets;

    const message = gameRoomService.declineDraw(roomId, playerId);
    if (!message) {
        sendErrorEvent('Failed to decline draw offer');
        return;
    }
    io.to(gameRoomTarget).emit('draw_declined', { message });
}

function onAcceptDraw({ io, roomId, playerId, services, targets, sendErrorEvent, endChessGame }: HandlerContext) {
    const { chessGameService, gameRoomService } = services;
    const { gameRoom: gameRoomTarget } = targets;

    const chessGame = chessGameService.getChessGameForRoom(roomId);
    if (!chessGame) {
        sendErrorEvent('Game has not started yet');
        return;
    }
    if (chessGame.gameState.status !== 'in-progress') {
        sendErrorEvent('Game is already over');
        return;
    }

    const message = gameRoomService.acceptDraw(roomId, playerId);
    if (!message) {
        sendErrorEvent('Failed to accept draw offer');
        return;
    }
    io.to(gameRoomTarget).emit('draw_accepted', { message });

    endChessGame({
        status: 'draw-by-agreement',
    });
}

export function registerOffersHandlers(context: HandlerContext) {
    const { socket } = context;

    socket.on(
        'offer_rematch',
        createNoInputEventHandler({
            eventName: 'offer_rematch',
            context,
            failureMessage: 'Failed to offer rematch',
            handlerFunction: onOfferRematch,
        })
    );

    socket.on(
        'decline_rematch',
        createNoInputEventHandler({
            eventName: 'decline_rematch',
            context,
            failureMessage: 'Failed to decline rematch offer',
            handlerFunction: onDeclineRematch,
        })
    );

    socket.on(
        'offer_draw',
        createNoInputEventHandler({
            eventName: 'offer_draw',
            context,
            failureMessage: 'Failed to offer draw',
            handlerFunction: onOfferDraw,
        })
    );

    socket.on(
        'decline_draw',
        createNoInputEventHandler({
            eventName: 'decline_draw',
            context,
            failureMessage: 'Failed to decline draw offer',
            handlerFunction: onDeclineDraw,
        })
    );

    socket.on(
        'accept_draw',
        createNoInputEventHandler({
            eventName: 'accept_draw',
            context,
            failureMessage: 'Failed to accept draw offer',
            handlerFunction: onAcceptDraw,
        })
    );
}
