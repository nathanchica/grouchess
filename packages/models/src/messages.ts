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
export const ChessGameMessageTypeEnum = z.enum([
    ...MessageTypeEnum.options,
    'draw-offer',
    'draw-decline',
    'draw-accept',
]);
export const ChessGameOfferMessageEnum = ChessGameMessageTypeEnum.extract(['draw-offer', 'rematch-offer']);
export const ChessGameOfferResponseMessageEnum = ChessGameMessageTypeEnum.extract([
    'draw-decline',
    'draw-accept',
    'rematch-decline',
    'rematch-accept',
]);

export type MessageType = z.infer<typeof MessageTypeEnum>;
export type ChessGameMessageType = z.infer<typeof ChessGameMessageTypeEnum>;
export type ChessGameOfferMessage = z.infer<typeof ChessGameOfferMessageEnum>;
export type ChessGameOfferResponseMessage = z.infer<typeof ChessGameOfferResponseMessageEnum>;

export const MessageSchema = z.object({
    id: z.string(),
    type: MessageTypeEnum,
    createdAt: z.date(),
    authorId: PlayerSchema.shape.id,
    content: z.string().max(MAX_MESSAGE_LENGTH).optional(),
});
export type Message = z.infer<typeof MessageSchema>;

export const ChessGameMessageSchema = MessageSchema.extend({
    type: ChessGameMessageTypeEnum,
});
export type ChessGameMessage = z.infer<typeof ChessGameMessageSchema>;
