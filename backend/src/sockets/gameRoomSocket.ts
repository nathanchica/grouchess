import { Server } from 'socket.io';

import { authenticateSocket, type AuthenticatedSocket } from '../middleware/authenticateSocket.js';
import { ChessGameService, GameRoomService, PlayerService } from '../services/index.js';
import type { Message } from '../utils/schemas.js';

type SendMessageEventInput = {
    type: Message['type'];
    content?: string;
};

type TypingEventInput = {
    isTyping: boolean;
};

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
                socket.emit('error', { message: 'Player not found' });
                socket.disconnect();
                return;
            }

            socket.join(`player:${playerId}`);
            socket.emit('authenticated', { success: true });

            socket.on('join_game_room', () => {
                try {
                    gameRoomService.joinGameRoom(roomId, player);
                    playerService.updateStatus(playerId, true);
                    socket.join(`room:${roomId}`);
                    socket.to(`room:${roomId}`).emit('player_joined_room', { playerId });

                    const gameRoom = gameRoomService.getGameRoomById(roomId);
                    if (!gameRoom) {
                        socket.emit('error', { message: 'Game room not found' });
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
                    socket.emit('error', { message: 'Failed to join room' });
                }
            });

            socket.on('send_message', ({ type, content }: SendMessageEventInput) => {
                try {
                    if (type === 'standard' && !content?.trim()) {
                        socket.emit('error', { message: 'Message content cannot be empty' });
                        return;
                    }
                    const message = gameRoomService.addMessageToGameRoom(roomId, type, playerId, content);
                    io.to(`room:${roomId}`).emit('new_message', { message });
                } catch (error) {
                    console.error('Error sending message:', error);
                    socket.emit('error', { message: 'Failed to send message' });
                }
            });

            socket.on('typing', ({ isTyping }: TypingEventInput) => {
                try {
                    socket.to(`room:${roomId}`).emit('user_typing', { playerId, isTyping });
                } catch (error) {
                    console.error('Error broadcasting typing status:', error);
                }
            });

            socket.on('disconnect', () => {
                playerService.updateStatus(playerId, false);
                socket.to(`room:${roomId}`).emit('player_left_room', { playerId });
            });
        });
    };
}
