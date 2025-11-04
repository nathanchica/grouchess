import { computeGameStateBasedOnClock } from '@grouchess/chess-clocks';
import type { ChessClockState, ChessGameState, ChessGameMessage, ChessGameMessageType } from '@grouchess/models';
import { type ChessGameRoomClientToServerInput } from '@grouchess/socket-events';
import * as z from 'zod';

import type {
    CreateEventHandlerArgs,
    CreateNoInputEventHandlerArgs,
    HandlerBaseContext,
    HandlerContext,
} from './types.js';

/**
 * Creates a function to send an error event to the client.
 */
export function createSendErrorEvent({ socket }: HandlerBaseContext) {
    return (message: string) => {
        socket.emit('error', { message });
    };
}

/**
 * Creates a function to end a chess game and notify all players in the game room.
 * - Validates that the chess game has started and is in progress (via `chessGameService.endGameForRoom`)
 *   - Skips validation if `skipSettingGameState` is true
 * - Ends the chess game for the room with the provided game outcome
 * - Pauses clocks if they exist and emits the updated clock state
 * - Updates player scores based on the provided game outcome
 * - Emits a `game_ended` event to all players in the game room with the game outcome details
 */
export function createEndChessGameEvent({ services, io, roomId, targets }: HandlerBaseContext) {
    const { chessGameService, chessClockService, gameRoomService } = services;
    const { gameRoom: gameRoomTarget } = targets;

    return (gameState: ChessGameState, skipSettingGameState: boolean = false) => {
        if (!skipSettingGameState) {
            chessGameService.endGameForRoom(roomId, gameState);
        }

        let clockState: ChessClockState | null = null;
        if (chessClockService.hasClockForRoom(roomId)) {
            clockState = chessClockService.pauseClock(roomId);
        }
        io.to(gameRoomTarget).emit('clock_update', { clockState });

        const updatedScores = gameRoomService.updatePlayerScores(roomId, gameState);

        io.to(gameRoomTarget).emit('game_ended', {
            reason: gameState.status,
            winner: gameState.winner,
            updatedScores,
        });
    };
}

/**
 * Creates a function to create a new message and emit a `new_message` payload to everyone in the game room.
 */
export function createSendNewMessageEvent(context: HandlerBaseContext) {
    return (messageType: ChessGameMessageType, content?: ChessGameMessage['content']) => {
        const { io, targets, services, roomId, playerId } = context;
        const { messageService, gameRoomService } = services;
        const gameRoom = gameRoomService.getGameRoomById(roomId);
        if (!gameRoom) {
            throw new Error('Game room not found');
        }
        const playerDisplayName = gameRoom.playerIdToDisplayName[playerId];
        const message: ChessGameMessage = messageService.addMessageToRoom(
            roomId,
            messageType,
            playerId,
            playerDisplayName,
            content
        );
        io.to(targets.gameRoom).emit('new_message', { message });
    };
}

/**
 * Checks if the chess clock has expired and ends the game if so.
 * No-op if no clock exists or if the game has not started.
 */
export function checkClockExpiration(context: HandlerContext): void {
    const { services, roomId, endChessGame } = context;
    const { chessClockService, chessGameService } = services;
    const chessGame = chessGameService.getChessGameForRoom(roomId);
    if (!chessGame) {
        return;
    }
    let clockState = chessClockService.getClockStateForRoom(roomId);
    if (clockState) {
        const expiredClockGameState = computeGameStateBasedOnClock(clockState, chessGame.boardState.board);
        if (expiredClockGameState) {
            endChessGame(expiredClockGameState);
            return;
        }
    }
}

/**
 * Creates a generic event handler for chess game room events with client input validation and error handling.
 * - Will validate input against the provided Zod schema if given.
 * - Will check for clock expiration before handling the event.
 * - Catches and logs any errors, sending an error event to the client with the provided failure message.
 */
export function createEventHandler<I extends ChessGameRoomClientToServerInput>({
    eventName,
    context,
    handlerFunction,
    inputSchema,
    invalidInputMessage,
    failureMessage,
}: CreateEventHandlerArgs<I>): (input: I) => void {
    return (input: unknown) => {
        try {
            // early check if clock expired if applicable
            checkClockExpiration(context);

            if (inputSchema) {
                const parsedInput = inputSchema.parse(input);
                return handlerFunction(parsedInput, context);
            }
            return handlerFunction(input as I, context);
        } catch (error) {
            console.error(`Error handling event '${eventName}':`, error);

            const { sendErrorEvent } = context;

            if (error instanceof z.ZodError) {
                sendErrorEvent(invalidInputMessage ?? `Invalid ${eventName} input`);
                return;
            }

            sendErrorEvent(failureMessage ?? `Failed to handle ${eventName}`);
        }
    };
}

/**
 * Creates a generic event handler for chess game room events that do not require client input, with error handling.
 * - Will check for clock expiration before handling the event.
 * - Catches and logs any errors, sending an error event to the client with the provided failure message.
 */
export function createNoInputEventHandler({
    eventName,
    context,
    handlerFunction,
    failureMessage,
}: CreateNoInputEventHandlerArgs): () => void {
    return () => {
        try {
            // early check if clock expired if applicable
            checkClockExpiration(context);

            return handlerFunction(context);
        } catch (error) {
            console.error(`Error handling event '${eventName}':`, error);

            const { sendErrorEvent } = context;
            sendErrorEvent(failureMessage ?? `Failed to handle ${eventName}`);
        }
    };
}
