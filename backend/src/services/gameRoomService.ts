import { MAX_MESSAGES_PER_ROOM } from '@grouchess/game-room';
import type { ChessGameRoom, Message, Player } from '@grouchess/game-room';

import { CreateGameRoomInput } from './gameRoomService.schemas.js';

import { GameRoomIsFullError } from '../utils/errors.js';
import { generateId } from '../utils/generateId.js';

const MESSAGE_ID_LENGTH = 12;
const MAX_ID_GEN_RETRIES = 10;

type PlayerOffers = {
    rematchOfferedByPlayerId: Player['id'] | null;
    drawOfferedByPlayerId: Player['id'] | null;
};

export class GameRoomService {
    gameRoomIdToGameRoom: Map<ChessGameRoom['id'], ChessGameRoom> = new Map();
    gameRoomIdToPlayerOffers: Map<ChessGameRoom['id'], PlayerOffers> = new Map();

    private getGameRoomWithOffers(roomId: string): { gameRoom: ChessGameRoom; offers: PlayerOffers } | null {
        const gameRoom = this.getGameRoomById(roomId);
        const offers = this.gameRoomIdToPlayerOffers.get(roomId);
        if (!gameRoom || !offers) {
            return null;
        }
        return { gameRoom, offers };
    }

    createGameRoom({ timeControl, roomType, creator, creatorColorInput }: CreateGameRoomInput): ChessGameRoom {
        let id = generateId();
        while (this.gameRoomIdToGameRoom.has(id)) {
            id = generateId();
        }

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
            messages: [],
            gameCount: 0,
            type: roomType,
        };
        this.gameRoomIdToGameRoom.set(id, gameRoom);
        this.gameRoomIdToPlayerOffers.set(id, { rematchOfferedByPlayerId: null, drawOfferedByPlayerId: null });
        return gameRoom;
    }

    getGameRoomById(roomId: string): ChessGameRoom | null {
        return this.gameRoomIdToGameRoom.get(roomId) || null;
    }

    getOffersForGameRoom(roomId: string): PlayerOffers | null {
        return this.gameRoomIdToPlayerOffers.get(roomId) || null;
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
        gameRoom.messages = [...gameRoom.messages, message].slice(-MAX_MESSAGES_PER_ROOM);
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
            throw new GameRoomIsFullError();
        }
        gameRoom.players.push(player);
        gameRoom.playerIdToDisplayName[player.id] = player.displayName;
        gameRoom.playerIdToScore[player.id] = 0;

        const emptyColor = gameRoom.colorToPlayerId.white ? 'black' : 'white';
        gameRoom.colorToPlayerId[emptyColor] = player.id;
    }

    startNewGameInRoom(roomId: string): void {
        const gameRoomWithOffers = this.getGameRoomWithOffers(roomId);
        if (!gameRoomWithOffers) {
            throw new Error('Game room not found');
        }
        const { gameRoom, offers } = gameRoomWithOffers;
        gameRoom.gameCount += 1;
        offers.rematchOfferedByPlayerId = null;
        offers.drawOfferedByPlayerId = null;
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

    swapPlayerColors(roomId: string): void {
        const gameRoom = this.getGameRoomById(roomId);
        if (!gameRoom) {
            throw new Error('Game room not found');
        }
        const { colorToPlayerId } = gameRoom;
        const temp = colorToPlayerId.white;
        colorToPlayerId.white = colorToPlayerId.black;
        colorToPlayerId.black = temp;
    }

    offerRematch(roomId: string, playerId: string): void {
        const gameRoomOffers = this.gameRoomIdToPlayerOffers.get(roomId);
        if (!gameRoomOffers) {
            throw new Error('Game room not found');
        }
        gameRoomOffers.rematchOfferedByPlayerId = playerId;
    }

    offerDraw(roomId: string, playerId: string): void {
        const gameRoomOffers = this.gameRoomIdToPlayerOffers.get(roomId);
        if (!gameRoomOffers) {
            throw new Error('Game room not found');
        }
        gameRoomOffers.drawOfferedByPlayerId = playerId;
    }

    deleteGameRoom(roomId: string): boolean {
        const deletedFromOffers = this.gameRoomIdToPlayerOffers.delete(roomId);
        const deletedFromGameRooms = this.gameRoomIdToGameRoom.delete(roomId);
        return deletedFromOffers || deletedFromGameRooms;
    }
}
