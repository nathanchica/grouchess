import { Server } from 'socket.io';

import { sendAuthenticatedEvent, sendErrorEvent } from './gameRoomSocket.events.js';
import { MovePieceInputSchema, SendMessageInputSchema, TypingEventInputSchema } from './gameRoomSocket.schemas.js';

import { authenticateSocket, type AuthenticatedSocket } from '../middleware/authenticateSocket.js';
import { ChessGameService, GameRoomService, PlayerService } from '../services/index.js';

type GameRoomSocketDependencies = {
    chessGameService: ChessGameService;
    playerService: PlayerService;
    gameRoomService: GameRoomService;
};

const MAX_PLAYERS_PER_ROOM = 2;

export function createGameRoomSocketHandler({
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
                    if (chessGameService.getChessGameForRoom(roomId)) {
                        io.to(`player:${playerId}`).emit('game_room_ready', { gameRoom });
                        return;
                    }

                    // If room is now full, create chess game and notify all players
                    const { players } = gameRoom;
                    if (players.length === MAX_PLAYERS_PER_ROOM) {
                        chessGameService.createChessGameForRoom(roomId);
                        io.to(`room:${roomId}`).emit('game_room_ready', { gameRoom });
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
            });
        });
    };
}
