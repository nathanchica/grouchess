import { type ChessGameOfferResponseMessage, type ChessGameOfferMessage } from '@grouchess/models';

type OfferResponses = {
    accept: ChessGameOfferResponseMessage;
    decline: ChessGameOfferResponseMessage;
};
const OFFER_MESSAGE_TYPE_TO_RESPONSES: Record<ChessGameOfferMessage, OfferResponses> = {
    'draw-offer': { accept: 'draw-accept', decline: 'draw-decline' },
    'rematch-offer': { accept: 'rematch-accept', decline: 'rematch-decline' },
};

export function getOfferResponseTypes(offerType: ChessGameOfferMessage): OfferResponses | undefined {
    return OFFER_MESSAGE_TYPE_TO_RESPONSES[offerType];
}

export function isOfferMessageType(type: string): type is ChessGameOfferMessage {
    return Object.hasOwn(OFFER_MESSAGE_TYPE_TO_RESPONSES, type);
}

export function isOfferResponseMessageType(type: string): type is ChessGameOfferResponseMessage {
    return Object.values(OFFER_MESSAGE_TYPE_TO_RESPONSES).some(
        (responses) => responses.accept === type || responses.decline === type
    );
}

const CHESS_OFFER_RESPONSE_TO_CONTENT: Record<ChessGameOfferResponseMessage, string> = {
    'draw-accept': 'Draw accepted.',
    'draw-decline': 'Draw declined.',
    'rematch-accept': 'Rematch accepted.',
    'rematch-decline': 'Rematch declined.',
};

export function getChessOfferResponseContent(type: ChessGameOfferResponseMessage): string {
    return CHESS_OFFER_RESPONSE_TO_CONTENT[type];
}
