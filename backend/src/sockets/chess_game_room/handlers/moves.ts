import { MovePieceInputSchema, type MovePieceInput } from '@grouchess/socket-events';

import { HandlerContext } from '../types.js';
import { createEventHandler } from '../utils.js';

function onMovePiece(input: MovePieceInput, context: HandlerContext) {
    const { fromIndex, toIndex, promotion } = input;
    const { io, socket, roomId, playerId, services, targets, sendErrorEvent, endChessGame } = context;
    const { chessGameService, chessClockService, gameRoomService, messageService } = services;
    const { gameRoom: gameRoomTarget } = targets;

    const chessGame = chessGameService.getInProgressChessGameForRoom(roomId);
    const playerColor = gameRoomService.getPlayerColor(roomId, playerId);

    if (chessGame.boardState.playerTurn !== playerColor) {
        sendErrorEvent("It's not your turn");
        return;
    }

    // perform move and broadcast to other player
    const { gameState, moveHistory } = chessGameService.movePiece(roomId, fromIndex, toIndex, promotion);
    socket.to(gameRoomTarget).emit('piece_moved', {
        fromIndex,
        toIndex,
        promotion,
    });

    // handle auto-decline of draw offer after move
    try {
        const { 'draw-offer': drawOfferMessage } = messageService.getActiveOffers(roomId);
        if (drawOfferMessage && playerId !== drawOfferMessage.authorId) {
            const message = messageService.declineDraw(roomId, playerId);
            io.to(gameRoomTarget).emit('draw_declined', { message });
        }
    } catch (error) {
        console.error('Error declining draw offer after move:', error);
    }

    // end game if move resulted in game end
    if (gameState.status !== 'in-progress') {
        endChessGame(gameState, true); // skip setting game state again
        return;
    }

    // update clock for move
    let clockState = chessClockService.getClockStateForRoom(roomId);
    if (clockState) {
        const nextActiveColor = playerColor === 'white' ? 'black' : 'white';
        if (clockState.isPaused) {
            /**
             * 2 scenarios to start the clock:
             * 1. First move of the game (black to move): white gets increment
             * 2. Resuming a paused game: the current player who just moved gets increment
             */
            const isFirstMove = moveHistory.length === 1 && nextActiveColor === 'black';
            const incrementColor = isFirstMove ? 'white' : playerColor;
            clockState = chessClockService.startClock(roomId, nextActiveColor, incrementColor);
        } else {
            clockState = chessClockService.switchClock(roomId, nextActiveColor);
        }

        io.to(gameRoomTarget).emit('clock_update', { clockState });
    }
}

export function registerMoveHandlers(context: HandlerContext) {
    const { socket } = context;

    socket.on(
        'move_piece',
        createEventHandler({
            eventName: 'move_piece',
            context,
            inputSchema: MovePieceInputSchema,
            invalidInputMessage: 'Invalid move_piece input',
            failureMessage: 'Failed to move piece',
            handlerFunction: onMovePiece,
        })
    );
}
