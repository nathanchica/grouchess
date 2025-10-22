import * as z from 'zod';

import { RoomTypeEnum, PlayerSchema, PieceColorEnum, TimeControlSchema } from '../utils/schemas.js';

export const CreateGameRoomSchema = z.object({
    roomType: RoomTypeEnum,
    creator: PlayerSchema,
    creatorColorInput: PieceColorEnum.nullish(),
    timeControl: TimeControlSchema.nullable(),
});
export type CreateGameRoomInput = z.infer<typeof CreateGameRoomSchema>;
