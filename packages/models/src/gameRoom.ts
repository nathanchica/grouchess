import * as z from 'zod';

import { PieceColorEnum } from './chess.js';
import { PlayerSchema } from './players.js';

export const TimeControlSchema = z.object({
    alias: z.string(),
    minutes: z.number().int().nonnegative(),
    increment: z.number().int().nonnegative(),
    displayText: z.string(),
    mode: z.literal('fischer').optional(),
});
export type TimeControl = z.infer<typeof TimeControlSchema>;

export const MAX_MESSAGES_PER_ROOM = 100;

export const RoomTypeEnum = z.enum(['self', 'player-vs-cpu', 'player-vs-player']);

export type RoomType = z.infer<typeof RoomTypeEnum>;

export const GameRoomSchema = z.object({
    id: z.string(),
    type: RoomTypeEnum,
    players: z.array(PlayerSchema),
    playerIdToDisplayName: z.record(PlayerSchema.shape.id, z.string()),
    playerIdToScore: z.record(PlayerSchema.shape.id, z.number().nonnegative()),
    gameCount: z.number().int().nonnegative(),
});
export type GameRoom = z.infer<typeof GameRoomSchema>;

export const ChessGameRoomSchema = GameRoomSchema.extend({
    timeControl: TimeControlSchema.nullable(),
    colorToPlayerId: z.record(PieceColorEnum, PlayerSchema.shape.id.nullable()),
});
export type ChessGameRoom = z.infer<typeof ChessGameRoomSchema>;
