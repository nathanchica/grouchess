import { PieceColorEnum } from '@grouchess/chess';
import { RoomTypeEnum, PlayerSchema, TimeControlSchema } from '@grouchess/game-room';
import * as z from 'zod';

export const CreateGameRoomSchema = z.object({
    roomType: RoomTypeEnum,
    creator: PlayerSchema,
    creatorColorInput: PieceColorEnum.nullish(),
    timeControl: TimeControlSchema.nullable(),
});
export type CreateGameRoomInput = z.infer<typeof CreateGameRoomSchema>;
