import { isDrawStatus } from '@grouchess/chess';
import type { ChessGameRoom, ChessGameState, PieceColor, Player } from '@grouchess/models';

import { CreateGameRoomInput } from './gameRoomService.schemas.js';

import { GameRoomIsFullError } from '../utils/errors.js';
import { generateUniqueMessageId } from '../utils/generateId.js';

export class GameRoomService {
    private gameRoomIdToGameRoom: Map<ChessGameRoom['id'], ChessGameRoom> = new Map();

    private getMutableGameRoomById(roomId: string): ChessGameRoom {
        const gameRoom = this.gameRoomIdToGameRoom.get(roomId);
        if (!gameRoom) {
            throw new Error('Game room not found');
        }
        return structuredClone(gameRoom);
    }

    private createGameRoomId(): ChessGameRoom['id'] {
        const existingIds = new Set(this.gameRoomIdToGameRoom.keys());
        let id = generateUniqueMessageId(existingIds);
        return id;
    }

    createGameRoom({ timeControl, roomType, creator, creatorColorInput }: CreateGameRoomInput): ChessGameRoom {
        const id = this.createGameRoomId();

        const creatorColor = creatorColorInput ?? (Math.random() < 0.5 ? 'white' : 'black');
        const gameRoom: ChessGameRoom = {
            id,
            timeControl,
            players: [creator],
            playerIdToDisplayName: { [creator.id]: creator.displayName },
            playerIdToScore: { [creator.id]: 0 },
            colorToPlayerId: {
                [creatorColor]: creator.id,
                [creatorColor === 'white' ? 'black' : 'white']: null,
            } as ChessGameRoom['colorToPlayerId'],
            gameCount: 0,
            type: roomType,
        };
        this.gameRoomIdToGameRoom.set(id, gameRoom);
        return gameRoom;
    }

    getGameRoomById(roomId: string): ChessGameRoom | null {
        const gameRoom = this.gameRoomIdToGameRoom.get(roomId) || null;
        return gameRoom ? structuredClone(gameRoom) : null;
    }

    getPlayerColor(roomId: string, playerId: string): PieceColor {
        const { colorToPlayerId } = this.getMutableGameRoomById(roomId);
        if (colorToPlayerId.white === playerId) {
            return 'white';
        } else if (colorToPlayerId.black === playerId) {
            return 'black';
        } else {
            throw new Error('Player not found in game room');
        }
    }

    joinGameRoom(roomId: string, player: Player): void {
        const gameRoom = this.getMutableGameRoomById(roomId);
        if (gameRoom.players.find((p) => p.id === player.id)) {
            return; // Player already in the room
        }
        if (gameRoom.players.length >= 2 || (gameRoom.colorToPlayerId.white && gameRoom.colorToPlayerId.black)) {
            throw new GameRoomIsFullError();
        }
        gameRoom.players.push(player);
        gameRoom.playerIdToDisplayName[player.id] = player.displayName;
        gameRoom.playerIdToScore[player.id] = 0;

        const emptyColor = gameRoom.colorToPlayerId.white ? 'black' : 'white';
        gameRoom.colorToPlayerId[emptyColor] = player.id;
        this.gameRoomIdToGameRoom.set(roomId, gameRoom);
    }

    startNewGameInRoom(roomId: string): void {
        const gameRoom = this.getMutableGameRoomById(roomId);
        gameRoom.gameCount += 1;
        this.gameRoomIdToGameRoom.set(roomId, gameRoom);
    }

    incrementPlayerScore(roomId: string, playerId: string, isDraw: boolean = false): ChessGameRoom {
        const gameRoom = this.getMutableGameRoomById(roomId);
        if (!(playerId in gameRoom.playerIdToScore)) {
            throw new Error('Player not found in game room');
        }
        gameRoom.playerIdToScore[playerId] += isDraw ? 0.5 : 1;
        this.gameRoomIdToGameRoom.set(roomId, gameRoom);
        return gameRoom;
    }

    updatePlayerScores(roomId: string, gameState: ChessGameState): ChessGameRoom['playerIdToScore'] {
        const gameRoom = this.getMutableGameRoomById(roomId);
        const { colorToPlayerId, players } = gameRoom;
        const { winner, status } = gameState;

        if (winner) {
            const winnerId = colorToPlayerId[winner];
            if (!winnerId) {
                throw new Error('Expected winner to have a valid player ID');
            }
            this.incrementPlayerScore(roomId, winnerId);
        } else if (isDrawStatus(status)) {
            // Increment both players' scores by 0.5 for a draw
            players.forEach(({ id }) => {
                this.incrementPlayerScore(roomId, id, true);
            });
        }

        const updatedGameRoom = this.getMutableGameRoomById(roomId);
        return updatedGameRoom.playerIdToScore;
    }

    swapPlayerColors(roomId: string): void {
        const gameRoom = this.getMutableGameRoomById(roomId);
        const { colorToPlayerId } = gameRoom;
        const temp = colorToPlayerId.white;
        colorToPlayerId.white = colorToPlayerId.black;
        colorToPlayerId.black = temp;
        this.gameRoomIdToGameRoom.set(roomId, gameRoom);
    }

    deleteGameRoom(roomId: string): boolean {
        return this.gameRoomIdToGameRoom.delete(roomId);
    }
}
