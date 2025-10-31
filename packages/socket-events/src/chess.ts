import {
    BoardIndexSchema,
    ChessClockStateSchema,
    ChessGameStatusEnum,
    PawnPromotionEnum,
    PieceColorEnum,
} from '@grouchess/chess';
import { ChessGameRoomSchema, MAX_MESSAGE_LENGTH, MessageTypeEnum, MessageSchema } from '@grouchess/game-room';
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

// Coerce Date fields coming over the wire as ISO strings
const SocketMessageSchema = MessageSchema.extend({
    createdAt: z.coerce.date(),
});

export const NewMessagePayloadSchema = z.object({
    message: SocketMessageSchema,
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

export const ClockUpdatePayloadSchema = z.object({
    clockState: ChessClockStateSchema.nullable(),
});
export type ClockUpdatePayload = z.infer<typeof ClockUpdatePayloadSchema>;

export const GameEndedPayloadSchema = z.object({
    reason: ChessGameStatusEnum,
    winner: PieceColorEnum.optional(),
    updatedScores: ChessGameRoomSchema.shape.playerIdToScore,
});
export type GameEndedPayload = z.infer<typeof GameEndedPayloadSchema>;

export const DrawDeclinedPayloadSchema = z.object({
    message: SocketMessageSchema,
});
export type DrawDeclinedPayload = z.infer<typeof DrawDeclinedPayloadSchema>;

export const DrawAcceptedPayloadSchema = z.object({
    message: SocketMessageSchema,
});
export type DrawAcceptedPayload = z.infer<typeof DrawAcceptedPayloadSchema>;

/**
 * EVENTS INTERFACE DEFINITIONS
 */

export interface ChessServerToClientEvents {
    authenticated: (payload: AuthenticatedPayload) => void;
    error: (payload: ErrorEventPayload) => void;
    game_room_ready: () => void;
    clock_update: (payload: ClockUpdatePayload) => void;
    piece_moved: (payload: PieceMovedPayload) => void;
    new_message: (payload: NewMessagePayload) => void;
    user_typing: (payload: UserTypingPayload) => void;
    draw_declined: (payload: DrawDeclinedPayload) => void;
    draw_accepted: (payload: DrawAcceptedPayload) => void;
    game_ended: (payload: GameEndedPayload) => void;
}

export interface ChessClientToServerEvents {
    wait_for_game: () => void;
    move_piece: (input: MovePieceInput) => void;
    send_message: (input: SendMessageInput) => void;
    typing: (input: TypingEventInput) => void;
    offer_rematch: () => void;
    offer_draw: () => void;
    decline_draw: () => void;
    accept_draw: () => void;
    resign: () => void;
}

export interface ChessSocketData {
    roomId: string;
    playerId: string;
}

export interface ChessInterServerEvents {
    ping: () => void;
}
