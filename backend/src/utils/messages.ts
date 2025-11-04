import { getChessOfferResponseContent, getOfferResponseTypes } from '@grouchess/game-room';
import type { ChessGameMessageType, ChessGameOfferMessage, ChessGameMessage, Player } from '@grouchess/models';

import { UnauthorizedError } from './errors.js';

export function createChessGameSystemMessageContent(
    messageType: ChessGameMessageType,
    targetDisplayName: Player['displayName']
): string {
    switch (messageType) {
        case 'draw-offer':
            return `${targetDisplayName} is offering a draw...`;
        case 'rematch-offer':
            return `${targetDisplayName} is offering a rematch...`;
        case 'player-left-room':
            return `${targetDisplayName} has left the room.`;
        case 'player-rejoined-room':
            return `${targetDisplayName} has rejoined the room.`;
        default:
            throw new Error(`Invalid system message type: ${messageType}`);
    }
}

type UpdateOfferMessageToOfferResponseArgs = {
    messages: ChessGameMessage[];
    offerType: ChessGameOfferMessage;
    offerMessageId: ChessGameMessage['id'];
    respondingPlayerId: Player['id'];
    accept: boolean;
};

type UpdateOfferMessageToOfferResponsePayload = {
    messages: ChessGameMessage[];
    responseMessage: ChessGameMessage;
};

export function updateOfferMessageToOfferResponse({
    messages,
    offerType,
    offerMessageId,
    respondingPlayerId,
    accept,
}: UpdateOfferMessageToOfferResponseArgs): UpdateOfferMessageToOfferResponsePayload {
    let responseMessage: ChessGameMessage | null = null;
    const newMessages = messages.map((message) => {
        if (message.id !== offerMessageId) return message;
        if (message.authorId === respondingPlayerId)
            throw new UnauthorizedError('Player cannot respond to their own offer');
        if (message.type !== offerType) return message;

        const responseTypes = getOfferResponseTypes(offerType);
        if (!responseTypes) {
            throw new Error('Invalid offer message type');
        }

        const newMessageType = responseTypes[accept ? 'accept' : 'decline'];
        responseMessage = {
            ...message,
            type: newMessageType,
            content: getChessOfferResponseContent(newMessageType),
        };
        return responseMessage;
    });

    if (!responseMessage) {
        throw new Error('Offer message not found or invalid');
    }

    return {
        messages: newMessages,
        responseMessage: responseMessage,
    };
}
