import * as z from 'zod';

import { PlayerSchema } from './players.js';

export const MAX_MESSAGE_LENGTH = 140;

export const MessageTypeEnum = z.enum([
    'standard',
    'rematch-offer',
    'player-left-room',
    'player-rejoined-room',
    'rematch-accept',
    'rematch-decline',
]);
export const ChessGameMessageEnum = z.enum([...MessageTypeEnum.options, 'draw-offer', 'draw-decline', 'draw-accept']);
export const ChessGameOfferMessageEnum = ChessGameMessageEnum.extract(['draw-offer', 'rematch-offer']);
export const ChessGameOfferResponseMessageEnum = ChessGameMessageEnum.extract([
    'draw-decline',
    'draw-accept',
    'rematch-decline',
    'rematch-accept',
]);

export type MessageType = z.infer<typeof MessageTypeEnum>;
export type ChessGameMessageType = z.infer<typeof ChessGameMessageEnum>;
export type ChessGameOfferMessage = z.infer<typeof ChessGameOfferMessageEnum>;
export type ChessGameOfferResponseMessage = z.infer<typeof ChessGameOfferResponseMessageEnum>;

export const MessageSchema = z.object({
    id: z.string(),
    type: z.union([MessageTypeEnum, ChessGameMessageEnum]),
    createdAt: z.date(),
    authorId: PlayerSchema.shape.id,
    content: z.string().max(MAX_MESSAGE_LENGTH).optional(),
});
export type Message = z.infer<typeof MessageSchema>;

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
