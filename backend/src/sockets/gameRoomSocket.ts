import { createFEN } from '@grouchess/chess';
import { Server } from 'socket.io';

import { sendAuthenticatedEvent, sendErrorEvent, sendLoadGameEvent } from './gameRoomSocket.events.js';
import { MovePieceInputSchema, SendMessageInputSchema, TypingEventInputSchema } from './gameRoomSocket.schemas.js';

import { authenticateSocket, type AuthenticatedSocket } from '../middleware/authenticateSocket.js';
import type { ChessClockState } from '../services/chessClockService.schemas.js';
import { ChessClockService, ChessGameService, GameRoomService, PlayerService } from '../services/index.js';

type GameRoomSocketDependencies = {
    chessClockService: ChessClockService;
    chessGameService: ChessGameService;
    playerService: PlayerService;
    gameRoomService: GameRoomService;
};

const MAX_PLAYERS_PER_ROOM = 2;

export function createGameRoomSocketHandler({
    chessClockService,
    chessGameService,
    playerService,
    gameRoomService,
}: GameRoomSocketDependencies) {
    return function initializeGameRoomSocket(io: Server) {
        // Apply authentication middleware to all connections
        io.use(authenticateSocket);

        io.on('connection', (socket: AuthenticatedSocket) => {
            // playerId and roomId provided by authentication middleware
            const { playerId, roomId } = socket;

            // playerId and roomId are guaranteed to be present by authenticateSocket middleware, but adding a runtime check for safety
            if (!playerId || !roomId) {
                socket.disconnect();
                return;
            }

            const player = playerService.getPlayerById(playerId);
            if (!player) {
                sendErrorEvent(socket, 'Player not found');
                socket.disconnect();
                return;
            }

            socket.join(`player:${playerId}`);
            sendAuthenticatedEvent(socket, true);

            socket.on('join_game_room', () => {
                try {
                    gameRoomService.joinGameRoom(roomId, player);
                    playerService.updateStatus(playerId, true);
                    socket.join(`room:${roomId}`);

                    const gameRoom = gameRoomService.getGameRoomById(roomId);
                    if (!gameRoom) {
                        sendErrorEvent(socket, 'Game room not found');
                        return;
                    }

                    // Game in progress (player rejoining). Send current game room state to rejoining player
                    const currentChessGame = chessGameService.getChessGameForRoom(roomId);
                    if (currentChessGame) {
                        const { boardState } = currentChessGame;
                        const fen = createFEN(boardState);
                        const clockState: ChessClockState | null =
                            chessClockService.getClockStateForRoom(roomId) || null;

                        sendLoadGameEvent(io, `player:${playerId}`, gameRoom, fen, clockState);
                        return;
                    }

                    const { players, timeControl } = gameRoom;

                    // If room is now full, create chess game and notify all players
                    if (players.length === MAX_PLAYERS_PER_ROOM) {
                        const { boardState } = chessGameService.createChessGameForRoom(roomId);
                        const fen = createFEN(boardState);
                        gameRoomService.startNewGameInRoom(roomId);
                        const clockState = timeControl
                            ? chessClockService.initializeClockForRoom(roomId, timeControl)
                            : null;

                        sendLoadGameEvent(io, `room:${roomId}`, gameRoom, fen, clockState);
                    }
                } catch (error) {
                    console.error('Error joining room:', error);
                    sendErrorEvent(socket, 'Failed to join room');
                }
            });

            socket.on('move_piece', (input) => {
                const parseResult = MovePieceInputSchema.safeParse(input);
                if (!parseResult.success) {
                    sendErrorEvent(socket, 'Invalid move_piece input');
                    return;
                }
                const { fromIndex, toIndex, promotion } = parseResult.data;

                const chessGame = chessGameService.getChessGameForRoom(roomId);
                if (!chessGame) {
                    sendErrorEvent(socket, 'Game has not started yet');
                    return;
                }
                const gameRoom = gameRoomService.getGameRoomById(roomId);
                if (!gameRoom) {
                    sendErrorEvent(socket, 'Game room not found');
                    return;
                }
                const { colorToPlayerId } = gameRoom;
                const playerColor =
                    colorToPlayerId.white === playerId ? 'white' : colorToPlayerId.black === playerId ? 'black' : null;
                if (!playerColor) {
                    sendErrorEvent(socket, 'Player not part of this game room');
                    return;
                }
                if (chessGame.boardState.playerTurn !== playerColor) {
                    sendErrorEvent(socket, "It's not your turn");
                    return;
                }
                try {
                    chessGameService.movePiece(roomId, fromIndex, toIndex, promotion);

                    let clockState = chessClockService.getClockStateForRoom(roomId);
                    if (clockState) {
                        const nextActiveColor = playerColor === 'white' ? 'black' : 'white';
                        if (clockState.isPaused) {
                            clockState = chessClockService.startClock(roomId, nextActiveColor);
                        } else {
                            clockState = chessClockService.switchClock(roomId, nextActiveColor);
                        }
                        io.to(`room:${roomId}`).emit('clock_updated', { clockState });
                    }

                    socket.to(`room:${roomId}`).emit('piece_moved', {
                        fromIndex,
                        toIndex,
                        promotion,
                    });
                } catch (error) {
                    console.error('Error moving piece:', error);
                    sendErrorEvent(socket, 'Failed to move piece');
                }
            });

            socket.on('send_message', (input) => {
                const parseResult = SendMessageInputSchema.safeParse(input);
                if (!parseResult.success) {
                    sendErrorEvent(socket, 'Invalid send_message input');
                    return;
                }
                const { type, content } = parseResult.data;

                try {
                    if (type === 'standard' && !content?.trim()) {
                        sendErrorEvent(socket, 'Message content cannot be empty');
                        return;
                    }
                    const message = gameRoomService.addMessageToGameRoom(roomId, type, playerId, content);
                    io.to(`room:${roomId}`).emit('new_message', { message });
                } catch (error) {
                    console.error('Error sending message:', error);
                    sendErrorEvent(socket, 'Failed to send message');
                }
            });

            socket.on('offer_rematch', () => {
                const gameRoomOffers = gameRoomService.getOffersForGameRoom(roomId);
                if (!gameRoomOffers) {
                    sendErrorEvent(socket, 'Game room not found');
                    return;
                }
                const { rematchOfferedByPlayerId } = gameRoomOffers;
                if (!rematchOfferedByPlayerId) {
                    gameRoomService.offerRematch(roomId, playerId);
                    return;
                }
                if (rematchOfferedByPlayerId === playerId) {
                    return; // Player has already offered rematch
                }

                gameRoomService.startNewGameInRoom(roomId);
                gameRoomService.swapPlayerColors(roomId);

                const gameRoom = gameRoomService.getGameRoomById(roomId);
                if (!gameRoom) {
                    sendErrorEvent(socket, 'Game room not found after starting rematch');
                    return;
                }
                const { timeControl } = gameRoom;
                const { boardState } = chessGameService.createChessGameForRoom(roomId);
                const fen = createFEN(boardState);
                const clockState = timeControl ? chessClockService.resetClock(roomId) : null;
                sendLoadGameEvent(io, `room:${roomId}`, gameRoom, fen, clockState);
            });

            socket.on('typing', (input) => {
                const parseResult = TypingEventInputSchema.safeParse(input);
                if (!parseResult.success) {
                    sendErrorEvent(socket, 'Invalid typing input');
                    return;
                }
                const { isTyping } = parseResult.data;

                try {
                    socket.to(`room:${roomId}`).emit('user_typing', { playerId, isTyping });
                } catch (error) {
                    console.error('Error broadcasting typing status:', error);
                }
            });

            socket.on('disconnect', () => {
                playerService.updateStatus(playerId, false);
                const gameRoom = gameRoomService.getGameRoomById(roomId);
                if (!gameRoom) {
                    return;
                }

                const { players } = gameRoom;
                const playerIds = players.map(({ id }) => id);
                if (playerIds.every((id) => playerService.getPlayerStatus(id) === 'offline')) {
                    chessGameService.deleteChessGameForRoom(roomId);
                    chessClockService.deleteClockForRoom(roomId);
                    gameRoomService.deleteGameRoom(roomId);
                    playerIds.forEach((id) => playerService.deletePlayer(id));
                }
            });
        });
    };
}
