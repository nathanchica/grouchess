import { isValidTimeControlAlias } from '@grouchess/game-room';
import {
    ChessClockStateSchema,
    ChessGameRoomSchema,
    ChessGameSchema,
    ChessGameMessageSchema,
    PieceColorEnum,
    PlayerSchema,
    RoomTypeEnum,
    TimeControlSchema,
} from '@grouchess/models';
import * as z from 'zod';

export const PlayerDisplayNameInput = PlayerSchema.shape.displayName.nullish();

export const GetChessGameResponseSchema = z.object({
    gameRoom: ChessGameRoomSchema,
    chessGame: ChessGameSchema,
    messages: z.array(
        ChessGameMessageSchema.extend({
            createdAt: z.coerce.date(),
        })
    ),
    clockState: ChessClockStateSchema.nullable(),
    playerId: PlayerSchema.shape.id,
});
export type GetChessGameResponse = z.infer<typeof GetChessGameResponseSchema>;

export const CreateGameRoomRequestSchema = z.object({
    displayName: PlayerDisplayNameInput.transform((val) => val || 'Player 1').describe(
        'The display name of the player creating the room. Defaults to "Player 1" if not provided.'
    ),
    color: PieceColorEnum.nullish().describe(
        'The preferred color for the creator. If not provided, a random color will be assigned.'
    ),
    timeControlAlias: TimeControlSchema.shape.alias
        .refine((alias) => isValidTimeControlAlias(alias), {
            message: 'Invalid time control alias',
        })
        .nullish()
        .describe(
            'The time control setting for the room. If not provided, there will be no time control (unlimited time).'
        ),
    roomType: RoomTypeEnum.describe('The type of room to create.'),
});
export type CreateGameRoomRequest = z.infer<typeof CreateGameRoomRequestSchema>;

export const JoinGameRoomRequestSchema = z.object({
    displayName: PlayerDisplayNameInput.transform((val) => val || 'Player 2').describe(
        'The display name of the player joining the room. Defaults to "Player 2" if not provided.'
    ),
});
export type JoinGameRoomRequest = z.infer<typeof JoinGameRoomRequestSchema>;

export const CreateGameRoomResponseSchema = z.object({
    roomId: ChessGameRoomSchema.shape.id,
    playerId: PlayerSchema.shape.id,
    token: z.string(),
});
export type CreateGameRoomResponse = z.infer<typeof CreateGameRoomResponseSchema>;

// Currently identical to CreateGameRoomResponseSchema
export const JoinGameRoomResponseSchema = CreateGameRoomResponseSchema;
export type JoinGameRoomResponse = z.infer<typeof JoinGameRoomResponseSchema>;
