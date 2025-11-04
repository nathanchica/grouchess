import { isOfferMessageType, isOfferResponseMessageType } from '@grouchess/game-room';
import { MAX_MESSAGES_PER_ROOM } from '@grouchess/models';
import type { ChessGameRoom, ChessGameOfferMessage, ChessGameMessage, Player } from '@grouchess/models';

import { generateUniqueMessageId } from '../utils/generateId.js';
import { createChessGameSystemMessageContent, updateOfferMessageToOfferResponse } from '../utils/messages.js';

const MESSAGE_ID_LENGTH = 12;
const MAX_ID_GEN_RETRIES = 10;

type ChessGameOffers = Record<ChessGameOfferMessage, ChessGameMessage | null>;

export class MessageService {
    private roomIdToMessages: Map<ChessGameRoom['id'], ChessGameMessage[]> = new Map();
    private roomIdToOffers: Map<ChessGameRoom['id'], ChessGameOffers> = new Map();

    private getMutableMessagesForRoom(roomId: string): ChessGameMessage[] {
        const messages = this.roomIdToMessages.get(roomId);
        if (!messages) {
            throw new Error('Messages not found for room');
        }
        return structuredClone(messages);
    }

    private getMutableOffersForRoom(roomId: string): ChessGameOffers {
        const offers = this.roomIdToOffers.get(roomId);
        // Defensive check, should never happen since we always initialize offers when creating a room
        /* v8 ignore next -- @preserve */
        if (!offers) {
            throw new Error('Offers not found for room');
        }
        return structuredClone(offers);
    }

    private createInitialOffers(): ChessGameOffers {
        return {
            'draw-offer': null,
            'rematch-offer': null,
        };
    }

    private createMessageId(roomId: ChessGameRoom['id']): ChessGameMessage['id'] {
        const messages = this.getMutableMessagesForRoom(roomId);
        const existingIds = new Set(messages.map((msg) => msg.id));
        return generateUniqueMessageId(existingIds, { length: MESSAGE_ID_LENGTH, maxAttempts: MAX_ID_GEN_RETRIES });
    }

    private respondToOffer(
        roomId: string,
        playerId: string,
        offerMessageType: ChessGameOfferMessage,
        accept: boolean
    ): ChessGameMessage {
        const messages = this.getMutableMessagesForRoom(roomId);
        const offers = this.getMutableOffersForRoom(roomId);

        const offerMessage = offers[offerMessageType];
        if (!offerMessage) {
            throw new Error('No active offer to respond to');
        }
        const { id: messageId } = offerMessage;

        const { messages: updatedMessages, responseMessage } = updateOfferMessageToOfferResponse({
            messages,
            offerType: offerMessageType,
            offerMessageId: messageId,
            respondingPlayerId: playerId,
            accept,
        });

        this.roomIdToMessages.set(roomId, updatedMessages);

        offers[offerMessageType] = null;
        this.roomIdToOffers.set(roomId, offers);

        return responseMessage;
    }

    /**
     * Initialize message storage for a new room
     */
    initializeRoom(roomId: string): void {
        this.roomIdToMessages.set(roomId, []);
        this.roomIdToOffers.set(roomId, this.createInitialOffers());
    }

    /**
     * Get all messages for a room
     */
    getMessagesForRoom(roomId: string): ChessGameMessage[] {
        const messages = this.roomIdToMessages.get(roomId);
        if (!messages) {
            throw new Error('Messages not found for room');
        }
        return structuredClone(messages);
    }

    /**
     * Add a message to a room
     */
    addMessageToRoom(
        roomId: string,
        messageType: ChessGameMessage['type'],
        authorId: Player['id'],
        playerDisplayName: Player['displayName'],
        content?: string
    ): ChessGameMessage {
        const messages = this.getMutableMessagesForRoom(roomId);

        if (isOfferResponseMessageType(messageType)) {
            throw new Error('Cannot directly add an offer response message. Must use respondToOffer method.');
        }

        const contentValue =
            messageType === 'standard' ? content : createChessGameSystemMessageContent(messageType, playerDisplayName);

        const message: ChessGameMessage = {
            id: this.createMessageId(roomId),
            type: messageType,
            authorId,
            content: contentValue,
            createdAt: new Date(),
        };
        const updatedMessages = [...messages, message].slice(-MAX_MESSAGES_PER_ROOM);

        this.roomIdToMessages.set(roomId, updatedMessages);

        if (isOfferMessageType(messageType)) {
            const offers = this.getMutableOffersForRoom(roomId);
            if (offers[messageType]) {
                throw new Error(`There is already an active ${messageType}`);
            }
            offers[messageType] = message;
            this.roomIdToOffers.set(roomId, offers);
        }

        return message;
    }

    /**
     * Delete all messages for a room
     */
    deleteMessagesForRoom(roomId: string): boolean {
        const deletedMessages = this.roomIdToMessages.delete(roomId);
        const deletedOffers = this.roomIdToOffers.delete(roomId);
        return deletedMessages || deletedOffers;
    }

    /**
     * Get active offers for a room
     */
    getActiveOffers(roomId: string): ChessGameOffers {
        const offers = this.roomIdToOffers.get(roomId);
        if (!offers) {
            throw new Error('Offers not found for room');
        }
        return structuredClone(offers);
    }

    /**
     * Check if there's an active offer of a specific type
     */
    hasActiveOffer(roomId: string, offerType: ChessGameOfferMessage): boolean {
        const offers = this.getMutableOffersForRoom(roomId);
        return offers[offerType] !== null;
    }

    /**
     * Clear offers for a room (used when starting a new game)
     */
    clearOffersForRoom(roomId: string): void {
        this.roomIdToOffers.set(roomId, this.createInitialOffers());
    }

    /**
     * Accept a draw offer
     */
    acceptDraw(roomId: string, playerId: string): ChessGameMessage {
        return this.respondToOffer(roomId, playerId, 'draw-offer', true);
    }

    /**
     * Decline a draw offer
     */
    declineDraw(roomId: string, playerId: string): ChessGameMessage {
        return this.respondToOffer(roomId, playerId, 'draw-offer', false);
    }

    /**
     * Accept a rematch offer
     */
    acceptRematch(roomId: string, playerId: string): ChessGameMessage {
        return this.respondToOffer(roomId, playerId, 'rematch-offer', true);
    }

    /**
     * Decline a rematch offer
     */
    declineRematch(roomId: string, playerId: string): ChessGameMessage {
        return this.respondToOffer(roomId, playerId, 'rematch-offer', false);
    }
}
