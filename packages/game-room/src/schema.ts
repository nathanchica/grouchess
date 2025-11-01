import { PieceColorEnum } from '@grouchess/chess';
import * as z from 'zod';

import { MessageSchema } from './messages.js';
import { PlayerSchema } from './players.js';
import { TimeControlSchema } from './timeControl.js';

export const MAX_MESSAGES_PER_ROOM = 100;

export const RoomTypeEnum = z.enum(['self', 'player-vs-cpu', 'player-vs-player']);

export type RoomType = z.infer<typeof RoomTypeEnum>;

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
