import { BoardIndexSchema, PawnPromotionEnum } from '@grouchess/chess';
import * as z from 'zod';

import { GameRoomSchema, MessageTypeEnum, MessageSchema } from '../utils/schemas.js';

export const AuthenticatedPayloadSchema = z.object({
    success: z.boolean(),
});
export type AuthenticatedPayload = z.infer<typeof AuthenticatedPayloadSchema>;

export const ErrorPayloadSchema = z.object({
    message: z.string(),
});
export type ErrorPayload = z.infer<typeof ErrorPayloadSchema>;

export const GameRoomReadyPayloadSchema = z.object({
    gameRoom: GameRoomSchema,
});
export type GameRoomReadyPayload = z.infer<typeof GameRoomReadyPayloadSchema>;

export const SendMessageInputSchema = z.object({
    type: MessageTypeEnum,
    content: z.string().max(140).optional(),
});
export type SendMessageInput = z.infer<typeof SendMessageInputSchema>;

export const NewMessagePayloadSchema = z.object({
    message: MessageSchema,
});
export type NewMessagePayload = z.infer<typeof NewMessagePayloadSchema>;

export const TypingEventInputSchema = z.object({
    isTyping: z.boolean(),
});
export type TypingEventInput = z.infer<typeof TypingEventInputSchema>;

export const UserTypingPayloadSchema = TypingEventInputSchema.extend({
    playerId: z.string(),
});
export type UserTypingPayload = z.infer<typeof UserTypingPayloadSchema>;

export const MovePieceInputSchema = z.object({
    fromIndex: BoardIndexSchema,
    toIndex: BoardIndexSchema,
    promotion: PawnPromotionEnum.optional(),
});
export type MovePieceInput = z.infer<typeof MovePieceInputSchema>;

export const PieceMovedPayloadSchema = MovePieceInputSchema;
export type PieceMovedPayload = z.infer<typeof PieceMovedPayloadSchema>;
