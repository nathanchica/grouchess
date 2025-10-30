import { computeGameStateBasedOnClock } from '@grouchess/chess';
import { MovePieceInputSchema, SendMessageInputSchema, TypingEventInputSchema } from '@grouchess/socket-events';

import { authenticateSocket } from '../middleware/authenticateSocket.js';
import type { ChessSocketServer } from '../servers/chess.js';
import { ChessClockService, ChessGameService, GameRoomService, PlayerService } from '../services/index.js';

type ChessGameRoomSocketDependencies = {
    chessClockService: ChessClockService;
    chessGameService: ChessGameService;
    playerService: PlayerService;
    gameRoomService: GameRoomService;
};

export function createChessGameRoomSocketHandler({
    chessClockService,
    chessGameService,
    playerService,
    gameRoomService,
}: ChessGameRoomSocketDependencies) {
    return function initializeChessGameRoomSocket(io: ChessSocketServer) {
        // Apply authentication middleware to all connections
        io.use(authenticateSocket);

        io.on('connection', (socket) => {
            // playerId and roomId provided by authentication middleware
            const { playerId, roomId } = socket.data;
            const gameRoomTarget = `room:${roomId}`;
            const selfTarget = `player:${playerId}`;

            const sendErrorEvent = (message: string) => {
                socket.emit('error', { message });
            };

            const player = playerService.getPlayerById(playerId);
            if (!player) {
                sendErrorEvent('Player not found');
                socket.disconnect();
                return;
            }

            playerService.updateStatus(playerId, true);

            socket.join(selfTarget);
            socket.join(gameRoomTarget);

            socket.emit('authenticated', { playerId });

            socket.on('wait_for_game', () => {
                try {
                    const gameRoom = gameRoomService.getGameRoomById(roomId);
                    if (!gameRoom) {
                        sendErrorEvent('Game room not found');
                        return;
                    }

                    const { colorToPlayerId, timeControl } = gameRoom;

                    // Game in progress (player rejoining)
                    const currentChessGame = chessGameService.getChessGameForRoom(roomId);
                    if (currentChessGame) {
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
                } catch (error) {
                    console.error('Error while waiting for game:', error);
                    sendErrorEvent('Failed to join room');
                }
            });

            socket.on('move_piece', (input) => {
                try {
                    const parseResult = MovePieceInputSchema.safeParse(input);
                    if (!parseResult.success) {
                        sendErrorEvent('Invalid move_piece input');
                        return;
                    }
                    const { fromIndex, toIndex, promotion } = parseResult.data;

                    const chessGame = chessGameService.getChessGameForRoom(roomId);
                    if (!chessGame) {
                        sendErrorEvent('Game has not started yet');
                        return;
                    }

                    if (chessGame.gameState.status !== 'in-progress') {
                        sendErrorEvent('Game is already over');
                        return;
                    }

                    const playerColor = gameRoomService.getPlayerColor(roomId, playerId);
                    if (chessGame.boardState.playerTurn !== playerColor) {
                        sendErrorEvent("It's not your turn");
                        return;
                    }

                    let clockState = chessClockService.getClockStateForRoom(roomId);

                    // early check if clock expired
                    if (clockState) {
                        const expiredClockGameState = computeGameStateBasedOnClock(
                            clockState,
                            chessGame.boardState.board
                        );
                        if (expiredClockGameState) {
                            clockState = chessClockService.pauseClock(roomId);
                            chessGameService.endGameForRoom(roomId, expiredClockGameState);
                            const updatedScores = gameRoomService.updatePlayerScores(roomId, expiredClockGameState);

                            io.to(gameRoomTarget).emit('game_ended', {
                                reason: expiredClockGameState.status,
                                winner: expiredClockGameState.winner,
                                updatedScores,
                            });
                            io.to(gameRoomTarget).emit('clock_update', { clockState });
                            return;
                        }
                    }

                    const { gameState, moveHistory } = chessGameService.movePiece(
                        roomId,
                        fromIndex,
                        toIndex,
                        promotion
                    );
                    const isGameOver = gameState.status !== 'in-progress';

                    socket.to(gameRoomTarget).emit('piece_moved', {
                        fromIndex,
                        toIndex,
                        promotion,
                    });

                    if (isGameOver) {
                        if (clockState) {
                            clockState = chessClockService.pauseClock(roomId);
                            io.to(gameRoomTarget).emit('clock_update', { clockState });
                        }
                        const updatedScores = gameRoomService.updatePlayerScores(roomId, gameState);

                        io.to(gameRoomTarget).emit('game_ended', {
                            reason: gameState.status,
                            winner: gameState.winner,
                            updatedScores,
                        });
                        return;
                    }

                    // update clock for move
                    if (clockState) {
                        const nextActiveColor = playerColor === 'white' ? 'black' : 'white';
                        if (clockState.isPaused) {
                            clockState = chessClockService.startClock(roomId, nextActiveColor);
                        } else {
                            clockState = chessClockService.switchClock(roomId, nextActiveColor);
                        }

                        // increment white clock if first move
                        if (moveHistory.length === 1 && nextActiveColor === 'black') {
                            clockState.white.timeRemainingMs += clockState.incrementMs;
                        }

                        io.to(gameRoomTarget).emit('clock_update', { clockState });
                    }
                } catch (error) {
                    console.error('Error moving piece:', error);
                    sendErrorEvent('Failed to move piece');
                }
            });

            socket.on('send_message', (input) => {
                const parseResult = SendMessageInputSchema.safeParse(input);
                if (!parseResult.success) {
                    sendErrorEvent('Invalid send_message input');
                    return;
                }
                const { type, content } = parseResult.data;

                try {
                    if (type === 'standard' && !content?.trim()) {
                        sendErrorEvent('Message content cannot be empty');
                        return;
                    }
                    const message = gameRoomService.addMessageToGameRoom(roomId, type, playerId, content);
                    io.to(gameRoomTarget).emit('new_message', { message });
                } catch (error) {
                    console.error('Error sending message:', error);
                    sendErrorEvent('Failed to send message');
                }
            });

            socket.on('offer_rematch', () => {
                const gameRoomOffers = gameRoomService.getOffersForGameRoom(roomId);
                if (!gameRoomOffers) {
                    sendErrorEvent('Game room not found');
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
                    sendErrorEvent('Game room not found after starting rematch');
                    return;
                }
                const { timeControl } = gameRoom;
                chessGameService.createChessGameForRoom(roomId);
                if (timeControl) {
                    chessClockService.resetClock(roomId);
                }

                io.to(gameRoomTarget).emit('game_room_ready');
            });

            socket.on('typing', (input) => {
                const parseResult = TypingEventInputSchema.safeParse(input);
                if (!parseResult.success) {
                    sendErrorEvent('Invalid typing input');
                    return;
                }
                const { isTyping } = parseResult.data;

                try {
                    socket.to(gameRoomTarget).emit('user_typing', { playerId, isTyping });
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
                    playerIds.forEach((id) => playerService.deletePlayer(id));
                    gameRoomService.deleteGameRoom(roomId);
                }
            });
        });
    };
}
