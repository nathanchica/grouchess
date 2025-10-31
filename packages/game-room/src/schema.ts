import { PieceColorEnum } from '@grouchess/chess';
import * as z from 'zod';

import { TimeControlSchema } from './timeControl.js';

export const MAX_MESSAGES_PER_ROOM = 100;
export const MAX_MESSAGE_LENGTH = 140;
export const MAX_PLAYER_DISPLAY_NAME_LENGTH = 20;

export const MessageTypeEnum = z.enum(['standard', 'rematch', 'draw-offer', 'draw-decline', 'draw-accept']);
export const PlayerStatusEnum = z.enum(['online', 'offline', 'away']);
export const RoomTypeEnum = z.enum(['self', 'player-vs-cpu', 'player-vs-player']);

export type MessageType = z.infer<typeof MessageTypeEnum>;
export type PlayerStatus = z.infer<typeof PlayerStatusEnum>;
export type RoomType = z.infer<typeof RoomTypeEnum>;

export const PlayerSchema = z.object({
    id: z.string(),
    displayName: z
        .string()
        .trim()
        .regex(/^[a-z0-9 ]*$/i, 'Display name must be alphanumeric and can include spaces.')
        .max(
            MAX_PLAYER_DISPLAY_NAME_LENGTH,
            `Display name is too long. Max ${MAX_PLAYER_DISPLAY_NAME_LENGTH} characters`
        ),
});
export type Player = z.infer<typeof PlayerSchema>;

export const MessageSchema = z.object({
    id: z.string(),
    type: MessageTypeEnum,
    createdAt: z.date(),
    authorId: PlayerSchema.shape.id,
    content: z.string().max(MAX_MESSAGE_LENGTH).optional(),
});
export type Message = z.infer<typeof MessageSchema>;

export const GameRoomSchema = z.object({
    id: z.string(),
    type: RoomTypeEnum,
    players: z.array(PlayerSchema),
    playerIdToDisplayName: z.record(PlayerSchema.shape.id, z.string()),
    playerIdToScore: z.record(PlayerSchema.shape.id, z.number().nonnegative()),
    messages: z.array(MessageSchema).max(MAX_MESSAGES_PER_ROOM),
    gameCount: z.number().int().nonnegative(),
});
export type GameRoom = z.infer<typeof GameRoomSchema>;

export const ChessGameRoomSchema = GameRoomSchema.extend({
    timeControl: TimeControlSchema.nullable(),
    colorToPlayerId: z.record(PieceColorEnum, PlayerSchema.shape.id.nullable()),
});
export type ChessGameRoom = z.infer<typeof ChessGameRoomSchema>;
