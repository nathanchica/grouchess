import type { ChessGameState } from '@grouchess/chess';
import { ChessClockState, computeGameStateBasedOnClock } from '@grouchess/chess-clocks';
import type { Message } from '@grouchess/game-room';
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

            const sendGameEnded = (gameState: ChessGameState) => {
                chessGameService.endGameForRoom(roomId, gameState);

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
                        const message = gameRoomService.addMessageToGameRoom(roomId, 'player-rejoined-room', playerId);
                        io.to(gameRoomTarget).emit('new_message', { message });
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
                            sendGameEnded(expiredClockGameState);
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

                    try {
                        const gameRoomOffers = gameRoomService.getOffersForGameRoom(roomId);
                        if (!gameRoomOffers) {
                            throw new Error('Game room offers not found');
                        }
                        const { 'draw-offer': drawOfferMessage } = gameRoomOffers;
                        if (drawOfferMessage && playerId !== drawOfferMessage.authorId) {
                            const message = gameRoomService.declineDraw(roomId, playerId);
                            io.to(gameRoomTarget).emit('draw_declined', { message });
                        }
                    } catch (error) {
                        console.error('Error declining draw offer after move:', error);
                    }

                    if (isGameOver) {
                        sendGameEnded(gameState);
                        return;
                    }

                    // update clock for move
                    if (clockState) {
                        const nextActiveColor = playerColor === 'white' ? 'black' : 'white';
                        if (clockState.isPaused) {
                            // increment white clock if first move
                            const isFirstMove = moveHistory.length === 1 && nextActiveColor === 'black';
                            const incrementColor = isFirstMove ? 'white' : undefined;
                            clockState = chessClockService.startClock(roomId, nextActiveColor, incrementColor);
                        } else {
                            clockState = chessClockService.switchClock(roomId, nextActiveColor);
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

            socket.on('resign', () => {
                try {
                    const chessGame = chessGameService.getChessGameForRoom(roomId);
                    if (!chessGame) {
                        sendErrorEvent('Game has not started yet');
                        return;
                    }

                    if (chessGame.gameState.status !== 'in-progress') {
                        sendErrorEvent('Game is already over');
                        return;
                    }

                    const resigningColor = gameRoomService.getPlayerColor(roomId, playerId);
                    const winningColor = resigningColor === 'white' ? 'black' : 'white';
                    const resignedGameState: ChessGameState = {
                        status: 'resigned',
                        winner: winningColor,
                    };

                    sendGameEnded(resignedGameState);
                } catch (error) {
                    console.error('Error handling resignation:', error);
                    sendErrorEvent('Failed to resign');
                }
            });

            socket.on('offer_rematch', () => {
                try {
                    const gameRoomOffers = gameRoomService.getOffersForGameRoom(roomId);
                    if (!gameRoomOffers) {
                        sendErrorEvent('Game room not found');
                        return;
                    }
                    const { 'rematch-offer': rematchOfferMessage } = gameRoomOffers;
                    if (!rematchOfferMessage) {
                        const message: Message = gameRoomService.addMessageToGameRoom(
                            roomId,
                            'rematch-offer',
                            playerId
                        );
                        io.to(gameRoomTarget).emit('new_message', { message });
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
                } catch (error) {
                    console.error('Error offering draw:', error);
                    sendErrorEvent('Failed to offer draw');
                }
            });

            socket.on('decline_rematch', () => {
                try {
                    const message = gameRoomService.declineRematch(roomId, playerId);
                    if (!message) {
                        sendErrorEvent('Failed to decline rematch offer');
                        return;
                    }
                    io.to(gameRoomTarget).emit('rematch_declined', { message });
                } catch (error) {
                    console.error('Error declining rematch offer:', error);
                    sendErrorEvent('Failed to decline rematch offer');
                }
            });

            socket.on('offer_draw', () => {
                try {
                    const chessGame = chessGameService.getChessGameForRoom(roomId);
                    if (!chessGame) {
                        sendErrorEvent('Game has not started yet');
                        return;
                    }

                    if (chessGame.gameState.status !== 'in-progress') {
                        sendErrorEvent('Game is already over');
                        return;
                    }

                    const message: Message = gameRoomService.addMessageToGameRoom(roomId, 'draw-offer', playerId);
                    io.to(gameRoomTarget).emit('new_message', { message });
                } catch (error) {
                    console.error('Error offering draw:', error);
                    sendErrorEvent('Failed to offer draw');
                }
            });

            socket.on('decline_draw', () => {
                try {
                    const message = gameRoomService.declineDraw(roomId, playerId);
                    if (!message) {
                        sendErrorEvent('Failed to decline draw offer');
                        return;
                    }
                    io.to(gameRoomTarget).emit('draw_declined', { message });
                } catch (error) {
                    console.error('Error declining draw offer:', error);
                    sendErrorEvent('Failed to decline draw offer');
                }
            });

            socket.on('accept_draw', () => {
                try {
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

                    const drawGameState: ChessGameState = {
                        status: 'draw-by-agreement',
                    };
                    io.to(gameRoomTarget).emit('draw_accepted', { message });
                    sendGameEnded(drawGameState);
                } catch (error) {
                    console.error('Error accepting draw offer:', error);
                    sendErrorEvent('Failed to accept draw offer');
                }
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
                const message = gameRoomService.addMessageToGameRoom(roomId, 'player-left-room', playerId);
                io.to(gameRoomTarget).emit('new_message', { message });

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
