import { CreateGameRoomInput } from './gameRoomService.schemas.js';

import { generateId } from '../utils/generateId.js';
import { type GameRoom, type Message, type Player } from '../utils/schemas.js';

const MESSAGE_ID_LENGTH = 12;
const MAX_ID_GEN_RETRIES = 10;
const MAX_MESSAGES = 100;

export class GameRoomService {
    gameRoomIdToGameRoom: Map<GameRoom['id'], GameRoom> = new Map();

    createGameRoom({ timeControl, roomType, creator, creatorColorInput }: CreateGameRoomInput): GameRoom {
        let id = generateId();
        while (this.gameRoomIdToGameRoom.has(id)) {
            id = generateId();
        }

        const creatorColor = creatorColorInput ?? (Math.random() < 0.5 ? 'white' : 'black');
        const gameRoom: GameRoom = {
            id,
            timeControl,
            players: [creator],
            playerIdToDisplayName: { [creator.id]: creator.displayName },
            playerIdToScore: { [creator.id]: 0 },
            colorToPlayerId: {
                [creatorColor]: creator.id,
                [creatorColor === 'white' ? 'black' : 'white']: null,
            } as GameRoom['colorToPlayerId'],
            messages: [],
            gameCount: 0,
            type: roomType,
        };
        this.gameRoomIdToGameRoom.set(id, gameRoom);
        return gameRoom;
    }

    getGameRoomById(roomId: string): GameRoom | null {
        return this.gameRoomIdToGameRoom.get(roomId) || null;
    }

    addMessageToGameRoom(
        roomId: string,
        messageType: Message['type'],
        authorId: Player['id'],
        content?: string
    ): Message {
        const gameRoom = this.getGameRoomById(roomId);
        if (!gameRoom) {
            throw new Error('Game room not found');
        }

        const existingIds = new Set(gameRoom.messages.map((msg) => msg.id));
        let id: string;
        let attempts = 0;
        do {
            id = generateId(MESSAGE_ID_LENGTH);
            attempts++;
        } while (existingIds.has(id) && attempts < MAX_ID_GEN_RETRIES);
        if (existingIds.has(id)) {
            throw new Error('Failed to generate a unique message ID after maximum retries');
        }
        const message: Message = {
            id,
            type: messageType,
            authorId,
            content,
            createdAt: new Date(),
        };
        gameRoom.messages = [...gameRoom.messages, message].slice(-MAX_MESSAGES);
        return message;
    }

    joinGameRoom(roomId: string, player: Player): void {
        const gameRoom = this.getGameRoomById(roomId);
        if (!gameRoom) {
            throw new Error('Game room not found');
        }
        if (gameRoom.players.find((p) => p.id === player.id)) {
            return; // Player already in the room
        }
        if (gameRoom.players.length >= 2 || (gameRoom.colorToPlayerId.white && gameRoom.colorToPlayerId.black)) {
            throw new Error('Game room is full', { cause: 'FULL' });
        }
        gameRoom.players.push(player);
        gameRoom.playerIdToDisplayName[player.id] = player.displayName;
        gameRoom.playerIdToScore[player.id] = 0;

        const emptyColor = gameRoom.colorToPlayerId.white ? 'black' : 'white';
        gameRoom.colorToPlayerId[emptyColor] = player.id;
    }

    startNewGameInRoom(roomId: string): void {
        const gameRoom = this.getGameRoomById(roomId);
        if (!gameRoom) {
            throw new Error('Game room not found');
        }
        gameRoom.gameCount += 1;
    }

    incrementPlayerScore(roomId: string, playerId: string, isDraw: boolean = false): void {
        const gameRoom = this.getGameRoomById(roomId);
        if (!gameRoom) {
            throw new Error('Game room not found');
        }
        if (!(playerId in gameRoom.playerIdToScore)) {
            throw new Error('Player not found in game room');
        }
        gameRoom.playerIdToScore[playerId] += isDraw ? 0.5 : 1;
    }
}
