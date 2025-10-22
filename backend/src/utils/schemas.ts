import * as z from 'zod';

export const MessageTypeEnum = z.enum(['standard', 'rematch', 'draw-offer']);
export const PieceColorEnum = z.enum(['white', 'black']);
export const RoomTypeEnum = z.enum(['self', 'player-vs-cpu', 'player-vs-player']);

export const PlayerSchema = z.object({
    id: z.string(),
    displayName: z
        .string()
        .trim()
        .regex(/^[a-z0-9 ]*$/i, 'Display name must be alphanumeric and can include spaces.')
        .max(20, 'Display name is too long. Max 20 characters'),
    isOnline: z.boolean().default(false),
});
export type Player = z.infer<typeof PlayerSchema>;

export const TimeControlSchema = z.object({
    alias: z.string(),
    minutes: z.number().int().nonnegative(),
    increment: z.number().int().nonnegative(),
    displayText: z.string(),
    mode: z.literal('fischer').optional(),
});
export type TimeControl = z.infer<typeof TimeControlSchema>;

export const MessageSchema = z.object({
    id: z.string(),
    type: MessageTypeEnum,
    createdAt: z.date(),
    authorId: PlayerSchema.shape.id,
    content: z.string().optional(),
});
export type Message = z.infer<typeof MessageSchema>;

export const GameRoomSchema = z.object({
    id: z.string(),
    type: RoomTypeEnum,
    timeControl: TimeControlSchema.nullable(),
    players: z.array(PlayerSchema),
    playerIdToDisplayName: z.record(PlayerSchema.shape.id, z.string()),
    playerIdToScore: z.record(PlayerSchema.shape.id, z.number().int().nonnegative()),
    colorToPlayerId: z.record(PieceColorEnum, PlayerSchema.shape.id.nullable()),
    messages: z.array(MessageSchema),
    gameCount: z.number().int().nonnegative(),
});
export type GameRoom = z.infer<typeof GameRoomSchema>;
