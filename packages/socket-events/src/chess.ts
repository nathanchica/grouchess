import { BoardIndexSchema, ChessClockStateSchema, PawnPromotionEnum } from '@grouchess/chess';
import {
    ChessGameRoomSchema,
    MAX_MESSAGE_LENGTH,
    MAX_MESSAGES_PER_ROOM,
    MessageTypeEnum,
    MessageSchema,
} from '@grouchess/game-room';
import * as z from 'zod';

import { AuthenticatedPayload, ErrorEventPayload } from './common.js';

export const MovePieceInputSchema = z.object({
    fromIndex: BoardIndexSchema,
    toIndex: BoardIndexSchema,
    promotion: PawnPromotionEnum.optional(),
});
export type MovePieceInput = z.infer<typeof MovePieceInputSchema>;

export const PieceMovedPayloadSchema = MovePieceInputSchema;
export type PieceMovedPayload = z.infer<typeof PieceMovedPayloadSchema>;

export const SendMessageInputSchema = z.object({
    type: MessageTypeEnum,
    content: z.string().max(MAX_MESSAGE_LENGTH).optional(),
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

export const LoadGamePayloadSchema = z.object({
    fen: z.string(),
    gameRoom: ChessGameRoomSchema,
});
export type LoadGamePayload = z.infer<typeof LoadGamePayloadSchema>;

export const ClockUpdatePayloadSchema = z.object({
    clockState: ChessClockStateSchema.nullable(),
});
export type ClockUpdatePayload = z.infer<typeof ClockUpdatePayloadSchema>;

export const MessageHistoryPayloadSchema = z.object({
    messages: z.array(MessageSchema).max(MAX_MESSAGES_PER_ROOM),
});
export type MessageHistoryPayload = z.infer<typeof MessageHistoryPayloadSchema>;

/**
 * EVENTS INTERFACE DEFINITIONS
 */

export interface ChessServerToClientEvents {
    authenticated: (payload: AuthenticatedPayload) => void;
    error: (payload: ErrorEventPayload) => void;
    load_game: (payload: LoadGamePayload) => void;
    clock_updated: (payload: ClockUpdatePayload) => void;
    message_history: (payload: MessageHistoryPayload) => void;
    piece_moved: (payload: PieceMovedPayload) => void;
    new_message: (payload: NewMessagePayload) => void;
    user_typing: (payload: UserTypingPayload) => void;
}

export interface ChessClientToServerEvents {
    wait_for_game: () => void;
    move_piece: (input: MovePieceInput) => void;
    send_message: (input: SendMessageInput) => void;
    typing: (input: TypingEventInput) => void;
    offer_rematch: () => void;
    offer_draw: () => void;
}

export interface ChessSocketData {
    roomId: string;
    playerId: string;
}

export interface ChessInterServerEvents {
    ping: () => void;
}
