import { RoomTypeEnum, PieceColorEnum, PlayerSchema, TimeControlSchema } from '@grouchess/models';
import * as z from 'zod';

export const CreateGameRoomSchema = z.object({
    roomType: RoomTypeEnum,
    creator: PlayerSchema,
    creatorColorInput: PieceColorEnum.nullish(),
    timeControl: TimeControlSchema.nullable(),
});
export type CreateGameRoomInput = z.infer<typeof CreateGameRoomSchema>;
