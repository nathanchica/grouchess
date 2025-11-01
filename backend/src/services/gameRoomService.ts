import { type ChessGameState, isDrawStatus, PieceColor } from '@grouchess/chess';
import {
    getOfferResponseTypes,
    getChessOfferResponseContent,
    isOfferMessageType,
    isOfferResponseMessageType,
    MAX_MESSAGES_PER_ROOM,
} from '@grouchess/game-room';
import type { ChessGameRoom, ChessGameOfferMessage, Message, Player } from '@grouchess/game-room';

import { CreateGameRoomInput } from './gameRoomService.schemas.js';

import { GameRoomIsFullError, UnauthorizedError } from '../utils/errors.js';
import { generateId } from '../utils/generateId.js';

const MESSAGE_ID_LENGTH = 12;
const MAX_ID_GEN_RETRIES = 10;

type ChessGameOffers = Record<ChessGameOfferMessage, Message | null>;

export class GameRoomService {
    private gameRoomIdToGameRoom: Map<ChessGameRoom['id'], ChessGameRoom> = new Map();
    private gameRoomIdToPlayerOffers: Map<ChessGameRoom['id'], ChessGameOffers> = new Map();

    private getMutableGameRoomById(roomId: string): ChessGameRoom {
        const gameRoom = this.gameRoomIdToGameRoom.get(roomId);
        if (!gameRoom) {
            throw new Error('Game room not found');
        }
        return structuredClone(gameRoom);
    }

    private getMutableOffersByRoomId(roomId: string): ChessGameOffers {
        const offers = this.gameRoomIdToPlayerOffers.get(roomId);
        if (!offers) {
            throw new Error('Game room offers not found');
        }
        return structuredClone(offers);
    }

    private createInitialChessGameOffers(): ChessGameOffers {
        return {
            'draw-offer': null,
            'rematch-offer': null,
        };
    }

    private generateUniqueMessageId(existingIds: Set<string>): string {
        let id: string;
        let attempts = 0;
        do {
            id = generateId(MESSAGE_ID_LENGTH);
            attempts++;
        } while (existingIds.has(id) && attempts < MAX_ID_GEN_RETRIES);
        if (existingIds.has(id)) {
            throw new Error('Failed to generate a unique message ID after maximum retries');
        }
        return id;
    }

    private respondToOffer(
        roomId: string,
        playerId: string,
        offerMessageType: ChessGameOfferMessage,
        accept: boolean
    ): Message {
        const gameRoom = this.getMutableGameRoomById(roomId);
        const gameRoomOffers = this.getMutableOffersByRoomId(roomId);

        const { messages } = gameRoom;
        const offerMessage = gameRoomOffers[offerMessageType];
        if (!offerMessage) {
            throw new Error('No active offer to respond to');
        }
        const { id: messageId } = offerMessage;

        let newMessage: Message | null = null;
        gameRoom.messages = messages.map((message) => {
            if (message.id !== messageId) return message;
            if (message.authorId === playerId) throw new UnauthorizedError('Player cannot respond to their own offer');
            if (message.type !== offerMessageType) return message;
            const responseType = getOfferResponseTypes(offerMessageType)[accept ? 'accept' : 'decline'];
            const offerType = offerMessageType.split('-')[0];
            const offerTypeText = offerType.charAt(0).toUpperCase() + offerType.slice(1);
            newMessage = {
                ...message,
                type: responseType,
                content: accept ? `${offerTypeText} accepted.` : `${offerTypeText} declined.`,
            };
            return newMessage;
        });

        if (!newMessage) {
            throw new Error('Failed to find and respond to the offer message');
        }

        this.gameRoomIdToGameRoom.set(roomId, gameRoom);

        gameRoomOffers[offerMessageType] = null;

        this.gameRoomIdToPlayerOffers.set(roomId, gameRoomOffers);
        return newMessage;
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
        this.gameRoomIdToPlayerOffers.set(id, this.createInitialChessGameOffers());
        return gameRoom;
    }

    getGameRoomById(roomId: string): ChessGameRoom | null {
        const gameRoom = this.gameRoomIdToGameRoom.get(roomId) || null;
        return gameRoom ? structuredClone(gameRoom) : null;
    }

    getOffersForGameRoom(roomId: string): ChessGameOffers | null {
        const offers = this.gameRoomIdToPlayerOffers.get(roomId) || null;
        return offers ? structuredClone(offers) : null;
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

    addMessageToGameRoom(
        roomId: string,
        messageType: Message['type'],
        authorId: Player['id'],
        content?: string
    ): Message {
        const gameRoom = this.getMutableGameRoomById(roomId);

        let contentValue = content;
        if (messageType === 'draw-offer') {
            contentValue = `${gameRoom.playerIdToDisplayName[authorId]} is offering a draw...`;
        } else if (messageType === 'rematch-offer') {
            contentValue = `${gameRoom.playerIdToDisplayName[authorId]} is offering a rematch...`;
        } else if (isOfferResponseMessageType(messageType)) {
            contentValue = getChessOfferResponseContent(messageType);
        } else if (messageType === 'player-left-room') {
            contentValue = `${gameRoom.playerIdToDisplayName[authorId]} has left the room.`;
        } else if (messageType === 'player-rejoined-room') {
            contentValue = `${gameRoom.playerIdToDisplayName[authorId]} has rejoined the room.`;
        }

        const existingIds = new Set(gameRoom.messages.map((msg) => msg.id));
        const message: Message = {
            id: this.generateUniqueMessageId(existingIds),
            type: messageType,
            authorId,
            content: contentValue,
            createdAt: new Date(),
        };
        gameRoom.messages = [...gameRoom.messages, message].slice(-MAX_MESSAGES_PER_ROOM);

        this.gameRoomIdToGameRoom.set(roomId, gameRoom);

        if (isOfferMessageType(messageType)) {
            const offers = this.getMutableOffersByRoomId(roomId);
            if (offers[messageType]) {
                throw new Error(`There is already an active ${messageType}`);
            }
            offers[messageType] = message;
            this.gameRoomIdToPlayerOffers.set(roomId, offers);
        }

        return message;
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
        this.gameRoomIdToPlayerOffers.set(roomId, this.createInitialChessGameOffers());
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

    declineDraw(roomId: string, playerId: string): Message {
        return this.respondToOffer(roomId, playerId, 'draw-offer', false);
    }

    acceptDraw(roomId: string, playerId: string): Message {
        return this.respondToOffer(roomId, playerId, 'draw-offer', true);
    }

    declineRematch(roomId: string, playerId: string): Message {
        return this.respondToOffer(roomId, playerId, 'rematch-offer', false);
    }

    acceptRematch(roomId: string, playerId: string): Message {
        return this.respondToOffer(roomId, playerId, 'rematch-offer', true);
    }

    deleteGameRoom(roomId: string): boolean {
        const deletedFromOffers = this.gameRoomIdToPlayerOffers.delete(roomId);
        const deletedFromGameRooms = this.gameRoomIdToGameRoom.delete(roomId);
        return deletedFromOffers || deletedFromGameRooms;
    }
}
